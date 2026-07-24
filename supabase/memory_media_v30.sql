-- Harimaro Memories v3.0
-- 既存の写真データを残したまま、動画を扱えるように拡張します。

alter table public.harimaro_memory_photos
  add column if not exists media_url text,
  add column if not exists media_path text,
  add column if not exists media_type text not null default 'image',
  add column if not exists mime_type text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists duration_seconds numeric;

alter table public.harimaro_memory_photos
drop constraint if exists harimaro_memory_photos_media_type_check;

alter table public.harimaro_memory_photos
add constraint harimaro_memory_photos_media_type_check
check (media_type in ('image', 'video'));

update public.harimaro_memory_photos
set
  media_url = coalesce(media_url, photo_url),
  media_path = coalesce(media_path, photo_path),
  media_type = coalesce(nullif(media_type, ''), 'image')
where media_url is null
   or media_path is null
   or media_type is null
   or media_type = '';

create index if not exists harimaro_memory_photos_media_type_idx
on public.harimaro_memory_photos(media_type);

-- 既存のRLSはそのまま利用します。
-- Storageバケット harimaro-photos に動画も保存します。
