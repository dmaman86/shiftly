-- Add one operational research domain; existing references and published values are untouched.
-- Claim ownership, scope locks, cooldowns and pending-only insertion remain unchanged.
alter table public.reference_research_attempts
  drop constraint reference_research_attempts_domain_check,
  add constraint reference_research_attempts_domain_check
    check (domain in ('elections', 'income-tax', 'contributions', 'allowances'));

create or replace function public.claim_reference_research(p_task_key text, p_task jsonb, p_force boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_request jsonb := p_task->'request';
  v_domain text := v_request->>'domain';
  v_scope text;
  v_parameters text[];
  v_from date;
  v_until date;
  v_id uuid;
  v_token uuid;
  v_snapshot uuid[];
  v_current uuid[];
begin
  if v_domain is null or v_domain not in ('elections', 'income-tax', 'contributions', 'allowances')
     or jsonb_typeof(v_request->'parameters') is distinct from 'array'
     or p_task->>'id' is distinct from p_task_key
     or (p_task - 'id' - 'specId' - 'specVersion' - 'asOfDate' - 'request' - 'currentValues') <> '{}'::jsonb
     or nullif(p_task->>'specId', '') is null
     or p_task->>'specVersion' is null
     or p_task->>'specVersion' !~ '^[1-9][0-9]*$'
     or p_task->>'asOfDate' is null
     or p_task->>'asOfDate' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'invalid research task' using errcode = '22023';
  end if;
  select array_agg(distinct value order by value) into v_parameters
    from jsonb_array_elements_text(v_request->'parameters');
  if cardinality(v_parameters) is null or cardinality(v_parameters) not between 1 and 8 then
    raise exception 'invalid research parameters' using errcode = '22023';
  end if;
  if v_request->>'requestUnit' = 'calendar_month' and v_domain <> 'elections' then
    if (v_request - 'requestUnit' - 'domain' - 'year' - 'month' - 'parameters') <> '{}'::jsonb then
      raise exception 'invalid research scope' using errcode = '22023';
    end if;
    v_from := make_date((v_request->>'year')::integer, (v_request->>'month')::integer, 1);
    v_until := (v_from + interval '1 month')::date;
    if v_from is null or v_from < date '2015-11-01' or v_from > date '2100-12-01' then
      raise exception 'invalid research month' using errcode = '22023';
    end if;
    v_scope := 'month:' || v_from::text;
  elsif v_request->>'requestUnit' = 'subject' and v_domain = 'elections'
        and v_request->>'subjectKey' ~ '^knesset:[1-9][0-9]*$' then
    if (v_request - 'requestUnit' - 'domain' - 'subjectKey' - 'parameters') <> '{}'::jsonb then
      raise exception 'invalid research scope' using errcode = '22023';
    end if;
    v_scope := v_request->>'subjectKey';
  else
    raise exception 'invalid research scope' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_parameters) k where
    case v_domain
      when 'elections' then k <> 'calendar.knesset_election'
      when 'income-tax' then k not in ('income_tax.monthly_brackets', 'income_tax.credit_point')
      when 'allowances' then k not in ('per_diem.point_rate', 'meal_allowance.rates')
      else k not in ('social_security.reduced_rate_boundary', 'social_security.max_insurable_income',
        'national_insurance.employee_reduced_rate', 'national_insurance.employee_standard_rate',
        'health_insurance.employee_reduced_rate', 'health_insurance.employee_standard_rate')
    end) then raise exception 'invalid research parameter domain' using errcode = '22023'; end if;

  -- Parameter subsets for one month still investigate that entire month.
  perform pg_advisory_xact_lock(hashtextextended('research|' || v_domain || '|' || v_scope, 0));
  if exists (select 1 from public.reference_research_attempts a
    where a.domain = v_domain and a.scope = v_scope and a.parameters && v_parameters and (
      (a.state in ('claimed', 'dispatched') and a.lease_until > clock_timestamp())
      or (not coalesce(p_force, false) and (a.state in ('dispatched', 'unknown') or a.next_eligible_at > now()))
    )) then return null; end if;

  -- Do not spend a model request against a published baseline that changed after planning.
  select coalesce(array_agg((v->>'id')::uuid order by (v->>'id')::uuid), '{}'::uuid[]) into v_snapshot
    from jsonb_array_elements(coalesce(p_task->'currentValues', '[]'::jsonb)) v;
  select coalesce(array_agg(r.id order by r.id), '{}'::uuid[]) into v_current
    from public.reference_revisions r where r.kind = any(v_parameters) and r.status = 'active'
      and ((v_domain = 'elections' and r.subject_key = v_scope)
        or (v_domain <> 'elections' and r.subject_key is null and r.valid_from < v_until and (r.valid_to is null or r.valid_to > v_from)));
  if v_snapshot is distinct from v_current then return null; end if;

  insert into public.reference_research_attempts(task_key, domain, scope, parameters, task, forced)
    values(p_task_key, v_domain, v_scope, v_parameters, p_task - 'currentValues', coalesce(p_force, false)) returning id, token into v_id, v_token;
  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$$;

-- CREATE OR REPLACE preserves privileges; restate the backend-only boundary explicitly.
revoke all on function public.claim_reference_research(text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.claim_reference_research(text, jsonb, boolean) to service_role;
