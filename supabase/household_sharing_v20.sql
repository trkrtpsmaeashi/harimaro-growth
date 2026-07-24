-- Harimaro Memories v2.0
-- v1.7を実行済みでも、そのまま全文Runできます。

create extension if not exists pgcrypto;

-- 招待コード生成を、gen_random_bytes()に依存しない方式へ差し替え
create or replace function public.create_household_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  household_id_value uuid;
  invite_code text;
  expiry timestamptz;
  attempt_count integer := 0;
begin
  select household_id
  into household_id_value
  from public.household_members
  where user_id = auth.uid()
    and role = 'owner'
  limit 1;

  if household_id_value is null then
    raise exception '招待コードを発行できるのはオーナーだけです';
  end if;

  loop
    attempt_count := attempt_count + 1;

    -- PostgreSQL標準関数を組み合わせた6文字コード
    invite_code := upper(
      substr(
        md5(
          random()::text ||
          clock_timestamp()::text ||
          auth.uid()::text ||
          attempt_count::text
        ),
        1,
        6
      )
    );

    exit when not exists (
      select 1
      from public.household_invites
      where code = invite_code
        and used_at is null
        and expires_at > now()
    );

    if attempt_count >= 20 then
      raise exception '招待コードの生成に失敗しました。もう一度お試しください';
    end if;
  end loop;

  expiry := now() + interval '24 hours';

  -- 同じオーナーの期限切れ・未使用招待を掃除
  delete from public.household_invites
  where created_by = auth.uid()
    and used_at is null
    and expires_at <= now();

  insert into public.household_invites (
    household_id,
    code,
    created_by,
    expires_at
  )
  values (
    household_id_value,
    invite_code,
    auth.uid(),
    expiry
  );

  return jsonb_build_object(
    'invite_code', invite_code,
    'expires_at', expiry
  );
end;
$$;

grant execute on function public.create_household_invite() to authenticated;

-- 同じグループの参加者一覧
create or replace function public.get_my_household_members()
returns table (
  user_id uuid,
  display_name text,
  role text,
  joined_at timestamptz,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    member.user_id,
    member.display_name,
    member.role,
    member.joined_at,
    member.user_id = auth.uid() as is_me
  from public.household_members member
  where member.household_id = (
    select own_member.household_id
    from public.household_members own_member
    where own_member.user_id = auth.uid()
    limit 1
  )
  order by
    case when member.role = 'owner' then 0 else 1 end,
    member.joined_at asc;
$$;

grant execute on function public.get_my_household_members() to authenticated;

-- 参加処理も再定義して、1人1グループ制約に確実に対応
create or replace function public.join_household_by_code(invite_code_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.household_invites%rowtype;
  current_member public.household_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  select *
  into invite_row
  from public.household_invites
  where code = upper(trim(invite_code_input))
    and used_at is null
    and expires_at > now()
  for update
  limit 1;

  if invite_row.id is null then
    raise exception '招待コードが無効か、有効期限が切れています';
  end if;

  select *
  into current_member
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if current_member.household_id = invite_row.household_id then
    update public.household_invites
    set used_by = auth.uid(),
        used_at = now()
    where id = invite_row.id;

    return public.ensure_default_household();
  end if;

  if current_member.role = 'owner' and exists (
    select 1
    from public.household_members
    where household_id = current_member.household_id
      and user_id <> auth.uid()
  ) then
    raise exception '他のメンバーが参加中のグループからは移動できません';
  end if;

  -- 新規参加者の空の個人グループだけ削除
  if current_member.household_id is not null then
    delete from public.household_members
    where user_id = auth.uid();

    delete from public.households
    where id = current_member.household_id
      and owner_user_id = auth.uid()
      and not exists (
        select 1
        from public.household_members
        where household_id = current_member.household_id
      )
      and not exists (
        select 1
        from public.hedgehog_records
        where household_id = current_member.household_id
      )
      and not exists (
        select 1
        from public.harimaro_memory_posts
        where household_id = current_member.household_id
      )
      and not exists (
        select 1
        from public.harimaro_events
        where household_id = current_member.household_id
      );
  end if;

  insert into public.household_members (
    household_id,
    user_id,
    role,
    display_name
  )
  values (
    invite_row.household_id,
    auth.uid(),
    'member',
    coalesce(current_member.display_name, 'メンバー')
  );

  update public.household_invites
  set used_by = auth.uid(),
      used_at = now()
  where id = invite_row.id;

  return public.ensure_default_household();
end;
$$;

grant execute on function public.join_household_by_code(text) to authenticated;
