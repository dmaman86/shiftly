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
├── routes/         Express routers: parse the request, call a service or repository, answer
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
cli, server ──▶ app ──▶ middleware, routes ──▶ services ──▶ ports ◀── repositories
```

- `services/` and `ports/` never import Express or the Supabase SDK.
- `repositories/` implement the ports; they are the only code that talks to Supabase.
- User-owned tables (`monthly_configs`, `work_days`, `shifts`) and `api_*`
  functions are reached only through `repositories/user-scope.ts`, which pins
  every query to the verified caller. ESLint enforces it.
- Route handlers stay thin. A `controllers/` layer is not used: handlers are a
  few lines each, so a separate layer would only add indirection.

## Commands

| Command                                   | What it does                                     |
| ----------------------------------------- | ------------------------------------------------ |
| `bun run dev`                             | Runs the API with file watching                  |
| `bun run test`                            | API tests (Vitest)                               |
| `bun run typecheck`                       | Type check sources and tests                     |
| `bun run election:record`                 | Records a Knesset election with its evidence     |
| `bun run election:activate`               | Publishes a recorded election                    |
| `bun run reference:activate`              | Publishes a reviewed reference-data revision     |
| `bun run reference:research:contributions` | Researches social-security contribution rates  |

## Environment

`config/local-env.ts` loads `apps/api/.env` first, then the repository's
`.env.local`, for the server and the admin commands alike. The first file that
defines a variable wins, and variables already set (the shell, Cloud Run) are
never overridden. `config/env.ts` validates them; errors name the variables,
never their values. Secrets are backend only: never give them a `VITE_` prefix.

| Variable                             | Required                     | Default                | Purpose                                                                 |
| ------------------------------------ | ---------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `SUPABASE_URL`                       | Yes                          |                        | Supabase project URL; same as the web app's `VITE_SUPABASE_URL`         |
| `SUPABASE_PUBLISHABLE_KEY`           | Server                       |                        | `sb_publishable_...`; only verifies access tokens                       |
| `SUPABASE_SECRET_KEY`                | Yes                          |                        | `sb_secret_...`; bypasses RLS (roles, reference data, user data)        |
| `GEMINI_API_KEY`                     | Server                       |                        | Google AI Studio key for the research pipelines                         |
| `CORS_ALLOWED_ORIGINS`               | In production                | none                   | Browser origins, comma separated, no trailing slash                     |
| `SUPABASE_USER_DATA_SECRET_KEY`      | No                           | `SUPABASE_SECRET_KEY`  | Separate key for user-owned data, so it can be rotated alone            |
| `REFERENCE_DATA_PERSISTENCE_ENABLED` | No                           | `false`                | Store research results as pending revisions instead of only returning them |
| `GEMINI_MODEL`                       | No                           | `gemma-4-31b-it`       | Model used by the research pipelines                                    |
| `ARTIFACTS_DIR`                      | No                           | `apps/api/.artifacts`  | Debug artifacts of the research pipelines                               |
| `HOST`, `PORT`                       | No                           | `127.0.0.1`, `3000`    | Listen address; the container sets `0.0.0.0:8080`                       |

"Server" means `server.ts` requires it; the admin commands need only
`SUPABASE_URL` and `SUPABASE_SECRET_KEY` (and `--store` for
`reference:research:contributions`).
