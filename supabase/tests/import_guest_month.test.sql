-- import_guest_month replaces one month of the caller's data atomically:
-- fully, or not at all.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- User A: September with a shift, a sick day and a Shabbat credit; October
-- with a shift. User B: September with a shift.
insert into public.shifts (user_id, date, start_time, end_time)
values
  ('00000000-0000-4000-8000-00000000000a', '2026-09-01', '2026-09-01 08:00+03', '2026-09-01 16:00+03'),
  ('00000000-0000-4000-8000-00000000000a', '2026-10-01', '2026-10-01 08:00+03', '2026-10-01 16:00+03'),
  ('00000000-0000-4000-8000-00000000000b', '2026-09-01', '2026-09-01 08:00+03', '2026-09-01 16:00+03');
insert into public.work_days (user_id, date, status)
values ('00000000-0000-4000-8000-00000000000a', '2026-09-02', 'sick');
insert into public.monthly_configs (user_id, year, month, base_rate, unused_shabbat_credit_hours)
values ('00000000-0000-4000-8000-00000000000a', 2026, 9, 50, 3);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.import_guest_month(
      2026, 9, 6.67, 60,
      '[{"date":"2026-09-05","status":"vacation"}]',
      '[{"date":"2026-09-05","start_time":"2026-09-05T16:00:00+03:00","end_time":"2026-09-05T08:00:00+03:00","is_duty":false}]'
    )$$,
  '22023',
  'Invalid shift in payload',
  'an invalid shift rejects the whole import'
);

reset role;
select results_eq(
  $$select date::text from public.shifts
     where user_id = '00000000-0000-4000-8000-00000000000a' order by date$$,
  $$values ('2026-09-01'), ('2026-10-01')$$,
  'a rejected import leaves the month untouched'
);
select is(
  (select base_rate from public.monthly_configs
    where user_id = '00000000-0000-4000-8000-00000000000a'),
  50::numeric,
  'a rejected import leaves the monthly config untouched'
);

set local role authenticated;
select lives_ok(
  $$select public.import_guest_month(
      2026, 9, 6.67, 60,
      '[{"date":"2026-09-05","status":"vacation"}]',
      '[{"date":"2026-09-05","start_time":"2026-09-05T08:00:00+03:00","end_time":"2026-09-05T16:00:00+03:00","is_duty":true}]'
    )$$,
  'a valid import runs'
);

reset role;
select results_eq(
  $$select date::text, is_duty from public.shifts
     where user_id = '00000000-0000-4000-8000-00000000000a' order by date$$,
  $$values ('2026-09-05', true), ('2026-10-01', false)$$,
  'it replaces the month''s shifts and keeps other months'
);
select results_eq(
  $$select date::text, status from public.work_days
     where user_id = '00000000-0000-4000-8000-00000000000a'$$,
  $$values ('2026-09-05', 'vacation')$$,
  'it replaces the month''s work days'
);
select results_eq(
  $$select base_rate, unused_shabbat_credit_hours from public.monthly_configs
     where user_id = '00000000-0000-4000-8000-00000000000a'$$,
  $$values (60::numeric, 3::numeric)$$,
  'it updates the config and keeps the Shabbat credit'
);
select is(
  (select count(*)::integer from public.shifts
    where user_id = '00000000-0000-4000-8000-00000000000b'),
  1,
  'it never touches another user''s data'
);

-- A request whose token carries no user.
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.import_guest_month(2026, 9, 6.67, 60, '[]', '[]')$$,
  '42501',
  'Authentication is required to import a guest month',
  'without a signed-in user it refuses'
);

select * from finish();
rollback;
