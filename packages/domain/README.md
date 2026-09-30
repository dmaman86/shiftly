# @shiftly/domain

The private TypeScript payroll calculation engine used by Shiftly Web.
It is compiled to ESM JavaScript and declarations with TypeScript, without a
React dependency or browser globals.

## Public API

```ts
import { buildPayMapPipeline } from "@shiftly/domain";

const engine = buildPayMapPipeline();
```

Consume the package root, not its internal source paths. The factory provides
shift/day/month calculations, reducers, timeline classification, calendar
classification and historical rate policies. Web adapters own month selection,
localized day labels, HTTP contracts and persistence.

The existing date contract uses local wall-clock `Date` fields and the
`Asia/Jerusalem` work timezone for persisted-instant conversion. Tests set the
process timezone to `Asia/Jerusalem` for parity. Consumers must preserve this
contract; extraction does not redefine timezone or DST semantics.

## Workspace commands

Run from the repository root:

```bash
bun install
bun run domain:build
bun run --cwd packages/domain typecheck
bun run --cwd packages/domain test
bun run dev:domain
```

`dist` is generated, ignored by Git and required before importing the package.
Root build/test/dev commands build it automatically; the watch command updates
it while developing the engine. Tooling is shared through the workspace root.
Production sources only depend on `date-fns` and internal modules; ESLint and a
DOM-free TypeScript project enforce the boundary. Engine tests run in Node
without the web's React/i18n setup.

CI runs checks before the web build, then Playwright against the resulting
production artifact. TypeScript project references order compilation but do
not run tests; CI and the root predeploy script provide the test gate.
