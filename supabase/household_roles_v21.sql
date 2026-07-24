-- Harimaro Memories v2.1
-- 編集メンバー / 閲覧専用メンバー / 非公開メンバー一覧

-- role制約を owner/editor/viewer に更新
alter table public.household_members
drop constraint if exists household_members_role_check;

alter table public.household_members
add constraint household_members_role_check
check (role in ('owner', 'editor', 'viewer'));

-- 旧memberをeditorへ移行
update public.household_members
set role = 'editor'
where role = 'member';

-- 招待にroleを保持
alter table public.household_invites
add column if not exists invited_role text not null default 'editor';

alter table public.household_invites
drop constraint if exists household_invites_invited_role_check;

alter table public.household_invites
add constraint household_invites_invited_role_check
check (invited_role in ('editor', 'viewer'));

create or replace function public.is_household_editor(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

grant execute on function public.is_household_editor(uuid) to authenticated;

create or replace function public.create_household_invite(
  invite_role_input text default 'editor'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  household_id_value uuid;
  invite_code text;
  expiry timestamptz;
  normalized_role text;
  attempt_count integer := 0;
begin
  normalized_role := lower(trim(invite_role_input));

  if normalized_role not in ('editor', 'viewer') then
    raise exception '招待権限が不正です';
  end if;

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
      raise exception '招待コードの生成に失敗しました';
    end if;
  end loop;

  expiry := now() + interval '24 hours';

  insert into public.household_invites (
    household_id,
    code,
    created_by,
    expires_at,
    invited_role
  )
  values (
    household_id_value,
    invite_code,
    auth.uid(),
    expiry,
    normalized_role
  );

  return jsonb_build_object(
    'invite_code', invite_code,
    'expires_at', expiry,
    'invited_role', normalized_role
  );
end;
$$;

grant execute on function public.create_household_invite(text) to authenticated;

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
    set used_by = auth.uid(), used_at = now()
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

  if current_member.household_id is not null then
    delete from public.household_members
    where user_id = auth.uid();

    delete from public.households
    where id = current_member.household_id
      and owner_user_id = auth.uid()
      and not exists (
        select 1 from public.household_members
        where household_id = current_member.household_id
      )
      and not exists (
        select 1 from public.hedgehog_records
        where household_id = current_member.household_id
      )
      and not exists (
        select 1 from public.harimaro_memory_posts
        where household_id = current_member.household_id
      )
      and not exists (
        select 1 from public.harimaro_events
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
    invite_row.invited_role,
    coalesce(current_member.display_name, 'メンバー')
  );

  update public.household_invites
  set used_by = auth.uid(), used_at = now()
  where id = invite_row.id;

  return public.ensure_default_household();
end;
$$;

grant execute on function public.join_household_by_code(text) to authenticated;

-- メンバー一覧:
-- オーナーは全員
-- editor/viewerはオーナーと自分だけ
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
  with my_membership as (
    select household_id, role
    from public.household_members
    where user_id = auth.uid()
    limit 1
  )
  select
    member.user_id,
    member.display_name,
    member.role,
    member.joined_at,
    member.user_id = auth.uid() as is_me
  from public.household_members member
  cross join my_membership mine
  where member.household_id = mine.household_id
    and (
      mine.role = 'owner'
      or member.role = 'owner'
      or member.user_id = auth.uid()
    )
  order by
    case when member.role = 'owner' then 0 else 1 end,
    member.joined_at asc;
$$;

grant execute on function public.get_my_household_members() to authenticated;

create or replace function public.change_household_member_role(
  target_user_id uuid,
  new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_household uuid;
  normalized_role text;
begin
  normalized_role := lower(trim(new_role));

  if normalized_role not in ('editor', 'viewer') then
    raise exception '権限が不正です';
  end if;

  select household_id
  into my_household
  from public.household_members
  where user_id = auth.uid()
    and role = 'owner'
  limit 1;

  if my_household is null then
    raise exception '権限を変更できるのはオーナーだけです';
  end if;

  update public.household_members
  set role = normalized_role
  where household_id = my_household
    and user_id = target_user_id
    and role <> 'owner';

  return public.ensure_default_household();
end;
$$;

grant execute on function public.change_household_member_role(uuid, text)
to authenticated;

create or replace function public.remove_household_member(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_household uuid;
begin
  select household_id
  into my_household
  from public.household_members
  where user_id = auth.uid()
    and role = 'owner'
  limit 1;

  if my_household is null then
    raise exception 'メンバーを削除できるのはオーナーだけです';
  end if;

  delete from public.household_members
  where household_id = my_household
    and user_id = target_user_id
    and role <> 'owner';

  return public.ensure_default_household();
end;
$$;

grant execute on function public.remove_household_member(uuid)
to authenticated;

-- 既存の書き込みポリシーをeditor以上へ変更
drop policy if exists "household records insert" on public.hedgehog_records;
drop policy if exists "household records update" on public.hedgehog_records;
drop policy if exists "household records delete" on public.hedgehog_records;

create policy "household records insert"
on public.hedgehog_records for insert to authenticated
with check (
  public.is_household_editor(household_id)
  and created_by = auth.uid()
);

create policy "household records update"
on public.hedgehog_records for update to authenticated
using (public.is_household_editor(household_id))
with check (public.is_household_editor(household_id));

create policy "household records delete"
on public.hedgehog_records for delete to authenticated
using (public.is_household_editor(household_id));

drop policy if exists "household memory posts insert" on public.harimaro_memory_posts;
drop policy if exists "household memory posts update" on public.harimaro_memory_posts;
drop policy if exists "household memory posts delete" on public.harimaro_memory_posts;

create policy "household memory posts insert"
on public.harimaro_memory_posts for insert to authenticated
with check (
  public.is_household_editor(household_id)
  and created_by = auth.uid()
);

create policy "household memory posts update"
on public.harimaro_memory_posts for update to authenticated
using (public.is_household_editor(household_id))
with check (public.is_household_editor(household_id));

create policy "household memory posts delete"
on public.harimaro_memory_posts for delete to authenticated
using (public.is_household_editor(household_id));

drop policy if exists "household events insert" on public.harimaro_events;
drop policy if exists "household events update" on public.harimaro_events;
drop policy if exists "household events delete" on public.harimaro_events;

create policy "household events insert"
on public.harimaro_events for insert to authenticated
with check (
  public.is_household_editor(household_id)
  and created_by = auth.uid()
);

create policy "household events update"
on public.harimaro_events for update to authenticated
using (public.is_household_editor(household_id))
with check (public.is_household_editor(household_id));

create policy "household events delete"
on public.harimaro_events for delete to authenticated
using (public.is_household_editor(household_id));

-- 子写真テーブルもeditor以上のみ書き込み
drop policy if exists "household memory photos insert" on public.harimaro_memory_photos;
drop policy if exists "household memory photos update" on public.harimaro_memory_photos;
drop policy if exists "household memory photos delete" on public.harimaro_memory_photos;

create policy "household memory photos insert"
on public.harimaro_memory_photos for insert to authenticated
with check (
  exists (
    select 1 from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_editor(post.household_id)
  )
);

create policy "household memory photos update"
on public.harimaro_memory_photos for update to authenticated
using (
  exists (
    select 1 from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_editor(post.household_id)
  )
)
with check (
  exists (
    select 1 from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_editor(post.household_id)
  )
);

create policy "household memory photos delete"
on public.harimaro_memory_photos for delete to authenticated
using (
  exists (
    select 1 from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_editor(post.household_id)
  )
);

drop policy if exists "household event photos insert" on public.harimaro_event_photos;
drop policy if exists "household event photos update" on public.harimaro_event_photos;
drop policy if exists "household event photos delete" on public.harimaro_event_photos;

create policy "household event photos insert"
on public.harimaro_event_photos for insert to authenticated
with check (
  exists (
    select 1 from public.harimaro_events event
    where event.id = event_id
      and public.is_household_editor(event.household_id)
  )
);

create policy "household event photos update"
on public.harimaro_event_photos for update to authenticated
using (
  exists (
    select 1 from public.harimaro_events event
    where event.id = event_id
      and public.is_household_editor(event.household_id)
  )
)
with check (
  exists (
    select 1 from public.harimaro_events event
    where event.id = event_id
      and public.is_household_editor(event.household_id)
  )
);

create policy "household event photos delete"
on public.harimaro_event_photos for delete to authenticated
using (
  exists (
    select 1 from public.harimaro_events event
    where event.id = event_id
      and public.is_household_editor(event.household_id)
  )
);
