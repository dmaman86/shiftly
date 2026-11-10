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

The admin commands read the secret key from `apps/api/.env` or the root
`.env.local`; it never reaches the web app.
