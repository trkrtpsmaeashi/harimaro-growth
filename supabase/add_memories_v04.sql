alter table public.harimaro_memories
add column if not exists tags text[] not null default '{}';

alter table public.harimaro_memories
add column if not exists is_favorite boolean not null default false;
