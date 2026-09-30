# Shiftly – Work Hours Tracking & Calculation System

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://dmaman86.github.io/shiftly/?utm_source=github&utm_medium=readme)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dmaman86/shiftly)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5.0.15-433E38?logo=react&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![MUI](https://img.shields.io/badge/Material_UI-7.0.2-007FFF?logo=mui&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.112.4-3ECF8E?logo=supabase&logoColor=white)
[![CI](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml/badge.svg)](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?logo=typescript)
[![codecov](https://codecov.io/gh/dmaman86/shiftly/branch/main/graph/badge.svg)](https://codecov.io/gh/dmaman86/shiftly)
![License](https://img.shields.io/badge/license-MIT-blue)

Shiftly tracks work shifts and explains Israeli payroll calculations through a
transparent, testable domain model.

## Quick start

Requirements: Node.js 24 and Bun 1.3.14. Install with Bun to link the workspace
packages; this repository uses Bun's `workspace:*` dependency protocol.

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
nvm install
nvm use
bun install
bun run dev
```

Open `http://localhost:5173/shiftly`.

## Documentation

- [Detailed project reference](docs/reference/README.md)
- [Detailed Hebrew reference](docs/reference/README_HE.md)
- [Architecture documentation](docs/architecture/)
- [Generated architecture diagrams](docs/architecture/generated/)
- [Architecture history](docs/architecture/history/)
- [Independent payroll engine](packages/domain/README.md)
- [Workspace migration and validation](docs/domain-workspace-migration.md)

## Common commands

```bash
bun run typecheck
bun run lint
bun run test:ci
bun run build
bun run test:e2e
```

The web lives in `apps/web` and consumes `@shiftly/domain` from `packages/domain`.
Run `bun run dev:domain` in a second terminal when editing engine sources so the
compiled package updates while Vite is running. CI gates deployment on engine
and web checks, then tests the production build with Playwright.

## License

This project is licensed under the [MIT License](LICENSE).
\n\n
