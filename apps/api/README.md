# @shiftly/api

Express 5 on Node 24, deployed to Cloud Run. Node runs the TypeScript sources
directly (type stripping), so there is no build step.

## Layout

```
src/
├── server.ts       Cloud Run entrypoint: reads config, builds adapters, listens
├── app.ts          HTTP composition: middleware order and route mounting
├── config/         Environment parsing
├── middleware/     CORS, JSON body, request log, authentication
├── routes/         Express routers: path, method and middleware → controller handler
├── controllers/    Request handlers: validate the request, call a service or repository, answer
├── services/       Business rules: month periods, election and timeline activation, published data
├── ports/          Interfaces the services depend on (auth, reference-data revisions)
├── repositories/   Supabase adapters: UserScope, user-data tables, revisions, Auth admin
├── errors/         Errors shared across layers (UserDataError and its HTTP mapping)
├── research/       Reference-data research pipelines: income tax, social security, shared tooling
└── cli/            Admin commands run by hand (election:record, election:activate, ...)
```

## Dependency rule

Arrows point from the caller to what it may import:

```
cli, server ──▶ app ──▶ middleware, routes ──▶ controllers ──▶ services ──▶ ports ◀── repositories
```

- `services/` and `ports/` never import Express or the Supabase SDK.
- `repositories/` implement the ports; they are the only code that talks to Supabase.
- User-owned tables (`monthly_configs`, `work_days`, `shifts`) and `api_*`
  functions are reached only through `repositories/user-scope.ts`, which pins
  every query to the verified caller. ESLint enforces it.
- Routers only map a path, a method and its middleware to a handler, so each
  one reads as an index of its routes. Handlers live in `controllers/`.
- A controller is a factory that receives its dependencies
  (`shiftsController(access)`) and returns its handlers. Handlers never import
  a singleton, so `createApp(deps)` and the tests keep injecting fakes.

## Commands

| Command                                    | What it does                                                  |
| ------------------------------------------ | ------------------------------------------------------------- |
| `bun run dev`                              | Runs the API with file watching                               |
| `bun run test`                             | API tests (Vitest)                                            |
| `bun run typecheck`                        | Type check sources and tests                                  |
| `bun run election:record`                  | Records a Knesset election with its evidence                  |
| `bun run election:activate`                | Publishes a recorded election                                 |
| `bun run reference:activate`               | Publishes a reviewed reference-data revision                  |
| `bun run reference:research`               | Plans or explicitly executes unified monthly/subject research |
| `bun run reference:research:contributions` | Retired; exits with a migration hint and performs no research |

## Environment

`config/local-env.ts` loads `apps/api/.env` first, then the repository's
`.env.local`, for the server and the admin commands alike. The first file that
defines a variable wins, and variables already set (the shell, Cloud Run) are
never overridden. `config/env.ts` validates them; errors name the variables,
never their values. Secrets are backend only: never give them a `VITE_` prefix.

| Variable                             | Required                   | Default               | Purpose                                                                            |
| ------------------------------------ | -------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `SUPABASE_URL`                       | Yes                        |                       | Supabase project URL; same as the web app's `VITE_SUPABASE_URL`                    |
| `SUPABASE_PUBLISHABLE_KEY`           | Server                     |                       | `sb_publishable_...`; only verifies access tokens                                  |
| `SUPABASE_SECRET_KEY`                | Yes                        |                       | `sb_secret_...`; bypasses RLS (roles, reference data, user data)                   |
| `GEMINI_API_KEY`                     | Unified research execution |                       | Google AI Studio key; not required by the HTTP server                              |
| `CORS_ALLOWED_ORIGINS`               | In production              | none                  | Browser origins, comma separated, no trailing slash                                |
| `SUPABASE_USER_DATA_SECRET_KEY`      | No                         | `SUPABASE_SECRET_KEY` | Separate key for user-owned data, so it can be rotated alone                       |
| `REFERENCE_DATA_PERSISTENCE_ENABLED` | No                         | `false`               | Retained compatibility setting; unified CLI ignores it and never stores candidates |
| `REFERENCE_RESEARCH_ENABLED`         | No                         | `false`               | Explicit opt-in to unified model execution; not needed for planning                |
| `GEMINI_MODEL`                       | No                         | `gemma-4-31b-it`      | Model used by the research pipelines                                               |
| `ARTIFACTS_DIR`                      | No                         | `apps/api/.artifacts` | Debug artifacts of the research pipelines                                          |
| `HOST`, `PORT`                       | No                         | `127.0.0.1`, `3000`   | Listen address; the container sets `0.0.0.0:8080`                                  |

"Server" means `server.ts` requires it. Administrative reference commands need
`SUPABASE_URL` and `SUPABASE_SECRET_KEY`; unified `--execute` additionally requires
research credentials and explicit execution opt-in. Planning makes no model call.

## Monthly income tax research

From the repository root, plan one exact month and the required parameters:

```sh
bun run --cwd apps/api reference:research --domain income-tax --year 2026 --month 2 --parameters income_tax.monthly_brackets,income_tax.credit_point --plan
```

`--execute` instead of `--plan` is an explicit paid model request, only when
`REFERENCE_RESEARCH_ENABLED=true`; no execution is enabled by this PR. There is
one model invocation per task, no implicit retries and no multi-month batching.
The CLI persists attempt bookkeeping but **never candidate revisions**; it returns
validated candidates for inspection. It has no `--store` option. Candidate insertion
is covered through the shared executor/store with mocks; operational persistence
and scheduling remain separate work. Research never activates a revision.

The response echoes `year`, `month` and the requested parameters. Findings retain
their real effective dates (inclusive start, exclusive end), including both
intervals of any mid-month change. A month is a request unit, not a revision unit.
Coverage uses active evidenced intervals; pending candidates suppress duplicate
work while awaiting human review. Quarterly freshness is separate from monthly
granularity, and missing historical coverage is researched explicitly.

The old `POST /admin/income-tax/:year/rules` and `.../:year/research` endpoints
return `410 research_route_retired` after the existing admin/session checks.
Use the monthly CLI instead. Public election and rate timelines, authentication,
CRUD and deterministic calculations do not depend on the research provider.

## Monthly NI/Health research

Use the same unified command, with one exact month and the required subset of
these six existing kinds:

- `social_security.reduced_rate_boundary`: `{amount}`
- `social_security.max_insurable_income`: `{amount}`
- `national_insurance.employee_reduced_rate`: `{rate}`
- `national_insurance.employee_standard_rate`: `{rate}`
- `health_insurance.employee_reduced_rate`: `{rate}`
- `health_insurance.employee_standard_rate`: `{rate}`

```sh
bun run --cwd apps/api reference:research --domain contributions --year 2026 --month 2 --parameters health_insurance.employee_reduced_rate,health_insurance.employee_standard_rate --plan
```

The population is an Israeli resident ordinary salaried employee aged 18 to
retirement age, not a controlling shareholder. Amounts are monthly whole ILS;
rates are decimal fractions. Shared thresholds are not duplicated under the two
insurance domains. Coverage begins November 2015, but already verified history is
skipped. Missing periods are researched as explicit single-month tasks, never a
full-history crawl or grouped annual snapshots.

The recurring freshness policy is 30 days, independent of the monthly request
unit; unsuccessful attempts have a 30-day cooldown. A mid-month Health change
creates only that kind's changed interval, not copies of unchanged NI parameters.
Derived totals-minus-parts values remain unresolved. Cross-parameter checks compare
only provider-attributed findings whose real effective periods overlap.

The old `reference:research:contributions` command, including `--store`, exits with
`research_command_retired` and a migration hint. It no longer fetches BTL, Wayback
or Kol Zchut or writes candidates. Use unified `reference:research` with explicit
`--year`, `--month`, `--parameters` and `--plan`/`--execute`. The execution opt-in and
non-persistent candidate behavior described above also apply to this domain.

## Monthly allowance research

The `allowances` domain researches the existing `per_diem.point_rate` `{amount}`
and `meal_allowance.rates` `{small,large}` kinds without changing web DTOs or domain
calculators. The rate-family mapping comes from `VALIDATION.md`: civil-service duty
category A for the per-diem point; third-shift category 26.284 for `small`; ordinary
overtime category 26.282 for `large`. Payroll code 1700 alone is ambiguous because
it also appears in the separate no-meal-agreement category. These reference rates
do not establish that every employer or employee is entitled to the allowance.

```sh
bun run --cwd apps/api reference:research --domain allowances --year 2026 --month 2 --parameters per_diem.point_rate,meal_allowance.rates --plan
```

Requests are one exact month, with optional grouping of these two kinds, never
multiple months. Current freshness is 90 days; unresolved attempts cool down for
30 days. Historical coverage starts November 2015 and evidenced covered history
is skipped; provisional baseline values are not evidence.

Both meal amounts and their common effective interval must be supported in each
finding. One supported member is insufficient; the other is never silently copied
from stored data. A real change to one member produces one updated pair revision,
not separate new kinds or monthly copies. Quotations must disambiguate source
categories and amounts; flattened/ambiguous tables remain unresolved.

**Compatibility limitation:** the existing published allowance timelines and
calculators require first-of-month validity boundaries. Research must not round an
actual intramonth change. Such findings remain unresolved until a separate consumer
change is approved; neither calculators nor activation validation are weakened here.
The administrative result includes `unresolved` validation/missing-period diagnostics
when present. These may contain unverified provider explanations; they are not
published evidence or stored as reference values.

Unlike PR C/D, PR D2 includes a migration to extend the allowed attempt domains and
the backend-only claim RPC. Apply it to the intended database after reviewing the
normal migration workflow, before enabling execution. It does not modify active
references or enable persistence. The unified CLI continues to return candidates
without storing them, and activation remains a separate human action.
