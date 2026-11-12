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
| `bun run reference:research:contributions` | Researches social-security contribution rates                 |

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
