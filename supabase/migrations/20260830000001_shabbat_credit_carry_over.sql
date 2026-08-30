-- Adds the running Shabbat-credit carry-over balance to monthly_configs.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor).

alter table public.monthly_configs
  add column unused_shabbat_credit_hours numeric not null default 0;
