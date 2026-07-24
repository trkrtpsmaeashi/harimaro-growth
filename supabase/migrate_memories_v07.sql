create table if not exists public.harimaro_memory_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_date date not null,
  caption text,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.harimaro_memory_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.harimaro_memory_posts(id) on delete cascade,
  photo_url text not null,
  photo_path text not null,
  sort_order integer not null default 0,
  source_memory_id uuid unique,
  created_at timestamptz not null default now()
);

alter table public.harimaro_memory_posts enable row level security;
alter table public.harimaro_memory_photos enable row level security;

drop policy if exists "own memory posts select" on public.harimaro_memory_posts;
drop policy if exists "own memory posts insert" on public.harimaro_memory_posts;
drop policy if exists "own memory posts update" on public.harimaro_memory_posts;
drop policy if exists "own memory posts delete" on public.harimaro_memory_posts;

create policy "own memory posts select"
on public.harimaro_memory_posts
for select to authenticated
using (auth.uid() = user_id);

create policy "own memory posts insert"
on public.harimaro_memory_posts
for insert to authenticated
with check (auth.uid() = user_id);

create policy "own memory posts update"
on public.harimaro_memory_posts
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own memory posts delete"
on public.harimaro_memory_posts
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "own memory photos select" on public.harimaro_memory_photos;
drop policy if exists "own memory photos insert" on public.harimaro_memory_photos;
drop policy if exists "own memory photos update" on public.harimaro_memory_photos;
drop policy if exists "own memory photos delete" on public.harimaro_memory_photos;

create policy "own memory photos select"
on public.harimaro_memory_photos
for select to authenticated
using (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and post.user_id = auth.uid()
  )
);

create policy "own memory photos insert"
on public.harimaro_memory_photos
for insert to authenticated
with check (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and post.user_id = auth.uid()
  )
);

create policy "own memory photos update"
on public.harimaro_memory_photos
for update to authenticated
using (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and post.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and post.user_id = auth.uid()
  )
);

create policy "own memory photos delete"
on public.harimaro_memory_photos
for delete to authenticated
using (
  exists (
    select 1
    from public.harimaro_memory_posts post
    where post.id = post_id
      and post.user_id = auth.uid()
  )
);

do $$
declare
  group_row record;
  old_photo record;
  new_post_id uuid;
  photo_index integer;
begin
  if to_regclass('public.harimaro_memories') is null then
    return;
  end if;

  for group_row in
    select
      user_id,
      memory_date,
      coalesce(caption, '') as caption,
      coalesce(tags, '{}'::text[]) as tags,
      bool_or(coalesce(is_favorite, false)) as is_favorite,
      min(created_at) as created_at
    from public.harimaro_memories
    group by
      user_id,
      memory_date,
      coalesce(caption, ''),
      coalesce(tags, '{}'::text[])
  loop
    select id
    into new_post_id
    from public.harimaro_memory_posts
    where user_id = group_row.user_id
      and memory_date = group_row.memory_date
      and coalesce(caption, '') = group_row.caption
      and tags = group_row.tags
    order by created_at asc
    limit 1;

    if new_post_id is null then
      insert into public.harimaro_memory_posts (
        user_id,
        memory_date,
        caption,
        tags,
        is_favorite,
        created_at
      )
      values (
        group_row.user_id,
        group_row.memory_date,
        nullif(group_row.caption, ''),
        group_row.tags,
        group_row.is_favorite,
        group_row.created_at
      )
      returning id into new_post_id;
    end if;

    photo_index := 0;

    for old_photo in
      select *
      from public.harimaro_memories
      where user_id = group_row.user_id
        and memory_date = group_row.memory_date
        and coalesce(caption, '') = group_row.caption
        and coalesce(tags, '{}'::text[]) = group_row.tags
      order by created_at asc
    loop
      insert into public.harimaro_memory_photos (
        post_id,
        photo_url,
        photo_path,
        sort_order,
        source_memory_id,
        created_at
      )
      values (
        new_post_id,
        old_photo.photo_url,
        old_photo.photo_path,
        photo_index,
        old_photo.id,
        old_photo.created_at
      )
      on conflict (source_memory_id) do nothing;

      photo_index := photo_index + 1;
    end loop;
  end loop;
end $$;
