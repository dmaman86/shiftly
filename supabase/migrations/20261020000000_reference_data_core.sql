-- Versioned reference data (tax brackets, per diem, meal allowance, elections)
-- researched by Gemma + Google Search and validated by apps/api.
-- Apply with the Supabase CLI: supabase db push.
--
-- Only the backend uses these tables, with the secret key (service_role,
-- which bypasses RLS). RLS is enabled with no policies, and table privileges
-- are revoked, so anon and authenticated clients can neither read nor write.
--
-- Everything is append-only: a corrected value is a new revision, and
-- sources, evidence and links are never edited or deleted.

create extension if not exists btree_gist with schema extensions;

-- One source as observed by one research run: found through search grounding,
-- a known official URL, or the model's answer text; fetched by the backend or
-- not. A blocked official page is kept, so "official source found but
-- inaccessible" stays provable.
create table public.reference_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  final_url text,
  publisher text not null,
  tier smallint not null check (tier between 1 and 4),
  discovered_via text not null
    check (discovered_via in ('known_source', 'grounding_metadata', 'response_text', 'manual')),
  access_status text not null check (
    access_status in ('not_fetched', 'fetched', 'blocked', 'not_found', 'unavailable', 'unsupported_content')
  ),
  http_status smallint,
  content_type text,
  title text,
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  -- Search metadata worth keeping: queries, grounding chunk title, redirect URI.
  grounding jsonb,
  discovered_at timestamptz not null default now(),
  fetch_attempted_at timestamptz,
  -- A content hash exists exactly when the backend downloaded the content.
  check ((access_status = 'fetched') = (sha256 is not null)),
  check (access_status <> 'fetched' or (final_url is not null and http_status is not null)),
  check ((access_status = 'not_fetched') = (fetch_attempted_at is null))
);

-- The same bytes from the same URL are one fetched source.
create unique index reference_sources_content_idx
  on public.reference_sources(final_url, sha256)
  where sha256 is not null;

-- One value of one kind for one period: [valid_from, valid_to), where a null
-- valid_to means "until further notice".
create table public.reference_revisions (
  id uuid primary key default gen_random_uuid(),
  -- e.g. 'income_tax.monthly_brackets', 'per_diem.rate_a', 'calendar.knesset_election'
  kind text not null check (kind ~ '^[a-z_]+(\.[a-z_]+)*$'),
  valid_from date not null,
  valid_to date,
  value jsonb not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'active', 'superseded', 'rejected')),
  origin text not null check (origin in ('seed', 'research', 'manual')),
  -- Confidence in the value as a whole; each source keeps its own tier.
  trust text not null check (
    trust in (
      'official_verified', 'official_grounded',
      'secondary_verified', 'secondary_grounded',
      'carried_forward', 'legacy_seed', 'manual'
    )
  ),
  -- Why the value does not come from an official source.
  fallback_reason text check (
    fallback_reason in ('official_source_blocked', 'official_source_not_found', 'official_source_insufficient')
  ),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  activated_at timestamptz,
  check (valid_to is null or valid_to > valid_from),
  check (status <> 'active' or activated_at is not null),
  check ((trust in ('secondary_verified', 'secondary_grounded')) = (fallback_reason is not null)),
  check ((origin = 'seed') = (trust = 'legacy_seed')),
  -- Two active values of the same kind can never cover the same day.
  constraint reference_revisions_active_no_overlap exclude using gist (
    kind with =,
    daterange(valid_from, valid_to, '[)') with &&
  ) where (status = 'active')
);

create index reference_revisions_kind_status_idx
  on public.reference_revisions(kind, status, valid_from);

-- Every source a revision's research looked at. 'supporting' sources back its
-- evidence; 'consulted' ones were tried but not used (blocked, insufficient).
create table public.reference_revision_sources (
  revision_id uuid not null references public.reference_revisions(id),
  source_id uuid not null references public.reference_sources(id),
  role text not null check (role in ('supporting', 'consulted')),
  primary key (revision_id, source_id)
);

create index reference_revision_sources_source_idx
  on public.reference_revision_sources(source_id);

-- What supports a value. Only 'fetched_verified' means the quote was found in
-- bytes the backend downloaded; grounded evidence relies on search grounding.
create table public.reference_evidence (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.reference_revisions(id),
  evidence_type text not null check (
    evidence_type in ('fetched_verified', 'grounded', 'trusted_secondary_grounded', 'carried_forward', 'manual')
  ),
  -- Derived, so it can never contradict evidence_type.
  locally_verified boolean generated always as (evidence_type = 'fetched_verified') stored,
  source_id uuid references public.reference_sources(id),
  carried_from_revision_id uuid references public.reference_revisions(id),
  quote text check (quote is null or length(quote) >= 12),
  section text,
  source_reference text,
  page integer check (page > 0),
  effective_from date,
  -- What search grounding tied to this claim: support segment, chunk indices, confidence.
  grounding jsonb,
  note text,
  created_at timestamptz not null default now(),
  check (
    evidence_type not in ('fetched_verified', 'grounded', 'trusted_secondary_grounded')
    or (source_id is not null and quote is not null)
  ),
  check ((evidence_type = 'carried_forward') = (carried_from_revision_id is not null)),
  check (evidence_type <> 'manual' or note is not null or quote is not null)
);

create index reference_evidence_revision_idx on public.reference_evidence(revision_id);
create index reference_evidence_source_idx on public.reference_evidence(source_id);

-- What an activation did to each active revision it overlapped: 'closed' ends
-- an earlier one the day the new one starts; 'superseded' replaces one fully.
create table public.reference_revision_supersessions (
  revision_id uuid not null references public.reference_revisions(id),
  predecessor_id uuid not null references public.reference_revisions(id),
  action text not null check (action in ('closed', 'superseded')),
  created_at timestamptz not null default now(),
  primary key (revision_id, predecessor_id),
  check (revision_id <> predecessor_id)
);

-- Revisions: values, periods and provenance never change. Only the review
-- fields change, valid_to when a newer revision closes the period, and the
-- status along pending_review -> active | rejected, active -> superseded.
create function public.reference_revisions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'reference revisions are never deleted; reject or supersede %', old.id;
  end if;
  if new.kind is distinct from old.kind
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

create trigger reference_revisions_guard
  before update or delete on public.reference_revisions
  for each row execute function public.reference_revisions_guard();

create function public.reference_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger reference_sources_append_only
  before update or delete on public.reference_sources
  for each row execute function public.reference_append_only();
create trigger reference_revision_sources_append_only
  before update or delete on public.reference_revision_sources
  for each row execute function public.reference_append_only();
create trigger reference_evidence_append_only
  before update or delete on public.reference_evidence
  for each row execute function public.reference_append_only();
create trigger reference_revision_supersessions_append_only
  before update or delete on public.reference_revision_supersessions
  for each row execute function public.reference_append_only();

alter table public.reference_sources enable row level security;
alter table public.reference_revisions enable row level security;
alter table public.reference_revision_sources enable row level security;
alter table public.reference_evidence enable row level security;
alter table public.reference_revision_supersessions enable row level security;

-- Supabase grants new public tables to anon and authenticated by default.
revoke all on
  public.reference_sources,
  public.reference_revisions,
  public.reference_revision_sources,
  public.reference_evidence,
  public.reference_revision_supersessions
from anon, authenticated;
