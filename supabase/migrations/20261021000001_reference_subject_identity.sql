-- Stable subject identity for reference revisions.
-- Apply with the Supabase CLI: supabase db push.
--
-- kind identifies the reference-data category; subject_key identifies a stable
-- entity inside it, e.g. kind 'calendar.knesset_election', subject_key
-- 'knesset:26'. The entity's period (an election's date) is not its identity,
-- so a revision of the same subject replaces the previous one whatever its
-- dates are. Kinds without subjects (income tax, rates) keep subject_key null
-- and behave as before.
--
-- The database knows nothing else about elections: statuses such as planned
-- or occurred live in the value, and when to refresh them is application policy.

alter table public.reference_revisions
  add column subject_key text
    check (subject_key ~ '^[a-z_]+:[a-z0-9_.-]+$');

-- At most one active revision per subject.
create unique index reference_revisions_active_subject_idx
  on public.reference_revisions(kind, subject_key)
  where status = 'active' and subject_key is not null;

-- subject_key joins the immutable fields.
create or replace function public.reference_revisions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'reference revisions are never deleted; reject or supersede %', old.id;
  end if;
  if new.kind is distinct from old.kind
     or new.subject_key is distinct from old.subject_key
     or new.valid_from is distinct from old.valid_from
     or new.value is distinct from old.value
     or new.origin is distinct from old.origin
     or new.trust is distinct from old.trust
     or new.fallback_reason is distinct from old.fallback_reason
     or new.created_at is distinct from old.created_at then
    raise exception 'reference revision % is immutable; insert a new revision', old.id;
  end if;
  if new.status is distinct from old.status
     and not (
       (old.status = 'pending_review' and new.status in ('active', 'rejected'))
       or (old.status = 'active' and new.status = 'superseded')
     ) then
    raise exception 'reference revision % cannot go from % to %', old.id, old.status, new.status;
  end if;
  return new;
end;
$$;

-- The signature gains p_subject_key, so the old one is dropped rather than
-- overloaded (PostgREST cannot pick between overloads with named arguments).
drop function public.insert_reference_candidate(text, date, date, jsonb, text, text, text, jsonb, jsonb);

-- Stores a validated candidate with every source its research looked at and
-- the evidence behind it. It never activates it.
--
-- It returns an existing pending or active revision instead when one has the
-- same kind, subject_key, valid_from and value, a compatible valid_to (equal,
-- or the candidate is open-ended and the existing one was bounded later), and
-- a trust that covers the candidate's (reference_trust_covers). Otherwise the
-- candidate becomes a new pending revision with its own sources and evidence.
--
-- p_sources:  [{ url, finalUrl, publisher, tier, discoveredVia, accessStatus,
--               httpStatus, contentType, title, sha256, grounding,
--               fetchAttemptedAt, role: 'supporting' | 'consulted' }]
-- p_evidence: [{ evidenceType, source (0-based index into p_sources, or null),
--               carriedFromRevisionId, quote, section, sourceReference, page,
--               effectiveFrom, grounding, note }]
create function public.insert_reference_candidate(
  p_kind text,
  p_subject_key text,
  p_valid_from date,
  p_valid_to date,
  p_value jsonb,
  p_origin text,
  p_trust text,
  p_fallback_reason text,
  p_sources jsonb,
  p_evidence jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision_id uuid;
  v_source_ids uuid[] := '{}';
  v_source_id uuid;
  v_source jsonb;
  v_evidence jsonb;
  v_index integer;
begin
  if p_origin = 'research' and not exists (
    select 1 from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) e
     where e->>'evidenceType' in ('fetched_verified', 'grounded', 'trusted_secondary_grounded')
  ) then
    raise exception 'a researched value needs evidence from a source';
  end if;

  -- Concurrent inserts for the same kind, subject and period wait here until
  -- the first one commits, so the check below sees its revision. Released at
  -- the end of the transaction.
  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws('|', 'reference_candidate', p_kind, coalesce(p_subject_key, ''),
                p_valid_from::text, coalesce(p_valid_to::text, 'infinity')),
      0
    )
  );

  select id into v_revision_id
    from public.reference_revisions
   where kind = p_kind
     and subject_key is not distinct from p_subject_key
     and valid_from = p_valid_from
     and (valid_to is not distinct from p_valid_to or p_valid_to is null)
     and value = p_value
     and status in ('pending_review', 'active')
     and public.reference_trust_covers(trust, p_trust)
   order by (trust = p_trust) desc, (status = 'active') desc, created_at
   limit 1;
  if v_revision_id is not null then
    return v_revision_id;
  end if;

  insert into public.reference_revisions (
    kind, subject_key, valid_from, valid_to, value, origin, trust, fallback_reason
  )
  values (
    p_kind, p_subject_key, p_valid_from, p_valid_to, p_value, p_origin, p_trust,
    p_fallback_reason
  )
  returning id into v_revision_id;

  for v_source in select * from jsonb_array_elements(coalesce(p_sources, '[]'::jsonb))
  loop
    v_source_id := null;
    insert into public.reference_sources (
      url, final_url, publisher, tier, discovered_via, access_status, http_status,
      content_type, title, sha256, grounding, fetch_attempted_at
    )
    values (
      v_source->>'url',
      v_source->>'finalUrl',
      v_source->>'publisher',
      (v_source->>'tier')::smallint,
      v_source->>'discoveredVia',
      v_source->>'accessStatus',
      (v_source->>'httpStatus')::smallint,
      v_source->>'contentType',
      v_source->>'title',
      v_source->>'sha256',
      v_source->'grounding',
      (v_source->>'fetchAttemptedAt')::timestamptz
    )
    -- Fetched content already stored is reused; other observations are new rows.
    on conflict (final_url, sha256) where sha256 is not null do nothing
    returning id into v_source_id;
    if v_source_id is null then
      select id into v_source_id
        from public.reference_sources
       where final_url = v_source->>'finalUrl' and sha256 = v_source->>'sha256';
    end if;
    v_source_ids := v_source_ids || v_source_id;

    insert into public.reference_revision_sources (revision_id, source_id, role)
    values (v_revision_id, v_source_id, v_source->>'role');
  end loop;

  for v_evidence in select * from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb))
  loop
    v_index := (v_evidence->>'source')::integer;
    if v_index is not null and (v_index < 0 or v_index >= cardinality(v_source_ids)) then
      raise exception 'evidence refers to source % but there are % sources', v_index, cardinality(v_source_ids);
    end if;
    insert into public.reference_evidence (
      revision_id, evidence_type, source_id, carried_from_revision_id, quote,
      section, source_reference, page, effective_from, grounding, note
    )
    values (
      v_revision_id,
      v_evidence->>'evidenceType',
      case when v_index is null then null else v_source_ids[v_index + 1] end,
      (v_evidence->>'carriedFromRevisionId')::uuid,
      v_evidence->>'quote',
      v_evidence->>'section',
      v_evidence->>'sourceReference',
      (v_evidence->>'page')::integer,
      (v_evidence->>'effectiveFrom')::date,
      v_evidence->'grounding',
      v_evidence->>'note'
    );
  end loop;

  -- Evidence must fit its source: verified means fetched; grounded means the
  -- URL came from search metadata (never from the model's own text); the
  -- evidence type matches the tier; general web (tier 4) never supports a
  -- value; and an evidence source is linked as 'supporting'.
  if exists (
    select 1
      from public.reference_evidence e
      join public.reference_sources s on s.id = e.source_id
     where e.revision_id = v_revision_id
       and (
         s.tier = 4
         or (e.evidence_type = 'fetched_verified' and s.access_status <> 'fetched')
         or (e.evidence_type = 'grounded'
             and (s.tier > 2 or s.discovered_via <> 'grounding_metadata'))
         or (e.evidence_type = 'trusted_secondary_grounded'
             and (s.tier <> 3 or s.discovered_via <> 'grounding_metadata'))
         or not exists (
           select 1 from public.reference_revision_sources rs
            where rs.revision_id = v_revision_id
              and rs.source_id = e.source_id
              and rs.role = 'supporting'
         )
       )
  ) then
    raise exception 'evidence does not match its source';
  end if;

  -- The declared trust must be backed by matching evidence.
  if p_trust <> 'legacy_seed' and not exists (
    select 1
      from public.reference_evidence e
      left join public.reference_sources s on s.id = e.source_id
     where e.revision_id = v_revision_id
       and case p_trust
             when 'official_verified' then e.evidence_type = 'fetched_verified' and s.tier <= 2
             when 'official_grounded' then e.evidence_type = 'grounded'
             when 'secondary_verified' then e.evidence_type = 'fetched_verified' and s.tier = 3
             when 'secondary_grounded' then e.evidence_type = 'trusted_secondary_grounded'
             when 'carried_forward' then e.evidence_type = 'carried_forward'
             when 'manual' then e.evidence_type = 'manual'
             else false
           end
  ) then
    raise exception 'trust % is not backed by matching evidence', p_trust;
  end if;

  -- A blocked official source is a claim too: it must be on record.
  if p_fallback_reason = 'official_source_blocked' and not exists (
    select 1
      from public.reference_revision_sources rs
      join public.reference_sources s on s.id = rs.source_id
     where rs.revision_id = v_revision_id
       and s.tier <= 2
       and s.access_status in ('blocked', 'unavailable')
  ) then
    raise exception 'official_source_blocked needs the blocked official source';
  end if;

  return v_revision_id;
end;
$$;

revoke execute on function public.insert_reference_candidate(text, text, date, date, jsonb, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.insert_reference_candidate(text, text, date, date, jsonb, text, text, text, jsonb, jsonb)
  to service_role;

-- Activates a pending revision.
--
-- With a subject_key: the active revision of the same kind and subject, if
-- any, is superseded whatever its dates, and that is recorded. No temporal
-- bounding or truncation happens; the exclusion constraint still rejects a
-- different subject active on an overlapping period.
--
-- Without one (periods of a single value, e.g. income tax):
--   * an open-ended revision ("until further notice") is first bounded by the
--     next active revision of its kind that starts after it: that later
--     revision is the further notice. Nothing is recorded for this: no
--     revision was replaced.
--   * the active revisions without subject that still overlap it are handled
--     like this, and each one is recorded:
--       - one that starts earlier stays active but now ends the day the new one starts (closed);
--       - one that the new period fully covers is replaced (superseded);
--       - anything that would need splitting stops the call: resolve it by hand.
create or replace function public.activate_reference_revision(
  p_revision_id uuid,
  p_reviewer text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new public.reference_revisions%rowtype;
  v_old public.reference_revisions%rowtype;
  v_next_start date;
begin
  if p_reviewer is null or btrim(p_reviewer) = '' then
    raise exception 'activation needs a reviewer';
  end if;

  select * into v_new
    from public.reference_revisions
   where id = p_revision_id
     for update;
  if not found then
    raise exception 'reference revision % not found', p_revision_id;
  end if;
  if v_new.status <> 'pending_review' then
    raise exception 'reference revision % is %, not pending_review', p_revision_id, v_new.status;
  end if;

  if v_new.subject_key is not null then
    -- The previous revision of the subject leaves first, so the exclusion
    -- constraint only ever sees one of them active.
    for v_old in
      select *
        from public.reference_revisions
       where kind = v_new.kind
         and subject_key = v_new.subject_key
         and status = 'active'
         for update
    loop
      update public.reference_revisions
         set status = 'superseded'
       where id = v_old.id;
      insert into public.reference_revision_supersessions (revision_id, predecessor_id, action)
      values (p_revision_id, v_old.id, 'superseded');
    end loop;
  else
    if v_new.valid_to is null then
      select min(valid_from) into v_next_start
        from public.reference_revisions
       where kind = v_new.kind
         and subject_key is null
         and status = 'active'
         and valid_from > v_new.valid_from;
      if v_next_start is not null then
        update public.reference_revisions
           set valid_to = v_next_start
         where id = p_revision_id;
        v_new.valid_to := v_next_start;
      end if;
    end if;

    for v_old in
      select *
        from public.reference_revisions
       where kind = v_new.kind
         and subject_key is null
         and status = 'active'
         and daterange(valid_from, valid_to, '[)')
             && daterange(v_new.valid_from, v_new.valid_to, '[)')
       order by valid_from
         for update
    loop
      if v_old.valid_from < v_new.valid_from then
        if v_new.valid_to is not null
           and (v_old.valid_to is null or v_old.valid_to > v_new.valid_to) then
          raise exception 'revision % would have to be split around %; resolve it manually',
            v_old.id, p_revision_id;
        end if;
        update public.reference_revisions
           set valid_to = v_new.valid_from
         where id = v_old.id;
        insert into public.reference_revision_supersessions (revision_id, predecessor_id, action)
        values (p_revision_id, v_old.id, 'closed');
      elsif v_new.valid_to is null
            or (v_old.valid_to is not null and v_old.valid_to <= v_new.valid_to) then
        update public.reference_revisions
           set status = 'superseded'
         where id = v_old.id;
        insert into public.reference_revision_supersessions (revision_id, predecessor_id, action)
        values (p_revision_id, v_old.id, 'superseded');
      else
        raise exception 'revision % starts inside % but ends after it; resolve it manually',
          v_old.id, p_revision_id;
      end if;
    end loop;
  end if;

  update public.reference_revisions
     set status = 'active',
         activated_at = now(),
         reviewed_at = now(),
         reviewed_by = p_reviewer
   where id = p_revision_id;
end;
$$;

-- One-time data step: give the seven active legacy election seeds a stable
-- identity. Each legacy row (no subject_key) is superseded by a new seed
-- revision with the same period, subject_key 'knesset:<n>' and an explicit
-- electionStatus. The old rows stay as superseded history.
--
-- Statuses are listed explicitly, never inferred from the date: 20-25 are
-- recorded as occurred and 26 as planned. Their trust stays legacy_seed, so
-- research with official evidence can still supersede them.
--
-- The activation RPC cannot do this: a subject-keyed revision only replaces
-- the same subject, and the legacy rows have none. So this step supersedes and
-- activates directly, in the same order as the RPC.
do $$
declare
  c_status constant jsonb := '{
    "20": "occurred", "21": "occurred", "22": "occurred", "23": "occurred",
    "24": "occurred", "25": "occurred", "26": "planned"
  }';
  c_reviewer constant text := 'migration:20261021000001_reference_subject_identity';
  v_legacy public.reference_revisions%rowtype;
  v_number text;
  v_status text;
  v_new_id uuid;
  v_count integer;
begin
  select count(*) into v_count
    from public.reference_revisions
   where kind = 'calendar.knesset_election'
     and subject_key is null
     and status = 'active'
     and origin = 'seed';
  if v_count <> 7 then
    raise exception 'expected 7 active legacy Knesset election seeds, found %', v_count;
  end if;

  for v_legacy in
    select *
      from public.reference_revisions
     where kind = 'calendar.knesset_election'
       and subject_key is null
       and status = 'active'
     order by valid_from
       for update
  loop
    v_number := v_legacy.value->>'knessetNumber';
    v_status := c_status->>v_number;
    if v_status is null then
      raise exception 'no status listed for legacy election %', v_legacy.value;
    end if;

    v_new_id := public.insert_reference_candidate(
      'calendar.knesset_election',
      'knesset:' || v_number,
      v_legacy.valid_from,
      v_legacy.valid_to,
      jsonb_build_object('knessetNumber', v_number::integer, 'electionStatus', v_status),
      'seed', 'legacy_seed', null, '[]', '[]'
    );

    update public.reference_revisions
       set status = 'superseded'
     where id = v_legacy.id;
    update public.reference_revisions
       set status = 'active',
           activated_at = now(),
           reviewed_at = now(),
           reviewed_by = c_reviewer
     where id = v_new_id;
    insert into public.reference_revision_supersessions (revision_id, predecessor_id, action)
    values (v_new_id, v_legacy.id, 'superseded');
  end loop;
end;
$$;
