-- Local transactional fixtures only: no provider, publication or production writes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create function pg_temp.allowance_task(p_parameters jsonb, p_month integer default 2)
returns jsonb language sql as $$
  select jsonb_build_object(
    'id', repeat('d', 64), 'specId', 'reference:allowances', 'specVersion', 1, 'asOfDate', '2099-02-20',
    'request', jsonb_build_object('requestUnit', 'calendar_month', 'domain', 'allowances', 'year', 2099,
      'month', p_month, 'parameters', p_parameters),
    'currentValues', coalesce((select jsonb_agg(jsonb_build_object('id', r.id))
      from public.reference_revisions r where r.kind in (select jsonb_array_elements_text(p_parameters))
      and r.subject_key is null and r.status = 'active'
      and r.valid_from < (make_date(2099, p_month, 1) + interval '1 month')::date
      and (r.valid_to is null or r.valid_to > make_date(2099, p_month, 1))), '[]'::jsonb)
  );
$$;
create temp table allowance_fixture(claim jsonb, candidate jsonb, revision_id uuid) on commit drop;
insert into allowance_fixture(claim, candidate) select
  public.claim_reference_research(repeat('d', 64), pg_temp.allowance_task('["per_diem.point_rate","meal_allowance.rates"]')),
  '{"kind":"meal_allowance.rates","subjectKey":null,"validFrom":"2099-02-01","validTo":null,
    "value":{"small":9.25,"large":13.75},"origin":"research","trust":"official_grounded","fallbackReason":null,
    "sources":[{"url":"https://www.gov.il/synthetic-allowance-test","finalUrl":"https://www.gov.il/synthetic-allowance-test",
      "publisher":"www.gov.il","tier":1,"discoveredVia":"grounding_metadata","accessStatus":"not_fetched","role":"supporting"}],
    "evidence":[{"evidenceType":"grounded","source":0,"quote":"Synthetic allowance evidence for local tests only.","effectiveFrom":"2099-02-01"}]}'::jsonb;

select ok(not has_function_privilege('anon','public.claim_reference_research(text,jsonb,boolean)','execute'), 'anon cannot claim allowance research');
select ok(not has_function_privilege('authenticated','public.insert_research_candidate(uuid,uuid,jsonb)','execute'), 'browser cannot insert allowance candidates');
select ok((select claim->>'id' is not null from allowance_fixture), 'claims the new domain with both existing kinds');
select is((select domain from public.reference_research_attempts where id = (select (claim->>'id')::uuid from allowance_fixture)), 'allowances', 'stores the exact domain');
select is((select scope from public.reference_research_attempts where id = (select (claim->>'id')::uuid from allowance_fixture)), 'month:2099-02-01', 'stores the exact monthly scope');
select is(public.claim_reference_research(repeat('d',64), pg_temp.allowance_task('["meal_allowance.rates"]')), null::jsonb, 'parameter subset cannot claim concurrently');
select throws_ok($$select public.claim_reference_research(repeat('d',64), pg_temp.allowance_task('["income_tax.credit_point"]'))$$,
  '22023', 'invalid research parameter domain', 'rejects tax kinds in the allowance domain');
select throws_ok($$select public.claim_reference_research(repeat('d',64), pg_temp.allowance_task('["national_insurance.employee_reduced_rate"]'))$$,
  '22023', 'invalid research parameter domain', 'rejects contribution kinds in the allowance domain');
select throws_ok($$select public.claim_reference_research(repeat('d',64), pg_temp.allowance_task('["meal_allowance.rates"]') ||
  jsonb_build_object('request', jsonb_build_object('requestUnit','subject','domain','allowances','subjectKey','knesset:26','parameters',jsonb_build_array('meal_allowance.rates'))))$$,
  '22023', 'invalid research scope', 'rejects subject requests for allowances');
select is((select public.dispatch_reference_research((claim->>'id')::uuid,(claim->>'token')::uuid) from allowance_fixture), true, 'dispatches once');
update allowance_fixture set revision_id = public.insert_research_candidate((claim->>'id')::uuid,(claim->>'token')::uuid,candidate);
select is((select status from public.reference_revisions where id = (select revision_id from allowance_fixture)), 'pending_review', 'inserts only pending review');
select is((select public.insert_research_candidate((claim->>'id')::uuid,(claim->>'token')::uuid,candidate) from allowance_fixture),
  (select revision_id from allowance_fixture), 'deduplicates the same candidate');
select throws_ok(format('select public.insert_research_candidate(%L::uuid,%L::uuid,%L::jsonb)', claim->>'id',claim->>'token',
  (candidate || '{"kind":"income_tax.credit_point"}'::jsonb)::text), '22023', 'invalid research candidate', 'candidate cannot escape requested kinds') from allowance_fixture;
select is((select activated_at from public.reference_revisions where id = (select revision_id from allowance_fixture)), null::timestamptz, 'research never activates the revision');
select ok(public.claim_reference_research(repeat('d',64), pg_temp.allowance_task('["meal_allowance.rates"]',3))->>'id' is not null,
  'a different month remains a separate task');
select lives_ok($$select public.claim_reference_research(repeat('d',64),
  jsonb_set(pg_temp.allowance_task('["income_tax.credit_point"]'),'{request,domain}','"income-tax"'))$$,
  'existing monthly tax claims remain supported');
select lives_ok($$select public.claim_reference_research(repeat('d',64),
  jsonb_set(pg_temp.allowance_task('["national_insurance.employee_reduced_rate"]'),'{request,domain}','"contributions"'))$$,
  'existing contribution claims remain supported');

select * from finish();
rollback;
