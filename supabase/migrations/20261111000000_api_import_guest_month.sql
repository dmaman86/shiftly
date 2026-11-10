-- The guest-month import for apps/api: the same atomic replace as
-- import_guest_month, with the owner passed in instead of read from
-- auth.uid().
--
-- The backend calls it with its secret key (service_role), which carries no
-- user: p_user_id is the caller the API verified from the access token,
-- never a value from the request. Only service_role may execute it.
--
-- import_guest_month stays until the browser loses its direct access (the
-- revoke PR), so a web build still running the old code keeps working.

create function public.api_import_guest_month(
  p_user_id uuid,
  p_year integer,
  p_month integer,
  p_standard_hours numeric,
  p_base_rate numeric,
  p_days jsonb,
  p_shifts jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_user_id is null then
    raise exception 'A user id is required' using errcode = '22023';
  end if;

  -- Bounds mirror the client: SYSTEM_START_YEAR is 2015 and NumberConfigInput
  -- accepts any non-negative number, so a valid guest draft is never rejected.
  if p_year is null or p_year not between 2015 and 2100
    or p_month is null or p_month not between 1 and 12 then
    raise exception 'Invalid year or month' using errcode = '22023';
  end if;

  if p_standard_hours is null or p_standard_hours < 0
    or p_base_rate is null or p_base_rate < 0 then
    raise exception 'Invalid monthly config' using errcode = '22023';
  end if;

  -- A month has at most 31 days; the shift cap only guards against abuse.
  if jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days) > 31
    or jsonb_typeof(p_shifts) is distinct from 'array' or jsonb_array_length(p_shifts) > 200 then
    raise exception 'Invalid days or shifts payload' using errcode = '22023';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month')::date;

  -- "normal" is never stored (row absence = normal).
  if exists (
    select 1
    from jsonb_to_recordset(p_days) as d(date date, status text)
    where d.date is null
      or d.date < v_month_start
      or d.date >= v_month_end
      or d.status is null
      or d.status not in ('vacation', 'sick')
  ) then
    raise exception 'Invalid work day in payload' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shifts)
      as s(date date, start_time timestamptz, end_time timestamptz, is_duty boolean)
    where s.date is null
      or s.date < v_month_start
      or s.date >= v_month_end
      or s.start_time is null
      or s.end_time is null
      or s.start_time >= s.end_time
      or s.is_duty is null
  ) then
    raise exception 'Invalid shift in payload' using errcode = '22023';
  end if;

  delete from public.shifts
  where user_id = p_user_id
    and date >= v_month_start
    and date < v_month_end;

  delete from public.work_days
  where user_id = p_user_id
    and date >= v_month_start
    and date < v_month_end;

  insert into public.work_days (user_id, date, status)
  select p_user_id, d.date, d.status
  from jsonb_to_recordset(p_days) as d(date date, status text);

  -- Ids are generated here so client-supplied ids are never trusted.
  insert into public.shifts (user_id, date, start_time, end_time, is_duty)
  select p_user_id, s.date, s.start_time, s.end_time, s.is_duty
  from jsonb_to_recordset(p_shifts)
    as s(date date, start_time timestamptz, end_time timestamptz, is_duty boolean);

  -- unused_shabbat_credit_hours is derived from the month's calculation and
  -- re-synced by the client, so it is intentionally left untouched.
  insert into public.monthly_configs (user_id, year, month, standard_hours, base_rate)
  values (p_user_id, p_year, p_month, p_standard_hours, p_base_rate)
  on conflict (user_id, year, month) do update
    set standard_hours = excluded.standard_hours,
        base_rate = excluded.base_rate,
        updated_at = now();
end;
$$;

-- New public functions are executable by PUBLIC, anon and authenticated by
-- default in Supabase: the browser must never call this one.
revoke execute on function public.api_import_guest_month(uuid, integer, integer, numeric, numeric, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.api_import_guest_month(uuid, integer, integer, numeric, numeric, jsonb, jsonb)
  to service_role;
