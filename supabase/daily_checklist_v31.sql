-- Harimaro Memories v3.1
-- 毎日の自由チェックリスト

create table if not exists public.harimaro_check_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  icon text not null default '✅',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.harimaro_check_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_id uuid not null references public.harimaro_check_items(id) on delete cascade,
  check_date date not null,
  checked_by uuid not null references auth.users(id) on delete set null,
  checked_at timestamptz not null default now(),
  unique (item_id, check_date)
);

create index if not exists harimaro_check_items_household_idx
on public.harimaro_check_items(household_id, is_active, sort_order);

create index if not exists harimaro_check_logs_household_date_idx
on public.harimaro_check_logs(household_id, check_date);

alter table public.harimaro_check_items enable row level security;
alter table public.harimaro_check_logs enable row level security;

drop policy if exists "household check items select" on public.harimaro_check_items;
drop policy if exists "household check items insert" on public.harimaro_check_items;
drop policy if exists "household check items update" on public.harimaro_check_items;
drop policy if exists "household check items delete" on public.harimaro_check_items;

create policy "household check items select"
on public.harimaro_check_items
for select to authenticated
using (public.is_household_member(household_id));

create policy "household check items insert"
on public.harimaro_check_items
for insert to authenticated
with check (
  public.is_household_editor(household_id)
  and created_by = auth.uid()
);

create policy "household check items update"
on public.harimaro_check_items
for update to authenticated
using (public.is_household_editor(household_id))
with check (public.is_household_editor(household_id));

create policy "household check items delete"
on public.harimaro_check_items
for delete to authenticated
using (public.is_household_editor(household_id));

drop policy if exists "household check logs select" on public.harimaro_check_logs;
drop policy if exists "household check logs insert" on public.harimaro_check_logs;
drop policy if exists "household check logs update" on public.harimaro_check_logs;
drop policy if exists "household check logs delete" on public.harimaro_check_logs;

create policy "household check logs select"
on public.harimaro_check_logs
for select to authenticated
using (public.is_household_member(household_id));

create policy "household check logs insert"
on public.harimaro_check_logs
for insert to authenticated
with check (
  public.is_household_editor(household_id)
  and checked_by = auth.uid()
  and exists (
    select 1
    from public.harimaro_check_items item
    where item.id = item_id
      and item.household_id = household_id
      and item.is_active = true
  )
);

create policy "household check logs update"
on public.harimaro_check_logs
for update to authenticated
using (public.is_household_editor(household_id))
with check (public.is_household_editor(household_id));

create policy "household check logs delete"
on public.harimaro_check_logs
for delete to authenticated
using (public.is_household_editor(household_id));
