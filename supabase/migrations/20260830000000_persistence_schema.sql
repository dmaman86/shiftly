-- Per-user persistence for monthly config, day status, and shifts.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor).

create table public.monthly_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  standard_hours numeric not null default 6.67,
  base_rate numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

create table public.work_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null default 'normal' check (status in ('normal', 'vacation', 'sick')),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_duty boolean not null default false,
  updated_at timestamptz not null default now()
);

create index shifts_user_date_idx on public.shifts(user_id, date);

alter table public.monthly_configs enable row level security;
alter table public.work_days enable row level security;
alter table public.shifts enable row level security;

create policy "Users manage their own monthly configs"
  on public.monthly_configs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own work days"
  on public.work_days for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own shifts"
  on public.shifts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
