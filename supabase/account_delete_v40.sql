-- Harimaro Memories v4.0
-- 自分のアカウントを完全に削除するRPC

create or replace function public.delete_my_harimaro_account(
  confirmation_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  membership public.household_members%rowtype;
  household_member_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  if confirmation_text <> '削除' then
    raise exception '確認文字が正しくありません';
  end if;

  select *
  into membership
  from public.household_members
  where user_id = current_user_id
  limit 1;

  if membership.household_id is not null then
    select count(*)
    into household_member_count
    from public.household_members
    where household_id = membership.household_id;

    if membership.role = 'owner' and household_member_count > 1 then
      raise exception '他のメンバーが参加しているため、オーナーのアカウントは削除できません';
    end if;

    if membership.role <> 'owner' then
      delete from public.household_members
      where user_id = current_user_id;
    end if;
  end if;

  -- auth.users削除時:
  -- owner_user_idはON DELETE CASCADEなので、1人だけの個人グループと関連データも削除
  -- created_by/checked_by等はON DELETE SET NULLなので、共有投稿はグループに残る
  delete from auth.users
  where id = current_user_id;

  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function public.delete_my_harimaro_account(text) from public;
grant execute on function public.delete_my_harimaro_account(text) to authenticated;
