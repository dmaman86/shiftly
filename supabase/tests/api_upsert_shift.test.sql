-- api_upsert_shift inserts or updates one shift, but only the caller's: an
-- id that belongs to another user is never touched.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- User B already has a shift with a known id.
insert into public.shifts (id, user_id, date, start_time, end_time)
values (
  '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-00000000000b',
  '2026-09-01', '2026-09-01 08:00+03', '2026-09-01 16:00+03'
);

-- The backend runs it with the secret key: service_role.
set local role service_role;

select is(
  public.api_upsert_shift(
    '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1',
    '2026-09-02', '2026-09-02 08:00+03', '2026-09-02 16:00+03', false
  ),
  true,
  'a new id is inserted for the caller'
);
select is(
  public.api_upsert_shift(
    '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1',
    '2026-09-02', '2026-09-02 10:00+03', '2026-09-02 18:00+03', true
  ),
  true,
  'the caller''s own shift is updated'
);
select is(
  public.api_upsert_shift(
    '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000b1',
    '2026-09-03', '2026-09-03 08:00+03', '2026-09-03 09:00+03', true
  ),
  false,
  'another user''s id is reported as not saved'
);
select throws_ok(
  $$select public.api_upsert_shift(
      '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a2',
      '2026-09-04', '2026-09-04 16:00+03', '2026-09-04 08:00+03', false
    )$$,
  '22023',
  'Invalid shift',
  'a shift that ends before it starts is rejected'
);
select throws_ok(
  $$select public.api_upsert_shift(
      null, '00000000-0000-4000-8000-0000000000a3',
      '2026-09-04', '2026-09-04 08:00+03', '2026-09-04 16:00+03', false
    )$$,
  '22023',
  'A user id is required',
  'a call without an owner is rejected'
);

reset role;
select results_eq(
  $$select date::text, start_time, end_time, is_duty from public.shifts
     where id = '00000000-0000-4000-8000-0000000000b1'$$,
  $$values ('2026-09-01', '2026-09-01 08:00+03'::timestamptz,
            '2026-09-01 16:00+03'::timestamptz, false)$$,
  'another user''s shift is left unchanged'
);
select is(
  (select user_id::text from public.shifts
    where id = '00000000-0000-4000-8000-0000000000b1'),
  '00000000-0000-4000-8000-00000000000b',
  'another user''s shift keeps its owner'
);
select results_eq(
  $$select id::text, start_time, is_duty from public.shifts
     where user_id = '00000000-0000-4000-8000-00000000000a'$$,
  $$values ('00000000-0000-4000-8000-0000000000a1',
            '2026-09-02 10:00+03'::timestamptz, true)$$,
  'the caller ends up with exactly the saved shift'
);

-- The browser roles can never call it, whatever they send.
set local role authenticated;
select throws_ok(
  $$select public.api_upsert_shift(
      '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a4',
      '2026-09-05', '2026-09-05 08:00+03', '2026-09-05 16:00+03', false
    )$$,
  '42501',
  null,
  'authenticated cannot execute it'
);
reset role;
set local role anon;
select throws_ok(
  $$select public.api_upsert_shift(
      '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a5',
      '2026-09-05', '2026-09-05 08:00+03', '2026-09-05 16:00+03', false
    )$$,
  '42501',
  null,
  'anon cannot execute it'
);
reset role;
select ok(
  not has_function_privilege(
    'public',
    'public.api_upsert_shift(uuid, uuid, date, timestamptz, timestamptz, boolean)',
    'execute'
  ),
  'PUBLIC cannot execute it'
);

select * from finish();
rollback;
