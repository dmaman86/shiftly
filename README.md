# Shiftly

Workers think in shifts. Payslips are computed in weighted segments. Shiftly bridges the two: it turns your shifts into daily pay breakdowns and a monthly gross-pay estimate.

[![CI](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml/badge.svg)](https://github.com/dmaman86/shiftly/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dmaman86/shiftly/branch/main/graph/badge.svg)](https://codecov.io/gh/dmaman86/shiftly)
[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://dmaman86.github.io/shiftly/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Stack: TypeScript · React · Vite · Zustand · TanStack Query · MUI · Supabase · Vitest · Playwright

**[Live demo](https://dmaman86.github.io/shiftly/) · [עברית](README_HE.md) · [Full technical reference](docs/reference/README.md)**

![Recorded desktop E2E flow in Hebrew: entering shifts and expanding daily calculation details](.github/assets/demos/august-2026-he-desktop.gif)

## Why it exists

Shiftly was born from a real problem observed in a government office.

Workers track time in shifts: a continuous block of hours with a clear start and end. Israeli payslips don't work that way. They are computed in weighted segments: overtime brackets that restart with each working day, Shabbat and holiday additions that begin at specific hours, and night additions that cut through the middle of a shift.

The result is a predictable frustration: employees get a payslip they have no practical way to verify. Shiftly bridges that gap. You enter shifts the way you think about them, and it calculates pay by the rules applied in government offices, so every amount can be inspected and explained.

<!-- TODO: add validation line once VALIDATION.md exists -->

> Calculations are indicative gross-pay estimates, not a replacement for official payroll.

## Engineering highlights

- **Independent calculation engine:** React consumes the TypeScript [`@shiftly/domain` package](packages/domain/) through an explicit public API; the engine has no React or DOM dependency.
- **Tested deployment artifact:** [CI](.github/workflows/ci.yml) runs E2E against the downloaded production `dist` artifact and deploys that same artifact only after checks and E2E pass.
- **Browser coverage:** [Playwright projects](playwright.config.ts) exercise desktop Chromium, Android emulation (Chromium) and iPhone emulation (WebKit).
- **User-scoped persistence:** the [database migration](supabase/migrations/20260830000000_persistence_schema.sql) enables Supabase Row Level Security on monthly settings, work days and shifts, with ownership policies based on `auth.uid()`.

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

- [Full technical reference](docs/reference/README.md)
- [Hebrew technical reference](docs/reference/README_HE.md)
- [Independent payroll engine](packages/domain/README.md)
- [Architecture documentation](docs/architecture/)
- [Current architecture diagrams](docs/architecture/generated/)
- [Architecture history by tag](docs/architecture/history/)

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
compiled package updates while Vite is running.

## License

This project is licensed under the [MIT License](LICENSE).
