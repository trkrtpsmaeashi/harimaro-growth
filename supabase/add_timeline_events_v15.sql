create table if not exists public.harimaro_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  event_type text not null default 'other',
  title text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.harimaro_event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.harimaro_events(id) on delete cascade,
  photo_url text not null,
  photo_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.harimaro_events enable row level security;
alter table public.harimaro_event_photos enable row level security;

drop policy if exists "own events select" on public.harimaro_events;
drop policy if exists "own events insert" on public.harimaro_events;
drop policy if exists "own events update" on public.harimaro_events;
drop policy if exists "own events delete" on public.harimaro_events;

create policy "own events select"
on public.harimaro_events
for select to authenticated
using (auth.uid() = user_id);

create policy "own events insert"
on public.harimaro_events
for insert to authenticated
with check (auth.uid() = user_id);

create policy "own events update"
on public.harimaro_events
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own events delete"
on public.harimaro_events
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "own event photos select" on public.harimaro_event_photos;
drop policy if exists "own event photos insert" on public.harimaro_event_photos;
drop policy if exists "own event photos update" on public.harimaro_event_photos;
drop policy if exists "own event photos delete" on public.harimaro_event_photos;

create policy "own event photos select"
on public.harimaro_event_photos
for select to authenticated
using (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and event.user_id = auth.uid()
  )
);

create policy "own event photos insert"
on public.harimaro_event_photos
for insert to authenticated
with check (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and event.user_id = auth.uid()
  )
);

create policy "own event photos update"
on public.harimaro_event_photos
for update to authenticated
using (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and event.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and event.user_id = auth.uid()
  )
);

create policy "own event photos delete"
on public.harimaro_event_photos
for delete to authenticated
using (
  exists (
    select 1
    from public.harimaro_events event
    where event.id = event_id
      and event.user_id = auth.uid()
  )
);
