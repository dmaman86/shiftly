# Reference Data Backend: Architecture Proposal

Status: **proposal, not implemented**. Written 2026-10-20 against `main` at
`7e23e81` plus the uncommitted `apps/api` proof of concept.

Shiftly is an indicative calculator. Everything below exists to feed the
deterministic calculation engine (`packages/domain`) with **validated, versioned,
cited** reference data. AI researches and extracts; code validates, versions and
calculates.

---

## 1. Current architecture observations

Facts from the repository, with the files they come from.

### Calculation engine

- `packages/domain` is framework-free (`date-fns` is its only dependency) and runs
  **in the browser** through `apps/web`. The backend never calculates salary.
- Day classification is already Shiftly-owned:
  `DefaultHolidayCalculator` (`calculator/holiday.calculator.ts`) maps
  `weekday + CalendarEvent[]` to `WorkDayType` (`Regular`, `SpecialPartialStart`,
  `SpecialFull`). Shabbat and Friday come from the `Weekend` enum, not from
  Hebcal.
- `CalendarEvent { kind: CalendarEventKind; holidayKey?; knessetNumber? }` is the
  domain's calendar contract. **Hebcal does not leak into the domain today.**
- Election pay: `calculateElectionHours` adds 100% for regular work inside
  07:00–22:00 on a date found in `WorkDayMeta.calendarKnessetNumbers`.
- Reference values are **hardcoded inside calculators**, with "verify" notes:
  - `TimelinePerDiemCalculator` (eshel): 2015-11 → 29.5 … 2024-09 → 36.3.
  - `TimelineMealAllowanceCalculator` (economy): 2000-01 → {11.8, 17.1} …
    2024-09 → {14.5, 21.1}.
  - Both resolve by `year/month` and **return 0 when nothing applies**, so missing
    data is indistinguishable from a real zero.
- There is no income tax, national insurance or health logic in the domain yet.

### Calendar pipeline (web)

- `scripts/generate-calendar.ts` calls the Hebcal REST API (`buildHebcalUrl`,
  options `i, maj, mod, nx`) and writes `apps/web/public/calendar/{2015..2040}.json`.
  `@hebcal/core` is **not** a dependency.
- The same script **merges Knesset elections into the Hebcal files**
  (`mergeElectionItems`), so mutable data lives inside "deterministic" files.
- `apps/web/src/adapters/event.adapter.ts` validates the payload and maps
  Hebcal titles to `CalendarEvent` with `HOLIDAY_TITLE_RULES` (prefix match on
  the English title) plus `yomtov === true` as a paid-holiday fallback.
- `apps/web/src/hooks/useWorkDays.ts` loads the static file and falls back to the
  live Hebcal REST API. **That fallback has no election items**, so the election
  premium silently disappears for years served by the fallback.

### Elections

- `scripts/data/knesset-elections.json`: `{ knessetNumber, date }[]` plus two
  source URLs. No status, no history.
- `.github/workflows/knesset-elections.yml` checks Hebrew Wikipedia weekly and
  opens a **human-reviewed PR**. This is already a `pending_review → active`
  flow, with git as the store.

### Backend (`apps/api`, proof of concept, local only)

- Express 5 on Node 24, bound to 127.0.0.1, no auth.
- `POST /admin/income-tax/:year/rules`: Wikipedia wikitext → Gemma
  (`gemma-4-31b-it`, thinking HIGH) → zod + grounding validation → carry-forward.
- `POST /admin/social-security/:year/rules`: Kol Zchut revision as of a date,
  data templates rendered with their own revisions → Gemma → validation.
- Reusable pieces: `MediaWikiClient` (revision at a date), grounding checks,
  `RulesPipelineError` codes, `Extractor` port with a Gemma adapter, debug
  artifacts on disk.
- Known gaps:
  - No persistence.
  - The social-security extractor keeps only the current rate, losing intra-year
    changes (health 5.16% in January 2025 → 5.17% from February).
  - Kol Zchut's Cloudflare challenges Node's `fetch` (HTTP 403, `cf-mitigated:
    challenge`) but not Bun's. This must not be bypassed.

### Infrastructure

- `apps/web` is a static site on GitHub Pages (`ci.yml` deploy job).
- Supabase Postgres holds user data (`monthly_configs`, `work_days`, `shifts`)
  with RLS, and one edge function (`delete-account`).
- There is no always-on server. Any design that needs one is a new cost and a
  new operational burden.

### Calendar library evaluation

Both candidates were tested in a scratch environment against the current static
files, 2015–2040, through the same classification.

`@hebcal/core` (rejected):

- License: **GPL-2.0-or-later** for every published version. Shiftly is MIT, and
  bundling it into the browser build would distribute a GPL combined work.
- Bundle: about 165 KB minified and 55 KB gzip for the calendar API.
- Default options classify **Rosh Hashana LaBehemot (1 Elul) as a paid
  holiday**: 26 wrong days, because the prefix rule `"Rosh Hashana"` matches it.
  Excluding `flags.MINOR_HOLIDAY` gives 0 differences.

`jewish-date` (chosen; see [section 17](#17-deterministic-calendar-integration)):

- License MIT, no dependencies, about 1.1 KB gzip.
- It only converts Gregorian ↔ Hebrew dates. The holiday rules (15 fixed Hebrew
  dates plus the Yom HaAtzmaut weekday shift) are Shiftly code.
- **0 differences in day classification across 442 days.** The only mismatches
  were 26 Shavuot days whose `holidayKey` was missing in the current app (see
  below).

Existing bug found by the comparison: Hebcal's Israeli calendar titles the day
"Shavuot", but `HOLIDAY_TITLE_RULES` expected "Shavuot I". Shavuot was paid
through the `yomtov` fallback but had no `holidayKey`, so `DayRow` and `DayCard`
showed no label. Fixed together with the first implementation step.

---

## 2. Proposed module and folder structure

```
packages/domain/src/
  reference/                          # NEW: calculation-facing contract only
    reference-value.types.ts          # IncomeTaxRules, NationalInsuranceRules, HealthInsuranceRules,
                                      # EconomyAllowanceRates, EshelRate, KnessetElection
    reference-resolver.ts             # port: ReferenceResolver (sync, no I/O)
  calculator/perdiem/…                # timeline removed; rate comes from ReferenceResolver
  calculator/mealallowance/…          # same

apps/web/src/
  services/calendar/
    israeliHolidays.ts                # DONE: the ONLY file importing jewish-date
    electionCalendar.ts               # elections from reference data
  adapters/
    holiday.adapter.ts                # DONE: IsraeliHolidayFact → CalendarEvent (Shiftly mapping)
    event.adapter.ts                  # kept for elections until they leave the calendar files
  infrastructure/reference/
    reference-api.client.ts           # fetches month bundles; builds a ReferenceResolver

apps/api/src/
  reference-data/
    domain/                           # lifecycle rules; no Express, no SDKs
      reference-data-type.ts
      revision.ts                     # Revision entity + allowed transitions
      research-job.ts                 # ResearchJob entity + state machine
      provenance.ts                   # Source, SourceTier, Evidence, ProvenanceSummary
      period.ts                       # Period ("2026", "2026-09", "knesset:26")
    application/
      ports/                          # repositories, providers, clock, quota, logger
      definitions/                    # ReferenceDataDefinition<P> registry (OCP)
      use-cases/
        get-reference-data.ts
        request-research.ts           # atomic, idempotent enqueue
        run-research-job.ts           # worker step
        review-revision.ts            # approve, reject
        plan-refresh.ts               # RefreshPolicy sweep
    types/                            # one folder per data type: schema, validation,
      income-tax/                     # research strategy, refresh policy
      national-insurance/
      health-insurance/
      economy/
      eshel/
      knesset-election/
    infrastructure/
      postgres/                       # repositories, job queue, quota (SQL)
      ai/google-gemma.research-provider.ts
      sources/                        # mediawiki-client, wikipedia, kolzchut, gov-il, btl
      storage/                        # snapshots and traces (Supabase Storage)
    interfaces/
      http/                           # Express routes, DTO mappers
      worker/                         # job loop
  server.ts                           # HTTP composition root
  worker.ts                           # worker composition root
```

The current `apps/api/src/shared` modules move into `reference-data/domain`,
`application` and `infrastructure`. Nothing from the proof of concept is thrown
away.

---

## 3. Domain model

There are two domains, kept apart on purpose.

**Calculation domain (`packages/domain/src/reference`)**: what the engine
consumes.

```ts
export type IsoDate = string; // "YYYY-MM-DD"

export interface ReferenceValue<T> {
  readonly value: T;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
  readonly revisionId: string;
  /** No revision covers the date; the latest earlier one is used (indicative). */
  readonly carriedForward: boolean;
}

/** Synchronous so the engine stays deterministic and I/O-free. */
export interface ReferenceResolver {
  incomeTax(at: IsoDate): ReferenceValue<IncomeTaxRules> | undefined;
  nationalInsurance(at: IsoDate): ReferenceValue<NationalInsuranceRules> | undefined;
  healthInsurance(at: IsoDate): ReferenceValue<HealthInsuranceRules> | undefined;
  economy(at: IsoDate): ReferenceValue<EconomyAllowanceRates> | undefined;
  eshel(at: IsoDate): ReferenceValue<EshelRate> | undefined;
  knessetElections(year: number): readonly KnessetElection[];
}
```

`undefined` means "not available": the UI says so instead of calculating with
zero. This replaces today's silent `?? 0`.

**Reference-data domain (`apps/api/src/reference-data/domain`)**: the lifecycle.

```ts
export type ReferenceDataType =
  | "income_tax"
  | "national_insurance"
  | "health_insurance"
  | "economy"
  | "eshel"
  | "knesset_election";

export type RevisionStatus =
  | "discovered" // candidate produced by research, not validated yet
  | "validation_failed"
  | "pending_review" // valid, but needs a human (tier, history delta)
  | "verified" // approved, not yet in force (future date or awaiting a group)
  | "active" // in force for [effectiveFrom, effectiveTo]
  | "superseded" // replaced by a newer revision for the same period
  | "rejected";

export interface Revision<P> {
  readonly id: string;
  readonly type: ReferenceDataType;
  /** "" for timelines; "knesset:26" for elections. */
  readonly subjectKey: string;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
  /** 1, 2, … per (type, subjectKey, effectiveFrom). */
  readonly revision: number;
  readonly status: RevisionStatus;
  readonly payload: P;
  readonly payloadSchemaVersion: number;
  readonly provenance: ProvenanceSummary;
  readonly researchJobId: string | null;
  readonly createdAt: string;
}
```

Revision status and job status are **separate state machines**. `extracting` is a
job phase; `active` is a property of a value. Mixing them makes it impossible to
answer "is this value trusted?" without reading job logs.

---

## 4. Application interfaces (ports)

```ts
export interface RevisionRepository {
  findActive(type: ReferenceDataType, subjectKey: string, at: IsoDate): Promise<Revision<unknown> | null>;
  findLatestActiveBefore(type: ReferenceDataType, subjectKey: string, at: IsoDate): Promise<Revision<unknown> | null>;
  insertCandidate(candidate: NewRevision): Promise<Revision<unknown>>;
  /** One transaction: close/supersede the previous ranges, activate the new ones. */
  activate(revisionIds: readonly string[], reviewer: Reviewer): Promise<void>;
  setStatus(id: string, status: RevisionStatus, note?: string): Promise<void>;
}

export interface ResearchJobQueue {
  /** Atomic. Returns the existing live job when one exists (no duplicate). */
  enqueue(request: EnqueueRequest): Promise<{ job: ResearchJob; created: boolean }>;
  claimNext(workerId: string, lease: Duration): Promise<ResearchJob | null>;
  heartbeat(jobId: string, workerId: string): Promise<void>;
  complete(jobId: string, outcome: JobOutcome): Promise<void>;
  fail(jobId: string, error: JobError, retryAt: Date | null): Promise<void>;
  findLive(type: ReferenceDataType, period: Period): Promise<ResearchJob | null>;
}

export interface SourceRepository {
  /** Dedupes on (url, contentSha256). */
  upsert(source: FetchedSource): Promise<StoredSource>;
}

export interface ResearchProvider {
  research(request: ResearchRequest): Promise<ResearchResult>;
}

export interface DocumentFetcher {
  fetch(url: string, at?: Date): Promise<FetchedDocument>; // bytes, text, final URL, status
}

export interface ResearchQuota {
  /** Atomic reserve; false when a daily or monthly cap is reached. */
  tryReserve(kind: "job" | "llm_call"): Promise<boolean>;
}

export interface Clock { now(): Date }

export interface EventLogger { log(event: ResearchEvent): void } // structured, no secrets
```

---

## 5. ReferenceData abstractions (the extension point)

```ts
export interface ReferenceDataDefinition<P> {
  readonly type: ReferenceDataType;
  readonly payloadSchemaVersion: number;
  readonly payloadSchema: z.ZodType<P>;
  /** Normalizes a requested date to the research period, or null when unsupported. */
  readonly periodFor: (at: IsoDate) => Period | null;
  readonly research: ResearchStrategy<P>;
  readonly validation: ValidationPolicy<P>;
  readonly trust: SourceTrustPolicy;
  readonly refresh: RefreshPolicy;
  /** Types that must be researched and activated together. */
  readonly researchGroup?: ResearchGroupId;
}

export interface ResearchStrategy<P> {
  /** May return several candidates: one per effective date found. */
  research(period: Period, ctx: ResearchContext): Promise<readonly Candidate<P>[]>;
}
```

The registry is a `ReadonlyMap<ReferenceDataType, ReferenceDataDefinition<unknown>>`.
The worker, repositories, endpoints and quota code are generic over it. **No
`switch (type)` anywhere outside the registry.**

**Research groups.** `national_insurance` and `health_insurance` are separate
types, as requested, but one source section defines both, with the same
reduced-rate boundary and maximum insurable income. Researched separately, they
could activate a 2026 boundary for one and a 2025 boundary for the other. They
therefore share `researchGroup: "employee_contributions"`. One job produces both
candidates, validation cross-checks them, and `activate` switches both in one
transaction.

---

## 6. Payload schemas

All amounts are ILS per month; rates are decimal fractions (`0.0427` for 4.27%).
Field-level evidence lives in the `evidence` table keyed by `fieldPath`, not
inside the payload, so payloads stay clean domain values.

```ts
const rate = z.number().gt(0).lt(1);
const ils = z.number().int().positive();

export const incomeTaxPayload = z.strictObject({
  taxYear: z.number().int(),
  currency: z.literal("ILS"),
  incomeCategory: z.literal("employment"), // יגיעה אישית
  calculationBasis: z.literal("monthly"),
  documentRevision: z.string().optional(),
  monthlyBrackets: z
    .array(z.strictObject({ upperLimit: ils.nullable(), rate })) // null = open top bracket
    .min(5),
  monthlyCreditPointValue: ils,
});

const contributionThresholds = z.strictObject({
  reducedRateBoundary: ils, // 7,703 in 2026
  maxInsurableIncome: ils, // 51,910 in 2026
});

export const nationalInsurancePayload = z.strictObject({
  ...contributionThresholds.shape,
  employeeReducedRate: rate, // 0.0104
  employeeFullRate: rate, // 0.07
});

export const healthInsurancePayload = z.strictObject({
  ...contributionThresholds.shape,
  employeeReducedRate: rate, // 0.0323
  employeeFullRate: rate, // 0.0517
});

export const economyPayload = z.strictObject({
  allowanceType: z.literal("economy"),
  smallMealRate: z.number().positive(), // MealAllowanceRates.small
  largeMealRate: z.number().positive(), // MealAllowanceRates.large
});

export const eshelPayload = z.strictObject({
  allowanceType: z.literal("eshel"),
  pointValue: z.number().positive(), // today's rateA: tier A = 1 point, B = 2, C = 3
});

export const knessetElectionPayload = z.strictObject({
  knessetNumber: z.number().int().min(1),
  electionDate: z.iso.date(),
  status: z.enum(["planned", "confirmed", "occurred", "cancelled", "rescheduled"]),
  /** Set when status is "rescheduled": the date it replaced. */
  previousDate: z.iso.date().optional(),
});
```

Notes:

- **Credit point carried forward.** The 2026 brackets were published before the
  2026 credit point. The income-tax revision effective 2026-01-01 then holds the
  2025 value, with field evidence `basis: "carried_forward"`. When the 2026 value
  appears, revision 2 for the same `effectiveFrom` supersedes revision 1.
- **Elections are entities, not timelines.** `subjectKey = "knesset:26"`,
  `effectiveFrom` = the date the information became valid (the announcement).
  A move or a cancellation is a **new revision** of the same subject; the old
  revision becomes `superseded`, so history is never overwritten.
- **Occurred elections are frozen.** Once a revision has `status: "occurred"`,
  the refresh policy stops checking it and a new revision requires manual review.

---

## 7. Database tables and relationships

Schema `reference` in the existing Supabase Postgres.

```
reference.sources ──< reference.evidence >── reference.revisions >── reference.research_jobs
                                                                       │
                                     reference.research_artifacts ─────┤
                                     reference.research_job_events ────┘
reference.period_checks    (lastCheckedAt per type + period)
reference.quota_usage      (daily and monthly counters)
```

```sql
create schema reference;
create extension if not exists btree_gist;

create type reference.revision_status as enum
  ('discovered','validation_failed','pending_review','verified','active','superseded','rejected');
create type reference.job_status as enum
  ('pending','processing','succeeded','failed','dead');
create type reference.source_tier as enum
  ('tier1_official','tier2_official_mirror','tier3_trusted_secondary','tier4_general_web');

create table reference.research_jobs (
  id             uuid primary key default gen_random_uuid(),
  type           text not null,
  period_key     text not null,                    -- '2026', '2026-09', 'knesset:26'
  dedup_key      text generated always as (type || ':' || period_key) stored,
  reason         text not null check (reason in ('missing','stale','scheduled','manual')),
  status         reference.job_status not null default 'pending',
  phase          text,                             -- 'discovering','fetching','extracting','validating'
  attempts       int  not null default 0,
  max_attempts   int  not null default 4,
  run_after      timestamptz not null default now(),
  lease_until    timestamptz,
  locked_by      text,
  provider       text, model text,
  input          jsonb not null default '{}',      -- request metadata (no secrets)
  last_error     jsonb,                            -- { code, message, retryable }
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  started_at     timestamptz, completed_at timestamptz
);

create table reference.sources (
  id                 uuid primary key default gen_random_uuid(),
  url                text not null,
  final_url          text,
  title              text,
  publisher          text not null,
  source_type        text not null,               -- 'gov_page','gov_api','gov_pdf','mediawiki_revision','web_page'
  tier               reference.source_tier not null,
  license            text,
  upstream_revision  text,                         -- MediaWiki oldid, PDF ETag, Last-Modified
  content_sha256     text,
  snapshot_path      text,                         -- private Supabase Storage object
  http_status        int,
  accessible         boolean not null,
  retrieved_at       timestamptz not null,
  unique (url, content_sha256)
);

create table reference.revisions (
  id                     uuid primary key default gen_random_uuid(),
  type                   text not null,
  subject_key            text not null default '',
  effective_from         date not null,
  effective_to           date,
  revision               int  not null,
  status                 reference.revision_status not null,
  payload                jsonb not null,
  payload_schema_version int  not null,
  content_hash           text not null,
  provenance             jsonb not null,   -- officialSourceFound/Accessible, fallbackReason, bestTier
  validation             jsonb not null,   -- every check with its result
  research_job_id        uuid references reference.research_jobs(id),
  supersedes_id          uuid references reference.revisions(id),
  research_group_key     text,             -- 'employee_contributions:2026'
  created_at             timestamptz not null default now(),
  reviewed_at            timestamptz, reviewed_by text, review_note text,
  activated_at           timestamptz,
  unique (type, subject_key, effective_from, revision),
  check (effective_to is null or effective_to >= effective_from)
);

create table reference.evidence (
  id           uuid primary key default gen_random_uuid(),
  revision_id  uuid not null references reference.revisions(id) on delete cascade,
  field_path   text not null,               -- 'monthlyBrackets[3].rate', 'reducedRateBoundary'
  value_text   text not null,               -- '31%', '7,703' as written in the source
  quote        text not null,
  section      text,
  basis        text not null default 'stated' check (basis in ('stated','carried_forward','derived')),
  source_id    uuid not null references reference.sources(id),
  grounded     boolean not null             -- code found value_text inside the stored snapshot
);

create table reference.research_artifacts (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references reference.research_jobs(id) on delete cascade,
  kind         text not null,              -- 'llm_trace','grounding_metadata','search_results','rendered_source','error'
  storage_path text, inline jsonb, sha256 text,
  created_at   timestamptz not null default now()
);

create table reference.research_job_events (
  id         bigserial primary key,
  job_id     uuid not null references reference.research_jobs(id) on delete cascade,
  at         timestamptz not null default now(),
  event      text not null,                -- 'claimed','phase','provider_error','fallback_used','validated','failed'
  data       jsonb not null default '{}'   -- durations, codes, tiers; never prompts with secrets
);

create table reference.period_checks (
  type          text not null,
  period_key    text not null,
  last_checked_at timestamptz not null,
  last_outcome  text not null,             -- 'unchanged','new_revision','failed'
  primary key (type, period_key)
);

create table reference.quota_usage (
  bucket   text not null,                  -- 'jobs:2026-10-20', 'llm_calls:2026-10'
  used     int  not null default 0,
  primary key (bucket)
);
```

---

## 8. Constraints and indexes

```sql
-- Job deduplication: at most ONE live job per (type, period). Postgres decides.
create unique index research_jobs_one_live
  on reference.research_jobs (dedup_key)
  where status in ('pending','processing','failed');   -- 'failed' = retry scheduled

-- Claim queue.
create index research_jobs_claimable
  on reference.research_jobs (run_after)
  where status in ('pending','failed');

-- No two active revisions may overlap in time for the same subject.
alter table reference.revisions add constraint revisions_active_no_overlap
  exclude using gist (
    type with =, subject_key with =,
    daterange(effective_from, effective_to, '[]') with &&
  ) where (status = 'active');

-- Read path.
create index revisions_active_lookup
  on reference.revisions (type, subject_key, effective_from desc)
  where status = 'active';

-- Same data twice does not create a new revision.
create unique index revisions_same_content
  on reference.revisions (type, subject_key, effective_from, content_hash)
  where status not in ('rejected','validation_failed');
```

Atomic enqueue. A `SELECT` followed by an `INSERT` is never used:

```sql
insert into reference.research_jobs (type, period_key, reason, input)
values ($1, $2, $3, $4)
on conflict (dedup_key) where status in ('pending','processing','failed') do nothing
returning *;
-- No row returned → a live job exists; read it with the same dedup_key.
```

Atomic quota reservation, so concurrent requests cannot overshoot:

```sql
insert into reference.quota_usage (bucket, used) values ($1, 1)
on conflict (bucket) do update set used = reference.quota_usage.used + 1
  where reference.quota_usage.used < $2          -- the cap
returning used;                                   -- no row → cap reached
```

---

## 9. Research job lifecycle

```
             enqueue (atomic)
                   │
                   ▼
              ┌─pending─┐◄───────────── retry (run_after = backoff)
              │         │                         ▲
     claim (SKIP LOCKED, lease)                   │
              ▼                                   │
          processing ── phase: discovering → fetching → extracting → validating
              │  │                                │
              │  └─ retryable error ──────────► failed ── attempts ≥ max ──► dead
              │                                     (lease expiry also returns here)
              ▼
          succeeded   (with 0..n revisions: discovered / validation_failed / pending_review / verified)
```

| Error (existing `RulesPipelineErrorCode`) | Job transition |
| --- | --- |
| `source_unavailable`, `extraction_failed` (provider 429/5xx) | `failed`, backoff 1 min → 10 min → 1 h, then `dead` |
| `source_format_changed` | `dead` with an alert: a human has to fix the adapter |
| `extraction_unclear`, `invalid_extraction` | `succeeded`; the revision is `validation_failed`. Retrying cannot fix an ambiguous text. |
| `year_not_covered` | `succeeded` with no revision; `period_checks` records it |
| quota exhausted | `failed` with `run_after` = next quota window, no attempt consumed |

`dead` is the dead-letter state: it frees the dedup slot, so a later stale check
can create a new job, while keeping the failed job for inspection.

---

## 10. Worker design

```sql
-- claimNext: several workers never take the same job.
update reference.research_jobs j set
  status = 'processing', attempts = attempts + 1, locked_by = $1,
  lease_until = now() + $2::interval, started_at = coalesce(started_at, now()), updated_at = now()
where id = (
  select id from reference.research_jobs
  where (status in ('pending','failed') and run_after <= now())
     or (status = 'processing' and lease_until < now())   -- crashed worker
  order by run_after
  for update skip locked
  limit 1)
returning *;
```

- `interfaces/worker/job-loop.ts` claims, runs `run-research-job`, heartbeats
  every 60 s (extends the lease) and completes or fails. A `--drain` flag exits
  when the queue is empty.
- **Where it runs.** Not in Supabase Edge Functions: one Gemma run with thinking
  HIGH and retries already approaches their wall-clock limit. The options, in
  order:
  1. Locally (`bun apps/api/src/worker.ts --drain`), matching today's local-only
     use.
  2. A scheduled GitHub Actions workflow running `--drain` every 30 minutes,
     the same pattern as `knesset-elections.yml`, with `GEMINI_API_KEY` and
     the database URL as repository secrets.
  3. A small container, only if real traffic ever justifies it.
- The HTTP request never waits for research. It enqueues and returns 202.

---

## 11. AI provider abstraction

```ts
export interface ResearchRequest {
  readonly type: ReferenceDataType;
  readonly period: Period;
  readonly task: ResearchTask; // prompt, output JSON schema, promptVersion
  readonly knownSources: readonly SourceHint[]; // official URLs to prefer
}

export interface ResearchResult {
  /** URLs the provider found. Discovery output only: never trusted as evidence. */
  readonly discoveredSources: readonly DiscoveredSource[];
  readonly trace: ProviderTrace; // provider, model, attempts, durations, token counts
}

export interface ResearchProvider {
  research(request: ResearchRequest): Promise<ResearchResult>;
}

export interface ExtractionProvider {
  /** Reads text that OUR code fetched; returns candidate values with quotes. */
  extract(task: ExtractionTask, document: FetchedDocument): Promise<ExtractionResult>;
}
```

The split is deliberate. With a search tool, the model reads pages our code
never sees; grounding metadata lists URLs, not the exact text read. A value can
only be verified against bytes we stored. So discovery and extraction are two
ports, and only extraction output is ever validated. `ResearchProvider` can stay
a facade over both for callers that want one entry point.

Application code imports only these interfaces. `@google/genai` is imported in
exactly one folder, `infrastructure/ai`.

---

## 12. Gemma implementation

`GoogleGemmaResearchProvider` and `GoogleGemmaExtractionProvider` in
`infrastructure/ai`, built from today's `GemmaExtractor`:

- Model `gemma-4-31b-it`, `thinkingLevel: HIGH`, temperature 0.
- Discovery call: `googleSearch` tool enabled and **no** JSON schema; the
  response text is parsed for URLs, and `groundingMetadata` is stored as a
  `grounding_metadata` artifact. URLs are allowlisted by domain before fetching
  (see section 13).
- Extraction call: `responseJsonSchema`, no tools, the fetched document wrapped
  as today (`<source format=… title=…>`). Every field returns `{ value,
  quote, section }`.
- Retries: 3 attempts on 429/500/503 with backoff, inside one job attempt.
  `stripCodeFence` stays; invalid JSON is not retried.
- Every call goes through `ResearchQuota.tryReserve("llm_call")` first.
- `promptVersion` is stored on every revision (`revisions.validation.extraction`).

The custom tools explored before (`find_pdf_link`, `read_document_with_markitdown`)
become `DocumentFetcher` implementations that **our code** runs, not tools the
model calls. That keeps fetching deterministic and auditable.

---

## 13. Web-search and source extraction flow

```
for the requested (type, period):
  1. known adapters, by tier
     tier1  gov.il / btl.gov.il pages and PDFs (SourceHint list per type)
     tier3  Kol Zchut (revision at date), Hebrew Wikipedia (revision at date)
  2. if every known adapter fails → ResearchProvider.discover → URLs
       allowlist: *.gov.il, btl.gov.il, kolzchut.org.il, he.wikipedia.org, known payroll sites
       anything else → tier4, which can never auto-activate
  3. DocumentFetcher downloads → sources (sha256, snapshot, http_status, accessible)
       403 / challenge on an official URL → accessible = false, keep the URL,
       fallbackReason = "official_source_blocked", continue with the next tier
       (never spoof clients or solve challenges)
  4. ExtractionProvider reads the stored text → candidate fields with quotes
  5. validation (section 15) → revision status
```

**Source trust policy** (per definition, with this default):

| Best tier of grounded evidence | Outcome when every check passes |
| --- | --- |
| tier1, tier2 | `verified` → `active` automatically |
| tier3 | `verified` → `active` automatically, `provenance.indicativeFallback = true` |
| tier4 | `pending_review` always |
| any tier with a history warning | `pending_review` |

Tier 3 auto-activation matches the current product decision ("indicative,
public sources, cited"). A stricter definition, such as elections, can override
it.

---

## 14. Source provenance model

Four levels, each answering one question:

| Level | Table | Question |
| --- | --- | --- |
| Value | `revisions.payload`, `effective_from/to` | What is it, and for which period? |
| Field | `evidence` (`field_path`, `value_text`, `quote`, `section`, `basis`, `grounded`) | Why did we trust each number? |
| Document | `sources` (url, tier, publisher, license, upstream revision, sha256, snapshot, accessible) | Where did it come from? |
| Record | `revisions.provenance` | Was the official source found and accessible? Did we fall back? |

```ts
export interface ProvenanceSummary {
  readonly bestTier: SourceTier;
  readonly officialSourceFound: boolean;
  readonly officialSourceAccessible: boolean;
  readonly officialUrl?: string;
  readonly fallbackReason?: "official_source_blocked" | "official_source_not_found" | "official_source_unparseable";
  readonly indicativeFallback: boolean;
}
```

- Snapshots are required for tier 3 and 4. Wikipedia and Kol Zchut change; an
  `oldid` is enough for MediaWiki, a stored copy for everything else.
- Kol Zchut content is CC BY-NC-SA 2.5 IL: snapshots stay private, for audit
  only. Users get the citation and link.
- The audit trail (`research_artifacts`, `research_job_events`) is separate from
  provenance, so the read path never touches it.

---

## 15. Validation architecture

```ts
export interface ValidationPolicy<P> {
  readonly checks: readonly ValidationCheck<P>[];
}

export interface ValidationCheck<P> {
  readonly name: string;
  readonly stage: "schema" | "structure" | "history" | "evidence";
  /** "error" → validation_failed; "warning" → pending_review. */
  readonly severity: "error" | "warning";
  run(candidate: Candidate<P>, ctx: ValidationContext): CheckResult;
}
```

The generic runner executes every stage and stores **every** result in
`revisions.validation`, passed ones included.

| Stage | Generic checks | Type-specific examples |
| --- | --- | --- |
| 1 schema | zod `payloadSchema` | |
| 2 structure | valid dates, `effectiveFrom` inside the period | brackets strictly increasing with one open top bracket; rates in (0, 1); boundary < max income; elections: `previousDate` only when rescheduled |
| 3 history | compares with the previous active revision | credit point delta > 15% → warning (242 → 2420 never auto-activates); bracket rate change > 3 points → warning; boundary delta > 10% → warning |
| 4 evidence | every payload field has evidence; every evidence row is `grounded` in its stored snapshot; required provenance fields present | income tax: each bracket's limit and rate grounded in the same table row |

Group validation runs after the per-type checks:
`national_insurance.reducedRateBoundary === health_insurance.reducedRateBoundary`,
and the same for `maxInsurableIncome`.

The proof of concept's `appearsIn`, `percentAppearsIn` and consistency checks
become stage 2 and stage 4 checks unchanged.

---

## 16. Refresh-policy architecture

```ts
export interface RefreshContext {
  readonly now: Date;
  readonly period: Period;
  readonly latestActive: Revision<unknown> | null;
  readonly lastCheckedAt: Date | null;
}

export interface RefreshPolicy {
  /** Periods that should exist at `now` (e.g. the current and the next tax year). */
  periodsToWatch(now: Date): readonly Period[];
  shouldRefresh(input: RefreshContext): boolean;
}
```

| Policy | Types | Rule |
| --- | --- | --- |
| `AnnualPublicationPolicy` | income tax, national insurance, health | Daily from Dec 15 to Feb 15 (publication window), otherwise every 30 days. Monthly checks catch intra-year changes. |
| `AllowancePolicy` | economy, eshel | Every 90 days |
| `ElectionPolicy` | knesset election | `planned` or `confirmed`: weekly, daily within 60 days of the date; `occurred` or `cancelled`: never |
| none | Hebcal | Deterministic; not part of this system |

`plan-refresh` runs on a schedule, asks every policy, and enqueues through the
**same** `request-research` use case as a user request. Deduplication and quotas
apply to both, so they are tested once.

---

## 17. Deterministic calendar integration

Decision: `jewish-date` (MIT) for Gregorian ↔ Hebrew conversion, with the
Israeli holiday rules written in Shiftly. `@hebcal/core` was rejected for its
GPL license (section 1).

```
jewish-date (toJewishDate only)
    ↓ one file
services/calendar/israeliHolidays.ts      israeliHolidaysBetween(start, end) → IsraeliHolidayFact[]
    ↓ IsraeliHolidayFact { date, holiday: IsraeliHoliday }
adapters/holiday.adapter.ts               Shiftly decides paid vs partial (exhaustive Record)
    ↓ CalendarEvent { kind, holidayKey }
DefaultHolidayCalculator → WorkDayType    packages/domain (unchanged)
```

Rules:

1. **Only `israeliHolidays.ts` imports `jewish-date`.** The domain never sees
   Hebrew dates, only `CalendarEvent`.
2. The provider states when a holiday falls; it does not decide pay.
   `holiday.adapter.ts` maps each `IsraeliHoliday` through a
   `Record<IsraeliHoliday, CalendarEvent>`, so a new holiday cannot compile
   without a classification.
3. Holidays are identified by Hebrew date, never by display titles. That removes
   both title-matching bugs (Rosh Hashana LaBehemot, Shavuot).
4. Yom HaAtzmaut is 5 Iyar, moved to Thursday when 5 Iyar is Friday (4 Iyar) or
   Saturday (3 Iyar), and to Tuesday when it is Monday (6 Iyar). Yom HaZikaron is
   the day before. If the law changes, this one function changes, and the
   frozen oracle test shows exactly which past dates would move.
5. Only `toJewishDate` is used. It reads local year/month/day fields, and the
   provider builds dates at local noon, so results do not depend on the user's
   time zone. Tests run under three time zones. `toGregorianDate` is avoided: it
   builds from `new Date()` and only partly resets the time.
6. Elections come from their own provider, never from the holiday calendar, and
   are merged into the same `CalendarEventMap`.

---

## 18. Historical revision resolution algorithm

```ts
/** Pure. `active` holds the active revisions of one (type, subjectKey); they never overlap (DB constraint). */
export function resolveAt<P>(
  active: readonly Revision<P>[],
  at: IsoDate,
): { revision: Revision<P>; carriedForward: boolean } | null {
  const covering = active.find(
    (r) => r.effectiveFrom <= at && (r.effectiveTo === null || at <= r.effectiveTo),
  );
  if (covering) return { revision: covering, carriedForward: false };

  // Nothing covers `at`: use the latest earlier revision, flagged as indicative.
  const earlier = active
    .filter((r) => r.effectiveFrom <= at)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return earlier ? { revision: earlier, carriedForward: true } : null;
}
```

- With an open-ended latest revision (`effectiveTo = null`), the first branch
  covers every future date. `carriedForward` is then decided by the definition:
  for annual types, a date in a year after `taxYear` is carried forward and
  triggers a stale check.
- `activate()` maintains `effective_to`. When a new revision with
  `effectiveFrom = 2026-04-01` activates, the previous one gets
  `effectiveTo = 2026-03-31`, in the same transaction. The exclusion constraint
  rejects any overlap a bug might create.
- Example: A from 2026-01-01 and B from 2026-04-01. February resolves to A,
  September to B, and 2025-12-31 to whatever was active then.
- `superseded` revisions are kept. A past calculation can be reproduced by
  filtering on `activated_at <= T` (lightweight bitemporal). No migration needed.
- This replaces the duplicated `year/month` lookups in
  `TimelinePerDiemCalculator` and `TimelineMealAllowanceCalculator`.

---

## 19. REST endpoint design

Public (read and enqueue, rate limited):

```
GET  /v1/reference/{type}?at=YYYY-MM-DD
GET  /v1/reference/bundle?month=YYYY-MM        # every type for a month: one call per screen
GET  /v1/reference/revisions/{id}              # provenance + field evidence + sources
GET  /v1/research-jobs/{id}                    # status only
```

Admin (loopback now; authentication before any public deployment):

```
POST /admin/reference/{type}/research   { period }      → 202
POST /admin/reference/{type}/dry-run    { period }      → 200, nothing persisted (today's POST /admin/*/rules)
GET  /admin/revisions?status=pending_review
POST /admin/revisions/{id}/approve      { note }
POST /admin/revisions/{id}/reject       { note }
GET  /admin/research-jobs?status=dead
```

Since the site is static on GitHub Pages, the public read path can also be
served directly from Supabase: a read-only view of active revisions, RLS
`select` for `anon`, and a `security definer` RPC for enqueueing that applies the
same allowlist, period bounds and quotas. Same DTOs either way.

---

## 20. Error and status DTOs

```ts
type ReferenceDataResponse<T> =
  | {
      status: "available";
      type: ReferenceDataType;
      requestedPeriod: string;
      data: T;
      effectiveFrom: IsoDate;
      effectiveTo: IsoDate | null;
      revisionId: string;
      carriedForward: boolean;
      provenance: { bestTier: SourceTier; publisher: string; url: string; indicativeFallback: boolean };
    } // 200
  | { status: "pending" | "processing"; type: ReferenceDataType; requestedPeriod: string; jobId: string; retryAfterSeconds: number; message: string } // 202 + Retry-After
  | { status: "failed"; type: ReferenceDataType; requestedPeriod: string; jobId: string; message: string } // 200: the request worked; the research did not
  | { status: "unsupported"; type: string; requestedPeriod: string; message: string }; // 404

interface ErrorResponse {
  error: { code: "invalid_type" | "invalid_period" | "rate_limited" | "quota_exhausted" | "internal"; message: string };
} // 400, 429, 503, 500
```

- `available` with `carriedForward: true` is returned instead of 202 whenever an
  earlier revision exists. A stale-check job is enqueued in the background. The
  202 is reserved for "nothing at all yet".
- `failed` keeps the last error code internal; users see a generic message.
- `unsupported` is returned for periods outside the definition's range
  (2015–2041, matching the calendar range) **without** creating a job.

---

## 21. Security and rate limits

| Control | Where | Default |
| --- | --- | --- |
| Type allowlist | `periodFor` / registry lookup | 400 for unknown types |
| Period bounds | `periodFor` | 2015 … current year + 1; anything else 404 without a job |
| Period normalization | `periodFor` | Every date in 2026 maps to period `2026`, so `?at=` variations cannot create jobs |
| Deduplication | unique partial index | one live job per `dedup_key` |
| Daily and monthly job caps | `quota_usage` | 20 jobs per day, 200 per month |
| LLM call caps | `quota_usage` | 60 calls per day |
| Per-IP rate limit | HTTP middleware | 30 req/min on `/v1/reference*`, 5 enqueues per hour |
| Kill switch | env `RESEARCH_ENABLED=false` | enqueue returns `pending` but the worker skips |
| No AI exposure | architecture | No endpoint forwards user text to a model; prompts are code |
| Secrets | env only on worker and admin | `GEMINI_API_KEY` never in the web bundle or logs |
| Admin | loopback today; token or Supabase auth before any public deployment | |

Quota exhaustion degrades to "data not available yet", never to an unbounded
bill.

---

## 22. Testing strategy

| Layer | Tests |
| --- | --- |
| Domain (`packages/domain`) | Golden tests: injecting today's hardcoded timelines through `ReferenceResolver` produces byte-identical month results. `undefined` reference → explicit "unavailable", not zero. |
| Holiday calendar | **Parity test** (done): `israeliHolidaysBetween` + `holiday.adapter` equal the frozen oracle `apps/web/src/test/fixtures/israeli-holidays-2015-2040.json` (442 days), taken from the static files before their removal. Weekday-shift cases for Yom HaAtzmaut; Rosh Hashana LaBehemot is not a holiday; runs under three time zones. |
| Definitions | Per type: schema, structure, history and evidence checks against recorded fixtures (the existing Wikipedia and Kol Zchut fixtures), including the January vs February 2025 health split. |
| Resolution | `resolveAt` table tests: inside range, boundary days, gaps, carried forward, superseded ignored. |
| SQL | Against Supabase local (`supabase start`): 20 concurrent `enqueue` calls → 1 job; overlapping activation rejected by the exclusion constraint; quota never exceeds the cap under concurrency. |
| Worker | Fake `ResearchProvider`, `ExtractionProvider` and `DocumentFetcher`: lease expiry reclaims, retry backoff, `dead` after max attempts, quota exhaustion does not consume attempts. |
| HTTP | 200, 202, `failed` and `unsupported` DTOs; rate limiting; unknown type; out-of-range period creates no job. |
| Live (manual, never in CI) | Existing scratch scripts, renamed into `apps/api/scripts/live-*.ts`. |

---

## 23. Migration plan from the current implementation

| Today | Becomes |
| --- | --- |
| `apps/web/public/calendar/*.json` + `scripts/generate-calendar.ts` + `services/hebcal` | `israeliHolidaysBetween` + `holiday.adapter` (added, parity proven); the files, the generator and the Hebcal REST client are deleted once the app is switched |
| Elections merged into the calendar files | `ElectionCalendarProvider`. Interim: imports `scripts/data/knesset-elections.json` (moved to `packages/reference-seed`); later, the reference API |
| `useWorkDays` REST fallback without elections | Removed; the provider is local and cannot be "unavailable" |
| `knesset-elections.yml` PR flow | Kept until elections live in the DB; then it becomes an `ElectionPolicy` job with `pending_review` |
| Hardcoded eshel and economy timelines | Seed revisions (`active`, tier3/manual provenance, `basis: "stated"`, note "provisional" where the code says so); calculators read `ReferenceResolver` |
| `POST /admin/income-tax/:year/rules`, `/social-security/:year/rules` | `ResearchStrategy` implementations plus the `dry-run` admin endpoint |
| `.artifacts/` on disk | `research_artifacts` + private Storage |
| `IncomeTaxRulesResult`, `SocialSecurityRulesResult` | Candidates → revisions; `Resolved<T>` becomes `ReferenceValue<T>` |
| `parse5` in `apps/api` dependencies | Removed if still unused (left over from the PDF pipeline) |

---

## 24. Recommended implementation phases

| Phase | Scope | Exit criterion |
| --- | --- | --- |
| **1** | Calendar: `israeliHolidays` provider and `holiday.adapter` (done); election provider from the registry; switch `useWorkDays`; delete the static JSON files, the generator, the Hebcal REST client and fallback | Parity test green; e2e unchanged |
| **2** | Domain: `ReferenceResolver` and value types; eshel and economy timelines move out of the calculators into a seed resolver | Golden tests byte-identical; "unavailable" instead of zero |
| **3** | DB: `reference` schema, repositories, seeded revisions, read endpoints / Supabase view | Web reads eshel and economy from the DB; resolution tests green |
| **4** | Jobs: queue, worker, quotas; income tax and employee contributions as `ResearchStrategy` | Concurrency tests green; one live run produces `active` revisions with evidence |
| **5** | Refresh policies, scheduled `plan-refresh`, observability dashboard queries | Stale checks run within quota |
| **6** | Elections into the DB with statuses and history; retire the PR workflow | Move/cancel scenarios covered |
| **7** | `ResearchProvider` web-search discovery for tier 1 sources | Never auto-activates tier 4 |

### Smallest safe first step (done)

Phase 1, step 1: `jewish-date@2.0.29`, `israeliHolidaysBetween`,
`buildHolidayEventMap`, the frozen oracle fixture and the parity test, plus the
Shavuot title fix in `event.adapter.ts`. The app was not switched and nothing
was deleted.

### Next step

Phase 1, step 2: an election provider that reads
`scripts/data/knesset-elections.json` directly, a composite that merges holidays
and elections into one `CalendarEventMap`, and `useWorkDays` switched to it.
Then delete `apps/web/public/calendar/`, `scripts/generate-calendar.ts`,
`services/hebcal`, `services/calendar/calendar.service.ts`, the REST fallback,
`static-calendar.test.ts` and the merge step of the election scripts. The
election workflow then updates only the registry.
