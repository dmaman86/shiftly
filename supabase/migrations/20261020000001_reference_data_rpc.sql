-- Atomic writes for reference data.
-- Apply with the Supabase CLI: supabase db push.
--
-- Separate requests from the backend could leave a revision without its
-- evidence, or two active values for the same period. Each function runs in
-- one transaction, so it either completes or changes nothing.
--
-- Only service_role (the backend's secret key) may execute them.

-- Stores a validated candidate with every source its research looked at and
-- the evidence behind it. It never activates it. Idempotent: the same value
-- for the same kind and period returns the existing pending or active revision.
--
-- p_sources:  [{ url, finalUrl, publisher, tier, discoveredVia, accessStatus,
--               httpStatus, contentType, title, sha256, grounding,
--               fetchAttemptedAt, role: 'supporting' | 'consulted' }]
-- p_evidence: [{ evidenceType, source (0-based index into p_sources, or null),
--               carriedFromRevisionId, quote, section, sourceReference, page,
--               effectiveFrom, grounding, note }]
create function public.insert_reference_candidate(
  p_kind text,
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

  select id into v_revision_id
    from public.reference_revisions
   where kind = p_kind
     and valid_from = p_valid_from
     and valid_to is not distinct from p_valid_to
     and value = p_value
     and status in ('pending_review', 'active')
   limit 1;
  if v_revision_id is not null then
    return v_revision_id;
  end if;

  insert into public.reference_revisions (
    kind, valid_from, valid_to, value, origin, trust, fallback_reason
  )
  values (p_kind, p_valid_from, p_valid_to, p_value, p_origin, p_trust, p_fallback_reason)
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

-- Activates a pending revision. Active revisions of the same kind that
-- overlap it are handled like this, and each one is recorded:
--   * one that starts earlier stays active but now ends the day the new one starts (closed);
--   * one that the new period fully covers is replaced (superseded);
--   * anything that would need splitting stops the call: resolve it by hand.
create function public.activate_reference_revision(
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

  for v_old in
    select *
      from public.reference_revisions
     where kind = v_new.kind
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

  update public.reference_revisions
     set status = 'active',
         activated_at = now(),
         reviewed_at = now(),
         reviewed_by = p_reviewer
   where id = p_revision_id;
end;
$$;

revoke execute on function public.insert_reference_candidate(text, date, date, jsonb, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.insert_reference_candidate(text, date, date, jsonb, text, text, text, jsonb, jsonb)
  to service_role;

revoke execute on function public.activate_reference_revision(uuid, text)
  from public, anon, authenticated;
grant execute on function public.activate_reference_revision(uuid, text)
  to service_role;
