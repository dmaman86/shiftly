-- The ownership policies on user data, exercised as a signed-in browser user
-- would. The backend's service_role bypasses them; they stay as a backstop
-- for any browser privilege on these tables.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

insert into public.shifts (user_id, date, start_time, end_time)
values
  ('00000000-0000-4000-8000-00000000000a', '2026-09-01', '2026-09-01 08:00+03', '2026-09-01 16:00+03'),
  ('00000000-0000-4000-8000-00000000000b', '2026-09-01', '2026-09-01 08:00+03', '2026-09-01 16:00+03');
insert into public.work_days (user_id, date, status)
values ('00000000-0000-4000-8000-00000000000b', '2026-09-02', 'sick');
insert into public.monthly_configs (user_id, year, month, base_rate)
values ('00000000-0000-4000-8000-00000000000b', 2026, 9, 50);

-- From here on, user A as PostgREST would run it.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  'select user_id from public.shifts',
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid)$$,
  'a user reads only their own shifts'
);
select is_empty(
  'select 1 from public.work_days',
  'a user sees no other user''s work days'
);
select is_empty(
  'select 1 from public.monthly_configs',
  'a user sees no other user''s monthly configs'
);

select throws_ok(
  $$insert into public.shifts (user_id, date, start_time, end_time)
    values ('00000000-0000-4000-8000-00000000000b', '2026-09-03', '2026-09-03 08:00+03', '2026-09-03 16:00+03')$$,
  '42501',
  null,
  'a user cannot write a shift owned by someone else'
);
select throws_ok(
  $$update public.shifts set user_id = '00000000-0000-4000-8000-00000000000b'
     where user_id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501',
  null,
  'a user cannot hand their shift to someone else'
);

select lives_ok(
  $$update public.shifts set is_duty = true
     where user_id = '00000000-0000-4000-8000-00000000000b'$$,
  'updating another user''s shifts runs...'
);
select lives_ok(
  $$delete from public.work_days
     where user_id = '00000000-0000-4000-8000-00000000000b'$$,
  'deleting another user''s work days runs...'
);

reset role;
select is(
  (select is_duty from public.shifts
    where user_id = '00000000-0000-4000-8000-00000000000b'),
  false,
  '...but leaves their shifts unchanged'
);
select is(
  (select count(*)::integer from public.work_days
    where user_id = '00000000-0000-4000-8000-00000000000b'),
  1,
  '...and leaves their work days in place'
);

select * from finish();
rollback;
