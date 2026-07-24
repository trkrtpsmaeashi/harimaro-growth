create table if not exists public.harimaro_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_date date not null,
  caption text,
  photo_url text not null,
  photo_path text not null,
  created_at timestamptz not null default now()
);

alter table public.harimaro_memories enable row level security;

drop policy if exists "own memories select" on public.harimaro_memories;
drop policy if exists "own memories insert" on public.harimaro_memories;
drop policy if exists "own memories update" on public.harimaro_memories;
drop policy if exists "own memories delete" on public.harimaro_memories;

create policy "own memories select"
on public.harimaro_memories
for select
to authenticated
using (auth.uid() = user_id);

create policy "own memories insert"
on public.harimaro_memories
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "own memories update"
on public.harimaro_memories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own memories delete"
on public.harimaro_memories
for delete
to authenticated
using (auth.uid() = user_id);
