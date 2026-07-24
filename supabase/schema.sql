
create extension if not exists pgcrypto;

create table if not exists public.hedgehog_records(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 recorded_on date not null,
 weight_g integer not null check(weight_g > 0),
 memo text,
 tags text[] default '{}',
 photo_url text,
 photo_path text,
 created_at timestamptz not null default now()
);
alter table public.hedgehog_records enable row level security;
create policy "own hedgehog records select" on public.hedgehog_records for select using(auth.uid()=user_id);
create policy "own hedgehog records insert" on public.hedgehog_records for insert with check(auth.uid()=user_id);
create policy "own hedgehog records update" on public.hedgehog_records for update using(auth.uid()=user_id);
create policy "own hedgehog records delete" on public.hedgehog_records for delete using(auth.uid()=user_id);

create table if not exists public.yukkuri_scripts(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 body text not null,
 source_notes text,
 created_at timestamptz not null default now()
);
alter table public.yukkuri_scripts enable row level security;
create policy "own scripts select" on public.yukkuri_scripts for select using(auth.uid()=user_id);
create policy "own scripts insert" on public.yukkuri_scripts for insert with check(auth.uid()=user_id);
create policy "own scripts update" on public.yukkuri_scripts for update using(auth.uid()=user_id);
create policy "own scripts delete" on public.yukkuri_scripts for delete using(auth.uid()=user_id);

create table if not exists public.youtube_videos(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 published_on date,
 views integer default 0,
 subscriber_change integer default 0,
 impressions integer default 0,
 ctr numeric(5,2) default 0,
 avg_watch_seconds integer default 0,
 duration_seconds integer default 0,
 memo text,
 created_at timestamptz not null default now()
);
alter table public.youtube_videos enable row level security;
create policy "own videos select" on public.youtube_videos for select using(auth.uid()=user_id);
create policy "own videos insert" on public.youtube_videos for insert with check(auth.uid()=user_id);
create policy "own videos update" on public.youtube_videos for update using(auth.uid()=user_id);
create policy "own videos delete" on public.youtube_videos for delete using(auth.uid()=user_id);

insert into storage.buckets(id,name,public) values('harimaro-photos','harimaro-photos',true)
on conflict(id) do update set public=true;

create policy "upload own harimaro photos" on storage.objects for insert to authenticated
with check(bucket_id='harimaro-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "delete own harimaro photos" on storage.objects for delete to authenticated
using(bucket_id='harimaro-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "public can view harimaro photos" on storage.objects for select
using(bucket_id='harimaro-photos');
