-- Run only on an explicitly prepared local test database; never uses a model.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('public', 'reference_research_attempts', 'research attempts exist');
select ok(not has_table_privilege('anon', 'public.reference_research_attempts', 'select'), 'anon cannot read attempts');
select ok(not has_function_privilege('authenticated', 'public.claim_reference_research(text,jsonb,boolean)', 'execute'),
  'authenticated cannot claim research');

create temp table research_fixture(task jsonb) on commit drop;
insert into research_fixture values (jsonb_build_object(
  'id', repeat('a', 64), 'specId', 'synthetic-election', 'specVersion', 1, 'asOfDate', '2026-02-20',
  'currentValues', '[]'::jsonb,
  'request', jsonb_build_object('requestUnit', 'subject', 'domain', 'elections',
    'subjectKey', 'knesset:999999', 'parameters', jsonb_build_array('calendar.knesset_election'))
));
create temp table research_claims(label text, claim jsonb) on commit drop;
insert into research_claims select 'first', public.claim_reference_research(repeat('a', 64), task) from research_fixture;

select ok((select claim->>'id' is not null from research_claims where label = 'first'), 'claims a task');
select is((select public.claim_reference_research(repeat('a', 64), task) from research_fixture), null::jsonb,
  'an overlapping claim cannot dispatch concurrently');
select is((select public.dispatch_reference_research((claim->>'id')::uuid, (claim->>'token')::uuid)
  from research_claims where label = 'first'), true, 'dispatches once');
select is((select public.dispatch_reference_research((claim->>'id')::uuid, (claim->>'token')::uuid)
  from research_claims where label = 'first'), false, 'cannot redispatch the same attempt');

select public.finish_reference_research((claim->>'id')::uuid, (claim->>'token')::uuid,
  '{"outcome":"provider_error","resolvedParameters":[],"candidateIds":[]}'::jsonb, now() + interval '1 day')
  from research_claims where label = 'first';
select is((select state from public.reference_research_attempts where id =
  (select (claim->>'id')::uuid from research_claims where label = 'first')), 'unknown', 'a provider error preserves uncertainty');
select is((select public.claim_reference_research(repeat('a', 64), task) from research_fixture), null::jsonb,
  'unknown is never retried automatically');

insert into research_claims select 'second', public.claim_reference_research(repeat('a', 64), task, true) from research_fixture;
select ok((select claim->>'id' is not null from research_claims where label = 'second'), 'force creates an explicit new attempt');
select public.dispatch_reference_research((claim->>'id')::uuid, (claim->>'token')::uuid)
  from research_claims where label = 'second';
update public.reference_research_attempts set lease_until = now() - interval '1 second'
  where id = (select (claim->>'id')::uuid from research_claims where label = 'second');
select is((select public.claim_reference_research(repeat('a', 64), task) from research_fixture), null::jsonb,
  'expired dispatched attempts still cannot retry automatically');
select throws_ok(format('select public.finish_reference_research(%L::uuid,%L::uuid,%L::jsonb,now()+interval ''1 day'')',
  claim->>'id', claim->>'token', '{"outcome":"completed","resolvedParameters":[],"candidateIds":[]}'),
  '40001', 'research ownership lost', 'expired owners cannot finish') from research_claims where label = 'second';
select throws_ok(format('select public.insert_research_candidate(%L::uuid,%L::uuid,%L::jsonb)',
  claim->>'id', claim->>'token', '{"validFrom":"2026-02-01","validTo":null}'),
  '40001', 'research ownership lost', 'expired owners cannot insert candidates') from research_claims where label = 'second';

select throws_ok(format('select public.finish_reference_research(%L::uuid,%L::uuid,%L::jsonb,now()+interval ''1 day'')',
  claim->>'id', claim->>'token', '{"outcome":"completed","resolvedParameters":[],"candidateIds":[],"rawResponse":"not allowed"}'),
  '22023', 'invalid research completion', 'attempt results cannot contain provider output') from research_claims where label = 'first';
select is((select count(*)::integer from public.reference_revisions where subject_key = 'knesset:999999'), 0,
  'attempt lifecycle never creates or activates a reference');

select * from finish();
rollback;
