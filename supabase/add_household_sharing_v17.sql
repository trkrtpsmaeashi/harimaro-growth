create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'はりまろのおうち',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create unique index if not exists household_members_one_household_per_user
on public.household_members(user_id);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create or replace function public.is_household_member(target_household_id uuid)
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
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
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
      and role = 'owner'
  );
$$;

drop policy if exists "members view household" on public.households;
create policy "members view household"
on public.households for select to authenticated
using (public.is_household_member(id));

drop policy if exists "members view members" on public.household_members;
create policy "members view members"
on public.household_members for select to authenticated
using (public.is_household_member(household_id));

drop policy if exists "owners view invites" on public.household_invites;
create policy "owners view invites"
on public.household_invites for select to authenticated
using (public.is_household_owner(household_id));

-- Existing data tables: add shared household fields
alter table public.hedgehog_records
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.harimaro_memory_posts
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.harimaro_events
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists hedgehog_records_household_idx
on public.hedgehog_records(household_id);

create index if not exists memory_posts_household_idx
on public.harimaro_memory_posts(household_id);

create index if not exists events_household_idx
on public.harimaro_events(household_id);

-- Create a default household for every existing user represented in data
do $$
declare
  user_row record;
  new_household_id uuid;
begin
  for user_row in
    select distinct user_id
    from (
      select user_id from public.hedgehog_records where user_id is not null
      union
      select user_id from public.harimaro_memory_posts where user_id is not null
      union
      select user_id from public.harimaro_events where user_id is not null
    ) users
  loop
    select household_id
      into new_household_id
    from public.household_members
    where user_id = user_row.user_id
    limit 1;

    if new_household_id is null then
      insert into public.households (owner_user_id)
      values (user_row.user_id)
      returning id into new_household_id;

      insert into public.household_members (
        household_id,
        user_id,
        role,
        display_name
      )
      values (
        new_household_id,
        user_row.user_id,
        'owner',
        'オーナー'
      );
    end if;

    update public.hedgehog_records
    set household_id = new_household_id,
        created_by = coalesce(created_by, user_id)
    where user_id = user_row.user_id
      and household_id is null;

    update public.harimaro_memory_posts
    set household_id = new_household_id,
        created_by = coalesce(created_by, user_id)
    where user_id = user_row.user_id
      and household_id is null;

    update public.harimaro_events
    set household_id = new_household_id,
        created_by = coalesce(created_by, user_id)
    where user_id = user_row.user_id
      and household_id is null;
  end loop;
end $$;

create or replace function public.ensure_default_household()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.household_members%rowtype;
  household_row public.households%rowtype;
  member_total integer;
begin
  select *
  into member_row
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if member_row.household_id is null then
    insert into public.households (owner_user_id)
    values (auth.uid())
    returning * into household_row;

    insert into public.household_members (
      household_id,
      user_id,
      role,
      display_name
    )
    values (
      household_row.id,
      auth.uid(),
      'owner',
      'オーナー'
    )
    returning * into member_row;
  else
    select *
    into household_row
    from public.households
    where id = member_row.household_id;
  end if;

  select count(*)
  into member_total
  from public.household_members
  where household_id = household_row.id;

  return jsonb_build_object(
    'household_id', household_row.id,
    'household_name', household_row.name,
    'my_role', member_row.role,
    'my_display_name', member_row.display_name,
    'member_count', member_total
  );
end;
$$;

create or replace function public.get_my_household_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.ensure_default_household();
end;
$$;

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
    invite_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.household_invites where code = invite_code
    );
  end loop;

  expiry := now() + interval '24 hours';

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

create or replace function public.join_household_by_code(invite_code_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.household_invites%rowtype;
  old_household_id uuid;
  old_role text;
begin
  select *
  into invite_row
  from public.household_invites
  where code = upper(trim(invite_code_input))
    and used_at is null
    and expires_at > now()
  limit 1;

  if invite_row.id is null then
    raise exception '招待コードが無効か、有効期限が切れています';
  end if;

  select household_id, role
  into old_household_id, old_role
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if old_role = 'owner' and exists (
    select 1
    from public.household_members
    where household_id = old_household_id
      and user_id <> auth.uid()
  ) then
    raise exception '他のメンバーがいる共有グループのオーナーは移動できません';
  end if;

  if old_household_id is not null and old_household_id <> invite_row.household_id then
    delete from public.household_members
    where user_id = auth.uid();

    delete from public.households
    where id = old_household_id
      and owner_user_id = auth.uid()
      and not exists (
        select 1
        from public.household_members
        where household_id = old_household_id
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
    'メンバー'
  )
  on conflict (household_id, user_id) do nothing;

  update public.household_invites
  set used_by = auth.uid(),
      used_at = now()
  where id = invite_row.id;

  return public.ensure_default_household();
end;
$$;

create or replace function public.update_household_display_name(display_name_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.household_members
  set display_name = nullif(trim(display_name_input), '')
  where user_id = auth.uid();

  return public.ensure_default_household();
end;
$$;

grant execute on function public.ensure_default_household() to authenticated;
grant execute on function public.get_my_household_summary() to authenticated;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.join_household_by_code(text) to authenticated;
grant execute on function public.update_household_display_name(text) to authenticated;

-- Replace old per-user RLS with shared-household policies
drop policy if exists "own records select" on public.hedgehog_records;
drop policy if exists "own records insert" on public.hedgehog_records;
drop policy if exists "own records update" on public.hedgehog_records;
drop policy if exists "own records delete" on public.hedgehog_records;

create policy "household records select"
on public.hedgehog_records for select to authenticated
using (public.is_household_member(household_id));

create policy "household records insert"
on public.hedgehog_records for insert to authenticated
with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
);

create policy "household records update"
on public.hedgehog_records for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "household records delete"
on public.hedgehog_records for delete to authenticated
using (public.is_household_member(household_id));

drop policy if exists "own memory posts select" on public.harimaro_memory_posts;
drop policy if exists "own memory posts insert" on public.harimaro_memory_posts;
drop policy if exists "own memory posts update" on public.harimaro_memory_posts;
drop policy if exists "own memory posts delete" on public.harimaro_memory_posts;

create policy "household memory posts select"
on public.harimaro_memory_posts for select to authenticated
using (public.is_household_member(household_id));

create policy "household memory posts insert"
on public.harimaro_memory_posts for insert to authenticated
with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
);

create policy "household memory posts update"
on public.harimaro_memory_posts for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "household memory posts delete"
on public.harimaro_memory_posts for delete to authenticated
using (public.is_household_member(household_id));

drop policy if exists "own events select" on public.harimaro_events;
drop policy if exists "own events insert" on public.harimaro_events;
drop policy if exists "own events update" on public.harimaro_events;
drop policy if exists "own events delete" on public.harimaro_events;

create policy "household events select"
on public.harimaro_events for select to authenticated
using (public.is_household_member(household_id));

create policy "household events insert"
on public.harimaro_events for insert to authenticated
with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
);

create policy "household events update"
on public.harimaro_events for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "household events delete"
on public.harimaro_events for delete to authenticated
using (public.is_household_member(household_id));

-- Child photo tables inherit access through their parent post/event
drop policy if exists "own memory photos select" on public.harimaro_memory_photos;
drop policy if exists "own memory photos insert" on public.harimaro_memory_photos;
drop policy if exists "own memory photos update" on public.harimaro_memory_photos;
drop policy if exists "own memory photos delete" on public.harimaro_memory_photos;

create policy "household memory photos select"
on public.harimaro_memory_photos for select to authenticated
using (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_member(post.household_id)
  )
);

create policy "household memory photos insert"
on public.harimaro_memory_photos for insert to authenticated
with check (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_member(post.household_id)
  )
);

create policy "household memory photos update"
on public.harimaro_memory_photos for update to authenticated
using (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_member(post.household_id)
  )
)
with check (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_member(post.household_id)
  )
);

create policy "household memory photos delete"
on public.harimaro_memory_photos for delete to authenticated
using (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and public.is_household_member(post.household_id)
  )
);

drop policy if exists "own event photos select" on public.harimaro_event_photos;
drop policy if exists "own event photos insert" on public.harimaro_event_photos;
drop policy if exists "own event photos update" on public.harimaro_event_photos;
drop policy if exists "own event photos delete" on public.harimaro_event_photos;

create policy "household event photos select"
on public.harimaro_event_photos for select to authenticated
using (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and public.is_household_member(event.household_id)
  )
);

create policy "household event photos insert"
on public.harimaro_event_photos for insert to authenticated
with check (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and public.is_household_member(event.household_id)
  )
);

create policy "household event photos update"
on public.harimaro_event_photos for update to authenticated
using (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and public.is_household_member(event.household_id)
  )
)
with check (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and public.is_household_member(event.household_id)
  )
);

create policy "household event photos delete"
on public.harimaro_event_photos for delete to authenticated
using (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and public.is_household_member(event.household_id)
  )
);
