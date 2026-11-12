-- Operational attempts only. No scheduler is enabled, no reference is activated,
-- and no provider output is stored in this table. Apply separately after review.
create table public.reference_research_attempts (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  task_key text not null check (task_key ~ '^[0-9a-f]{64}$'),
  domain text not null check (domain in ('elections', 'income-tax', 'contributions')),
  scope text not null,
  parameters text[] not null check (cardinality(parameters) between 1 and 8),
  task jsonb not null,
  forced boolean not null default false,
  state text not null default 'claimed' check (state in ('claimed', 'dispatched', 'completed', 'failed', 'unknown')),
  created_at timestamptz not null default now(),
  lease_until timestamptz not null default (clock_timestamp() + interval '4 minutes'),
  dispatched_at timestamptz,
  finished_at timestamptz,
  next_eligible_at timestamptz not null default now(),
  result jsonb,
  check ((state in ('completed', 'failed', 'unknown')) = (finished_at is not null))
);
create index reference_research_attempt_scope_idx on public.reference_research_attempts(domain, scope, created_at);
alter table public.reference_research_attempts enable row level security;
revoke all on public.reference_research_attempts from public, anon, authenticated;
grant select, insert, update on public.reference_research_attempts to service_role;

create function public.claim_reference_research(p_task_key text, p_task jsonb, p_force boolean default false)
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
  if v_domain is null or v_domain not in ('elections', 'income-tax', 'contributions')
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

create function public.dispatch_reference_research(p_id uuid, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.reference_research_attempts set state = 'dispatched', dispatched_at = clock_timestamp()
   where id = p_id and token = p_token and state = 'claimed' and lease_until > clock_timestamp();
  return found;
end;
$$;

create function public.finish_reference_research(p_id uuid, p_token uuid, p_result jsonb, p_next_eligible_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_result->>'outcome' is null or p_result->>'outcome' not in
    ('completed', 'unresolved', 'invalid_output', 'provider_error', 'persistence_failed')
    or jsonb_typeof(p_result->'resolvedParameters') is distinct from 'array'
    or jsonb_typeof(p_result->'candidateIds') is distinct from 'array'
    or (p_result - 'outcome' - 'resolvedParameters' - 'candidateIds' - 'provider') <> '{}'::jsonb
    or p_next_eligible_at is null or p_next_eligible_at < now() then
    raise exception 'invalid research completion' using errcode = '22023';
  end if;
  if p_result ? 'provider' then
    if jsonb_typeof(p_result->'provider') is distinct from 'object'
       or (p_result->'provider' - 'model' - 'durationMs' - 'usage') <> '{}'::jsonb
       or coalesce(p_result->'provider'->>'model', '') !~ '^[a-zA-Z0-9._:/-]{1,128}$'
       or coalesce(p_result->'provider'->>'durationMs', '') !~ '^[0-9]+$'
       or jsonb_typeof(p_result->'provider'->'usage') is distinct from 'object' then
      raise exception 'invalid research completion' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_each_text(p_result->'provider'->'usage') entry
      where entry.key not in ('promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount')
         or entry.value !~ '^[0-9]+$') then
      raise exception 'invalid research completion' using errcode = '22023';
    end if;
  end if;
  if exists (select 1 from jsonb_array_elements_text(p_result->'candidateIds') v
    where v !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or exists (select 1 from jsonb_array_elements_text(p_result->'resolvedParameters') v
      where v not in (select unnest(a.parameters) from public.reference_research_attempts a where a.id = p_id and a.token = p_token)) then
    raise exception 'invalid research completion' using errcode = '22023';
  end if;
  update public.reference_research_attempts
    set state = case when p_result->>'outcome' = 'provider_error' then 'unknown'
                     when p_result->>'outcome' = 'completed' then 'completed' else 'failed' end,
        result = p_result, finished_at = now(), next_eligible_at = p_next_eligible_at
    where id = p_id and token = p_token and state = 'dispatched' and lease_until > clock_timestamp();
  if not found then raise exception 'research ownership lost' using errcode = '40001'; end if;
end;
$$;

-- Fence ownership and candidate insertion together; a separate HTTP ownership
-- check cannot prevent the lease expiring between checking and inserting.
create function public.insert_research_candidate(p_id uuid, p_token uuid, p_candidate jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_attempt public.reference_research_attempts%rowtype;
  v_from date := (p_candidate->>'validFrom')::date;
  v_until date := (p_candidate->>'validTo')::date;
  v_month date;
begin
  select * into v_attempt from public.reference_research_attempts where id = p_id and token = p_token;
  if not found then raise exception 'research ownership lost' using errcode = '40001'; end if;
  perform pg_advisory_xact_lock(hashtextextended('research|' || v_attempt.domain || '|' || v_attempt.scope, 0));
  select * into v_attempt from public.reference_research_attempts
    where id = p_id and token = p_token and state = 'dispatched' and lease_until > clock_timestamp() for update;
  if not found then raise exception 'research ownership lost' using errcode = '40001'; end if;
  if p_candidate->>'kind' is null or not (p_candidate->>'kind' = any(v_attempt.parameters))
     or p_candidate->>'origin' is distinct from 'research'
     or p_candidate->>'trust' is null or p_candidate->>'trust' not in ('official_grounded', 'secondary_grounded')
     or v_from is null or (v_until is not null and v_until <= v_from) then
    raise exception 'invalid research candidate' using errcode = '22023';
  end if;
  if v_attempt.domain = 'elections' then
    if p_candidate->>'subjectKey' is distinct from v_attempt.scope then
      raise exception 'invalid research candidate subject' using errcode = '22023';
    end if;
  else
    v_month := make_date((v_attempt.task->'request'->>'year')::integer, (v_attempt.task->'request'->>'month')::integer, 1);
    if p_candidate->>'subjectKey' is not null or v_from >= (v_month + interval '1 month')::date
       or (v_until is not null and v_until <= v_month) then
      raise exception 'invalid research candidate month' using errcode = '22023';
    end if;
  end if;
  return public.insert_reference_candidate(p_candidate->>'kind', p_candidate->>'subjectKey',
    v_from, v_until, p_candidate->'value', 'research', p_candidate->>'trust', p_candidate->>'fallbackReason',
    p_candidate->'sources', p_candidate->'evidence');
end;
$$;

revoke all on function public.claim_reference_research(text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.dispatch_reference_research(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_reference_research(uuid, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.insert_research_candidate(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_reference_research(text, jsonb, boolean) to service_role;
grant execute on function public.dispatch_reference_research(uuid, uuid) to service_role;
grant execute on function public.finish_reference_research(uuid, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.insert_research_candidate(uuid, uuid, jsonb) to service_role;
