-- Saves one shift for apps/api, keyed by the id the browser generated.
--
-- shifts has no unique key that contains user_id: the id alone identifies a
-- shift. A plain upsert on id from the backend's secret-key client (which
-- bypasses RLS) would update whichever row has that id, another user's
-- included. This function makes "insert, or update only if it is mine" one
-- statement:
--
--   insert ... on conflict (id) do update ... where shifts.user_id = p_user_id
--
-- Postgres locks the conflicting row before evaluating the WHERE, so two
-- concurrent calls cannot both see "not there" or race an ownership check.
-- When the id belongs to another user, nothing is written and no row comes
-- back: the function returns false, and the API answers 404 without saying
-- whether the id exists.
--
-- Only the backend may call it (service_role). The owner is p_user_id, set by
-- the API from the verified token, never from the request.

create function public.api_upsert_shift(
  p_user_id uuid,
  p_id uuid,
  p_date date,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_is_duty boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_saved uuid;
begin
  if p_user_id is null then
    raise exception 'A user id is required' using errcode = '22023';
  end if;

  -- Same rules as the guest import: the API validates first, this is the
  -- last line for any other caller.
  if p_id is null or p_date is null
    or p_start_time is null or p_end_time is null
    or p_start_time >= p_end_time
    or p_is_duty is null then
    raise exception 'Invalid shift' using errcode = '22023';
  end if;

  insert into public.shifts as s (id, user_id, date, start_time, end_time, is_duty)
  values (p_id, p_user_id, p_date, p_start_time, p_end_time, p_is_duty)
  on conflict (id) do update
    set date = excluded.date,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        is_duty = excluded.is_duty,
        updated_at = now()
    where s.user_id = p_user_id
  returning s.id into v_saved;

  return v_saved is not null;
end;
$$;

-- New public functions are executable by PUBLIC, anon and authenticated by
-- default in Supabase: the browser must never call this one.
revoke execute on function public.api_upsert_shift(uuid, uuid, date, timestamptz, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.api_upsert_shift(uuid, uuid, date, timestamptz, timestamptz, boolean)
  to service_role;
