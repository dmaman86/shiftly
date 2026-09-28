# Shiftly – Work Hours Tracking & Calculation System

> 📘 Hebrew version available: [README_HE.md](./README_HE.md)

**Shiftly** is a work-hours tracking and salary calculation application built with **React + TypeScript**.
It is designed to accurately calculate monthly salary based on daily shifts, special days, per-diem rules, and real-world labor regulations.

The project focuses not only on correctness, but on **clear domain modeling, architectural stability, and long-term maintainability**.

> ⚠️ This system provides **indicative calculations only**.  
> The results should not be used for official payroll purposes  
> and do not replace calculations performed by an authorized payroll department.

---

## Motivation

**Shiftly** was born from a recurring problem observed in a real government office environment.

Workers track their time in **shifts** - a continuous block of hours with a clear start and end. But Israeli payslips don't work that way. They operate in **weighted segments:** overtime brackets that reset daily, Shabbat and holiday bonuses that kick in at specific hours, night premiums that split mid-way through.

The result is a predictable source of confusion: employees receive a payslip they can't verify, and have no practical way to cross-check whether the numbers are correct.

**Shiftly** bridges that gap. It takes shift input the way workers actually think - and calculates compensation based on **Israeli labor law:** overtime brackets, Shabbat and holiday bonuses, and night premiums - making the calculation **transparent and verifiable** for the person receiving the paycheck.

---

## Core Design Principles

The core principle behind Shiftly is that **calculation logic remains stable over time**.

Salary rules do not change per implementation, but per **period context**.
Calendar dates, hourly rates, per-diem rules, and allowances are treated as inputs rather than hardcoded UI behavior.

For partial special days, the start of the special-rate period follows the current business rule: **18:00 from April through September and 17:00 from October through March**. Dates are accepted only in `YYYY-MM-DD` format and are validated as real calendar dates.

This makes it possible to **recalculate past months accurately** using the same calculation pipeline, simply by changing the contextual parameters - without modifying domain code.

---

## Features

- Shift-based salary calculation
- Support for:
  - Regular workdays
  - Partial special days (e.g. Fridays, holiday eves)
  - Full special days (Shabbat, holidays)
- **Holiday detection via Hebcal API**
  - Automatic resolution of Jewish holidays
  - Differentiation between full and partial special days
- Sick days & vacation days
- Cross-day shifts
- Per-diem calculation with historical rate timeline
- Meal allowance calculation (small / large)
- Optional hourly-rate calculation: when `baseRate > 0`, the daily pay column and salary summary are shown; clearing it or setting it to `0` hides them
- Monthly aggregated breakdown
- Incremental recalculation (add / update / remove shifts)
- Fully reactive UI
- Landscape, right-to-left PDF export with weekly separators, independent meal-allowance columns, per-page metadata, and the application copyright footer
- Optional Google sign-in with cross-device data persistence

---

## Authentication & Data Persistence

Shiftly works fully **without an account** — everything runs in memory, and nothing is stored anywhere.

Signing in with a **Google account** (via Supabase Auth) additionally persists your data to Supabase, tied to your account, so it carries over across sessions and devices:

- **Monthly configuration** — year, month, standard hours, hourly rate
- **Day status** — sick / vacation marks per day
- **Shifts** — start, end, and duty flag for each saved shift
- **Shabbat credit carry-over** — unused Shabbat credit hours roll forward to the next month instead of being lost

| Table             | Stores                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| `monthly_configs` | Per-(user, year, month) settings, plus the running Shabbat-credit carry-over balance |
| `work_days`       | Per-(user, date) status (`sick` / `vacation`) — a missing row means `normal`         |
| `shifts`          | Per-user saved shifts, with the date denormalized onto each row for direct querying  |

All three tables are protected by Postgres Row Level Security: each user can only read or write their own rows. The schema lives in `supabase/migrations/`.

Authenticated work-table data is loaded with TanStack Query using a cache key scoped to the user, year, and month. Editing remains unavailable until that initial snapshot is ready, and a failed load presents an explicit retry action. Changing accounts resets the editable state before loading the next account's data.

The monthly summary hydrates persisted shifts and day statuses directly when its selected year and month change, so it does not depend on visiting the daily view first.

Valid shift edits are saved after a short debounce. Writes for the same user and day are serialized so a late update cannot overtake a subsequent deletion. Invalid time drafts remain local until they become valid.

---

## Architecture Overview

Shiftly follows a **Clean Architecture–inspired design**, with a strong emphasis on keeping business rules isolated from UI, state management, and external services.

The goal is to ensure that domain logic remains **predictable, testable, and unaffected by framework or UI changes**.

### High-Level Flow

Shiftly does not model work as fixed shift types. It interprets each real
worked timeline and applies rules at the temporal level where they exist:

```text
Raw shifts
    ↓
Timeline classification
    ↓
Regular / Special calculations
    ↓
Daily pay breakdown
    ↓
Monthly aggregation and monthly-only rules
```

The central separation is:

- **Classification** — which category does each worked interval belong to?
- **Calculation** — how should that classified time be compensated?
- **Aggregation** — what is the resulting day and month?

Each stage is deterministic, independently testable, and preserves the
distinction between timeline boundaries and business-rule resets.

### System Overview

<details>
<summary>Overview</summary>

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
flowchart TD
  subgraph group_presentation["Presentation"]
    layer_presentation["User experience"]
  end

  subgraph group_application["Application"]
    layer_application["Composition, routing and state"]
  end

  subgraph group_domain["Domain"]
    layer_domain["Payroll calculation"]
  end

  subgraph group_data["Infrastructure and data"]
    layer_data["Services, adapters and persistence"]
  end

  layer_presentation --> layer_application
  layer_application --> layer_domain
  layer_application --> layer_data

  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class layer_presentation toneBlue
  class layer_application toneMint
  class layer_domain toneAmber
  class layer_data toneRose
```

</details>

## Architectural Layers

### Domain
<details>
<summary>Domain</summary>

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
flowchart TD
  subgraph group_domain["Payroll domain"]
    node_composition["Domain composition<br/>[composition.ts]"]
    node_shiftbuilder["Shift map builder<br/>[shiftmap.builder.ts]"]
    node_daybuilder["Day pay builder<br/>[daypaymap.builder.ts]"]
    node_timeline["Timeline classification<br/>[classify-shift-timeline.ts]"]
    node_calculators["Pay calculators<br/>[buildCalculators.pipeline.ts]"]
    node_monthreducer["Month pay reducers<br/>[month-pay-map.reducer.ts]"]
    node_resolvers["Resolvers<br/>[month.resolver.ts]"]
    node_services["Domain services<br/>[shift.service.ts]"]
  end

  node_composition -->|"assembles"| node_shiftbuilder
  node_composition -->|"assembles"| node_daybuilder
  node_composition -->|"assembles"| node_calculators
  node_shiftbuilder -->|"classifies timeline"| node_timeline
  node_shiftbuilder -->|"uses"| node_calculators
  node_daybuilder -->|"uses"| node_calculators
  node_daybuilder -->|"resolves"| node_resolvers
  node_monthreducer -->|"uses"| node_calculators
  node_resolvers -->|"uses"| node_services
  node_monthreducer -->|"aggregates"| node_resolvers

  click node_composition "https://github.com/dmaman86/shiftly/blob/main/src/domain/composition.ts"
  click node_shiftbuilder "https://github.com/dmaman86/shiftly/blob/main/src/domain/builder/shiftmap.builder.ts"
  click node_daybuilder "https://github.com/dmaman86/shiftly/blob/main/src/domain/builder/daypaymap.builder.ts"
  click node_timeline "https://github.com/dmaman86/shiftly/blob/main/src/domain/timeline/classify-shift-timeline.ts"
  click node_calculators "https://github.com/dmaman86/shiftly/blob/main/src/domain/pipelines/buildCalculators.pipeline.ts"
  click node_monthreducer "https://github.com/dmaman86/shiftly/blob/main/src/domain/reducer/month-pay-map.reducer.ts"
  click node_resolvers "https://github.com/dmaman86/shiftly/blob/main/src/domain/resolve/month.resolver.ts"
  click node_services "https://github.com/dmaman86/shiftly/blob/main/src/domain/services/shift.service.ts"

  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  class node_composition,node_shiftbuilder,node_daybuilder,node_timeline,node_calculators,node_monthreducer,node_resolvers,node_services toneAmber
```

</details>

The domain layer contains **pure business logic** and is framework-agnostic.

- **Builders**
  Construct domain structures without embedding business rules.

- **Timeline classification**
  Splits arbitrary worked intervals into mutually exclusive `Regular` or
  `Special` categories, including cross-day, holiday, Shabbat, and historical
  calendar boundaries.

- **Calculators**
  Independent pipelines for base hours, dated additions, special hours,
  per-diem, meal allowances, credits, and other domain rules.

- **Reducers**
  Handle accumulation and rollback of calculated values, enabling incremental recalculation.

- **Resolvers**
  Multi-method decision services (day-type classification, available months) whose shape doesn't reduce to a single input/output calculation.

- **Composition**
  Centralized wiring of domain components via `pipelines/`. The public domain API is assembled by `src/domain/composition.ts` and exposed to the application through `src/app/domain/domain.instance.ts`.

### Presentation
<details>
<summary>Presentation</summary>

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
flowchart TD
  subgraph group_ui["User experience"]
    node_app["Application shell<br/>[App.tsx]"]
    node_routes["Application routes<br/>[AppRoutes.tsx]"]
    node_daily["Daily page<br/>[DailyPage.tsx]"]
    node_monthly["Monthly summary<br/>[MonthlySummaryPage.tsx]"]
    node_rules["Calculation rules<br/>[CalculationRulesPage.tsx]"]
    node_worktable["Work table<br/>[WorkTable.tsx]"]
    node_daycontroller["Day controller<br/>[useDayController.ts]"]
    node_salary["Salary summary<br/>[MonthlySalarySummary.tsx]"]
    node_dayviews["Day pay breakdown<br/>[dayToPayBreadownVM.ts]"]
    node_monthbreakdown["Month pay breakdown<br/>[monthToPayBreakdownVM.ts]"]
  end

  node_app -->|"renders"| node_routes
  node_routes -->|"routes to"| node_daily
  node_routes -->|"routes to"| node_monthly
  node_routes -->|"routes to"| node_rules
  node_daily -->|"presents"| node_worktable
  node_worktable -->|"delegates day interactions"| node_daycontroller
  node_daycontroller -->|"maps"| node_dayviews
  node_monthly -->|"shows totals"| node_salary
  node_monthly -->|"maps monthly pay"| node_monthbreakdown

  click node_app "https://github.com/dmaman86/shiftly/blob/main/src/app/App.tsx"
  click node_routes "https://github.com/dmaman86/shiftly/blob/main/src/app/routes/AppRoutes.tsx"
  click node_daily "https://github.com/dmaman86/shiftly/blob/main/src/pages/DailyPage.tsx"
  click node_monthly "https://github.com/dmaman86/shiftly/blob/main/src/pages/MonthlySummaryPage.tsx"
  click node_rules "https://github.com/dmaman86/shiftly/blob/main/src/pages/CalculationRulesPage.tsx"
  click node_worktable "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/components/month/WorkTable.tsx"
  click node_daycontroller "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/hooks/day/useDayController.ts"
  click node_salary "https://github.com/dmaman86/shiftly/blob/main/src/features/salary-summary/components/MonthlySalarySummary.tsx"
  click node_dayviews "https://github.com/dmaman86/shiftly/blob/main/src/adapters/dayToPayBreadownVM.ts"
  click node_monthbreakdown "https://github.com/dmaman86/shiftly/blob/main/src/adapters/monthToPayBreakdownVM.ts"

  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  class node_app,node_routes,node_daily,node_monthly,node_rules,node_worktable,node_daycontroller,node_salary,node_dayviews,node_monthbreakdown toneBlue
```

</details>

#### Application and UI Types
`src/app/` is the application composition root. It creates the composed domain instance and makes domain operations available to React without importing orchestration functions directly. For example, application code calls `domain.payMap.calculateDayFromShifts(...)`.

Domain contracts remain under `src/domain/types`. UI-facing models such as `PayBreakdownViewModel`, `CompactPayBreakdownVM`, and `WorkDayInfo` live under `src/app/types`, because they describe presentation and application state rather than domain rules. Adapters and feature mappers convert domain results into those application models.

#### Hooks
Thin orchestration layer between UI, domain, and state.
Hooks coordinate data flow without embedding business logic.

#### UI Components
Pure presentation logic.
UI reacts to data - it does not implement salary rules.
Duty/Meal Allowance shifts are rendered as `Duty` in the English print view and `תפקיד` in the Hebrew print view.

---

### Application
<details>
<summary>Application</summary>

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
flowchart TD
  subgraph group_composition["Application composition"]
    node_domaininstance["Domain instance<br/>[domain.instance.ts]"]
    node_providers["Application providers<br/>[AppProviders.tsx]"]
    node_auth["Authentication provider<br/>[AuthProvider.tsx]"]
    node_domainprovider["Domain provider<br/>[DomainProvider.tsx]"]
  end

  subgraph group_state["Application state"]
    node_monthlydata["Monthly data provider<br/>[MonthlyDataProvider.tsx]"]
    node_session["Month session<br/>[useWorkTableMonthSession.ts]"]
    node_daystate["Day-state context<br/>[WorkTableDayStateProvider.tsx]"]
    node_globalstate["Global state<br/>[globalStore.ts]"]
  end

  node_providers -->|"installs"| node_auth
  node_providers -->|"installs"| node_domainprovider
  node_domainprovider -->|"exposes"| node_domaininstance
  node_monthlydata -->|"coordinates"| node_session
  node_session -->|"reads user"| node_auth
  node_session -->|"hydrates and observes"| node_daystate
  node_session -->|"replaces pay maps"| node_globalstate
  node_daystate -->|"updates"| node_globalstate
  node_domaininstance -->|"serves domain operations"| node_session

  click node_domaininstance "https://github.com/dmaman86/shiftly/blob/main/src/app/domain/domain.instance.ts"
  click node_providers "https://github.com/dmaman86/shiftly/blob/main/src/app/providers/AppProviders.tsx"
  click node_auth "https://github.com/dmaman86/shiftly/blob/main/src/app/providers/auth/AuthProvider.tsx"
  click node_domainprovider "https://github.com/dmaman86/shiftly/blob/main/src/app/providers/domain/DomainProvider.tsx"
  click node_monthlydata "https://github.com/dmaman86/shiftly/blob/main/src/features/monthly-data/MonthlyDataProvider.tsx"
  click node_session "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/hooks/month/useWorkTableMonthSession.ts"
  click node_daystate "https://github.com/dmaman86/shiftly/blob/main/src/features/work-table/context/workTableDayState/WorkTableDayStateProvider.tsx"
  click node_globalstate "https://github.com/dmaman86/shiftly/blob/main/src/store/globalStore.ts"

  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  class node_domaininstance,node_providers,node_auth,node_domainprovider,node_monthlydata,node_session,node_daystate,node_globalstate toneMint
```

</details>

#### State Management
- **Zustand** handles global period configuration and daily pay maps
- **React Context** owns authentication, dependency injection, UI integration boundaries, and the current work-table editing session
- **TanStack Query** coordinates authenticated work-table reads and writes to Supabase
- Daily pay maps are updated by date key, and the monthly breakdown is derived deterministically from the current maps

Global Zustand state:

- `src/store/globalStore.ts`
- `src/store/globalBreakdown.ts`

### Data
<details>
<summary>Data</summary>

```mermaid
---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#334155"
    edgeLabelBackground: "#ffffff"
---
flowchart TD
  subgraph group_services["Services and integrations"]
    node_shiftservice["Shift service<br/>[shift.service.ts]"]
    node_workdayservice["Workday service<br/>[workDay.service.ts]"]
    node_monthlyconfig["Monthly config service<br/>[monthlyConfig.service.ts]"]
    node_account["Account service<br/>[account.service.ts]"]
    node_hebcal["Hebcal service<br/>[hebcal.service.ts]"]
    node_analytics["Analytics service<br/>[analytics.service.ts]"]
    node_supabase["Supabase client and CRUD<br/>[supabase.client.ts]"]
  end

  subgraph group_adapters["Adapters"]
    node_dayadapter["Day pay breakdown adapter<br/>[dayToPayBreadownVM.ts]"]
    node_monthadapter["Month pay breakdown adapter<br/>[monthToPayBreakdownVM.ts]"]
  end

  node_persistence[("Persisted application data")]
  node_hebcalapi{{"Hebcal API"}}

  node_shiftservice -->|"uses"| node_supabase
  node_workdayservice -->|"uses"| node_supabase
  node_monthlyconfig -->|"uses"| node_supabase
  node_account -->|"uses"| node_supabase
  node_supabase -->|"reads and writes"| node_persistence
  node_hebcal -->|"fetches holidays"| node_hebcalapi
  node_dayadapter -->|"maps domain output"| node_monthadapter
  node_analytics -->|"tracks application events"| node_supabase

  click node_shiftservice "https://github.com/dmaman86/shiftly/blob/main/src/services/shift/shift.service.ts"
  click node_workdayservice "https://github.com/dmaman86/shiftly/blob/main/src/services/workDay/workDay.service.ts"
  click node_monthlyconfig "https://github.com/dmaman86/shiftly/blob/main/src/services/monthlyConfig/monthlyConfig.service.ts"
  click node_account "https://github.com/dmaman86/shiftly/blob/main/src/services/account/account.service.ts"
  click node_hebcal "https://github.com/dmaman86/shiftly/blob/main/src/services/hebcal/hebcal.service.ts"
  click node_analytics "https://github.com/dmaman86/shiftly/blob/main/src/services/analytics/analytics.service.ts"
  click node_supabase "https://github.com/dmaman86/shiftly/blob/main/src/services/supabase/supabase.client.ts"
  click node_dayadapter "https://github.com/dmaman86/shiftly/blob/main/src/adapters/dayToPayBreadownVM.ts"
  click node_monthadapter "https://github.com/dmaman86/shiftly/blob/main/src/adapters/monthToPayBreakdownVM.ts"

  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
  class node_shiftservice,node_workdayservice,node_monthlyconfig,node_account,node_hebcal,node_analytics,node_supabase toneRose
  class node_dayadapter,node_monthadapter,node_persistence,node_hebcalapi toneNeutral
```

</details>

#### Adapters
Convert domain objects into UI-friendly view models.
This ensures the domain never depends on presentation concerns.

---
## Domain Concepts

### Builders

Responsible for assembling domain structures:

- `ShiftMapBuilder`
- `DayPayMapBuilder`
- `WorkDaysForMonthBuilder`

`DefaultShiftMapBuilder` normalizes each valid shift into one continuous timeline
and passes it to `TimelineShiftPayCalculator`. Crossing midnight is therefore a
timeline concern, not a separate salary-calculation case.

### Calculators

Pure calculation logic organized by concern:

- **Timeline classification**: Regular/Special intervals with calendar identity
- **Base hours**: configurable 100% → 125% → 150% progression without boundary resets
- **Additions**: date-based evening/night policy, including the three-hour qualification
- **Special hours**: independent 150%/200% classification
- **Per-diem**: timeline-based rates and daily calculation; monthly accumulation
  is handled by a reducer
- **Meal allowance**: eligibility and rate calculation in one timeline-based
  calculator
- **Fixed segments**: sick, vacation and earned Shabbat credit
- **Holiday day-type classification**: Hebcal-based

The base progression is accumulated across the continuous Regular timeline: the first configured `standardHours` interval is 100%, the next `midTierThreshold` hours are 125%, and the remaining hours are 150%. Midnight and special-time boundaries do not reset that progression. Evening/night additions are evaluated independently through a date-based policy, and the evening addition is emitted only when its applicable regular qualifying period reaches at least three hours.

#### Shabbat Credit Terminology

Shabbat credit is modeled as two distinct values because earning credit and using it are separate business events:

- `earnedShabbatCredit` is the credit generated by Shabbat and holiday work. It belongs to the day and month domain pay maps and forms the monthly credit pool.
- `appliedShabbatCredit` is the part of that monthly pool assigned to eligible hour deficits. It belongs to presentation view models and is the only part included in total hours and salary.

The monthly allocator also preserves the provenance of applied credit in
`usageByDate`. For each eligible day it records how many hours came from each
earning day and how many came from the previous month. Sources are consumed in
FIFO order: previous-month carry-over first, followed by earning dates in
chronological order. The current persistence model stores previous-month
carry-over as an aggregate, so it is displayed as `previous-month` rather than
as individual dates.

For example:

```text
2026-08-03 used 6.67h:
  3.50h from previous-month
  2.00h from 2026-08-01
  1.17h from 2026-08-02
```

The monthly pool can complete unworked or short days classified as `Regular` or `SpecialPartialStart`, regardless of when the credit was earned during the month. A day can only be completed up to its configured standard hours. Distribution is chronological so that the result remains deterministic and auditable.

Any remaining balance is reported as unused Shabbat credit:

```text
unusedShabbatCredit = earnedShabbatCredit - appliedShabbatCredit
actualHours = worked hours
totalHours = worked hours + sick hours + vacation hours + appliedShabbatCredit
```

Unused credit is displayed to the user but is excluded from total hours and salary calculations.

### Reducers

Accumulate and subtract breakdowns:

- Monthly pay map reducer
- Regular hours accumulator
- Fixed segment month reducer
- Meal allowance month reducer
- Workday month reducer

### Resolvers

Multi-method decision services whose shape doesn't reduce to a single input/output calculation:

- Month resolver — available months and default month for a given year
- Workday info resolver — day-type and cross-day-continuation queries

### Services

Domain-level utilities:

- `DateService`: Date manipulation and validation
- `ShiftService`: Shift-related business logic

### Pipelines

Composition pipelines for wiring domain components:

- `buildCoreServices`: Date & shift services
- `buildResolvers`: Month and workday-info resolver instances
- `buildRateCalculators`: Holiday, per-diem rate, and meal-allowance rate calculators
- `buildCalculators`: Calculator instances
- `buildShiftLayer`: Shift-level logic
- `buildDayLayer`: Day-level aggregation
- `buildMonthLayer`: Month-level aggregation

---

## Tech Stack

### Core

- **React** 19.2.3
- **TypeScript** 5.7.2
- **Vite** 8

### State & Routing

- **Zustand** 5.0.15 (global client state)
- **TanStack Query** 5 (authenticated server-state synchronization)
- **React Router** 7

### UI & Styling

- **Material UI (MUI)** 7.0.2
- **Notistack** 3.0.2 (notifications)

### Data & Services

- **Axios** 1.18.1 (HTTP client)
- **date-fns** 4.1.0 (date manipulation)
- **Hebcal API** (holiday detection)
- **Supabase** 2.112.4 (Google OAuth + Postgres persistence)

### Testing

- **Vitest** 4
- **Testing Library** (React, Jest-DOM, User Event)
- **Playwright** 1.63 (Chromium end-to-end tests)

---

## Testing

Shiftly uses **Vitest** for unit and integration testing, with a focus on domain logic validation.

### Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode (single run)
npm run test:ci
```

### End-to-End Tests

Tests are split by what each level proves:

| Level                                     | Scope                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit (Vitest)                             | Domain rules, services, mappers, and components                                                                                                                    |
| Integration (Vitest)                      | Every golden month fixture through the app's calculation path, without a browser                                                                                   |
| Desktop E2E (Playwright, Chromium)        | Full month entry through the table in English and Hebrew, plus the tablet-width layout                                                                             |
| Mobile E2E (Playwright, Android + iPhone) | Month selection in the modal picker, shift editing, and menu navigation without horizontal overflow; full month entry through the calendar and day card on Android |

Mobile specs run on two profiles: `android` (Pixel 10, Chromium) and `iphone` (iPhone 15, WebKit). The full-month flow is Android-only because headless WebKit on Linux CI needs several minutes for it, and month results do not depend on the browser engine. Every test runs with a frozen clock (`e2e/support/app.ts`), so scenarios do not depend on the current date.

Install the Playwright browsers once after installing dependencies:

```bash
playwright install chromium webkit
```

Run the end-to-end test suite:

```bash
# Run E2E tests
npm run test:e2e

# Open Playwright UI mode
npm run test:e2e:ui

# Run with a visible browser
npm run test:e2e:headed
```

The golden month scenarios (inputs and expected outputs) are stored in:

```text
e2e/
├── fixtures/
│   ├── august-2026.json / august-2026.result.json
│   ├── march-2022.json / march-2022.result.json
│   ├── october-2021.json / october-2021.result.json
│   └── october-2025.json / october-2025.result.json
├── support/          # Shared scenario loading, formatting, and app setup
├── desktop/          # "desktop" project
│   ├── work-table-month.spec.ts
│   └── tablet-layout.spec.ts
└── mobile/           # "android" and "iphone" projects
    ├── work-table-month.spec.ts   # Android only
    ├── month-picker.spec.ts
    ├── shift-editing.spec.ts
    └── navigation.spec.ts
```

Every fixture is verified by the Vitest integration test `src/test/integration/work-table-month-fixtures.test.ts`, which runs the same calculation path as the app without a browser. Playwright drives only the August 2026 scenario through the UI.

Locally, the Playwright web server starts the Vite dev server on `127.0.0.1` with the `/shiftly` base path. In CI it serves the prebuilt `dist/` with `vite preview`. Hebcal is mocked by the tests so scenarios stay deterministic.
The CI workflow installs Chromium and WebKit and runs the E2E suite automatically.

### Quality Checks and Production Build

```bash
# Type-check the application and Vite configuration
npm run typecheck

# Run static analysis
npm run lint

# Create the production bundle in dist/
npm run build
```

### Test Coverage

Tests cover:

- Calculation logic (builders, calculators, reducers)
- Time-based resolution (holidays, rates, segments)
- Edge cases (cross-day shifts, partial days, sick/vacation)
- UI configuration and work-table behavior, including salary visibility when `baseRate` changes
- End-to-end calculation scenarios

The domain layer is fully testable and framework-independent, making it easy to validate business rules in isolation.

---

## Getting Started

Shiftly supports Node.js 24. Bun 1.3.14 is the repository package manager,
but the package scripts are runtime-neutral and can be invoked through npm or
Bun.

Clone the repository, activate the supported runtime, and install dependencies:

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
nvm install
nvm use
npm install
npm run dev

# Alternative package manager:
# bun install --frozen-lockfile
# bun run dev
```

Visit `http://localhost:5173/shiftly` in your browser.

### Supabase Setup (optional)

Guest mode works with no setup at all — nothing is persisted, no account required.

To enable Google sign-in and cross-device data persistence, create a `.env.local` file with your Supabase project's credentials:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Then run the SQL files under `supabase/migrations/`, in order, in your Supabase project's SQL Editor to create the `monthly_configs`, `work_days`, and `shifts` tables with their Row Level Security policies.

Account deletion requires the `delete-account` Supabase Edge Function because deleting from `auth.users` requires a server-side secret key. Deploy it after linking the project:

```bash
supabase functions deploy delete-account
```

The function validates the signed-in user's JWT and deletes that same user from Supabase Auth. The table foreign keys use `on delete cascade`, so the user's `monthly_configs`, `work_days`, and `shifts` rows are removed by the database.

---

## Project Structure

```plaintext
.
├── .github/
│   ├── assets/                 # README screenshots
│   └── workflows/              # CI, pull-request checks, deployment
├── docs/
│   └── architecture/           # Generated conceptual diagrams and tag history
├── e2e/                         # Playwright end-to-end tests and fixtures
├── playwright.config.ts         # Playwright configuration
├── scripts/
│   └── architecture/           # Mermaid architecture generators
├── src/
│   ├── adapters/               # External data and domain-to-view adapters
│   ├── app/                    # Application composition root
│   │   ├── domain/             # Domain instance and application-facing types
│   │   ├── types/              # Application and UI view models
│   │   ├── providers/          # Auth, direction, domain and snackbar providers
│   │   └── routes/             # Application and language-aware routing
│   ├── constants/              # Shared domain and UI constants
│   ├── components/             # Shared presentational UI components
│   ├── domain/                 # Framework-independent payroll rules
│   │   ├── builder/            # Shift, day and month structure builders
│   │   ├── calculator/         # Timeline pipelines, rates, allowances and credits
│   │   ├── pipelines/          # Domain dependency composition
│   │   ├── reducer/            # Monthly accumulation and rollback
│   │   ├── resolve/            # Multi-method decision services (day-type, month)
│   │   ├── services/           # Date and shift services
│   │   └── types/              # Domain contracts and data shapes
│   ├── features/               # Feature-owned UI and orchestration
│   │   ├── auth/               # Google sign-in controls
│   │   ├── calculation-rules/  # Rules and interactive calculation example
│   │   ├── config/             # Work parameters and persisted monthly config
│   │   ├── feedback/           # User feedback notifications
│   │   ├── info-dialog/        # Application information dialog
│   │   ├── monthly-data/       # Monthly configuration hydration and persistence
│   │   ├── monthly-pay/        # Derived monthly pay and Shabbat credit allocation
│   │   │   └── hooks/          # Allocation calculation and carry-over persistence
│   │   ├── salary-summary/     # Monthly salary components and view models
│   │   │   ├── components/     # Salary summary presentation
│   │   │   ├── helpers/        # Salary section construction
│   │   │   ├── hooks/          # Salary summary orchestration hooks
│   │   │   ├── mappers/        # Pay-row and allowance mapping
│   │   │   └── vm/             # Salary summary view models
│   │   ├── work-table/         # Responsive month/day/shift editing and calculation views
│   │   │   ├── assets/         # Work-table feature assets
│   │   │   ├── components/     # Components grouped by month, day and shift
│   │   │   ├── context/        # Editable work-table day state context
│   │   │   ├── helpers/        # State changes and PDF export helpers
│   │   │   ├── hooks/          # Hooks grouped by month, day and shift
│   │   │   └── mappers/        # Mappers grouped by month, day and shift
│   │   └── workday-timeline/   # Visual shift timeline
│   ├── hooks/                  # Shared React integration hooks
│   ├── i18n/                   # Hebrew/English resources and URL language resolution
│   ├── layout/                 # Application layout and error boundaries
│   ├── pages/                  # Daily, monthly and calculation-rules pages
│   ├── store/                  # Zustand global state and breakdown calculations
│   ├── services/               # Analytics, Hebcal and Supabase persistence clients
│   ├── test/                   # Domain, store, service and UI test suites
│   └── utils/                  # API result handling and shared helpers
└── supabase/
    ├── functions/               # Authenticated Edge Functions
    └── migrations/              # Postgres schema and Row Level Security policies
```

---

## Why This Architecture?

This architecture was chosen to handle:

- Complex salary rules
- Time-based edge cases (cross-day shifts, partial days)
- Multiple aggregation levels (shift → day → month)
- Incremental recalculation without full recompute
- Historical accuracy without modifying core logic

It allows the system to scale **without turning into tightly coupled conditional logic** inside UI components or reducers.

---

## Implementation Notes

- All percentages are normalized (e.g. `1` = 100%, `1.5` = 150%, `2` = 200%)
- Domain logic is framework-agnostic and fully testable
- UI reacts to data, not business rules
- Historical calculations use time-based context, not code changes

---

## UI Behavior Overview

## Application Views

Shiftly provides two main calculation views:

### Daily View

- Focused on day-by-day shift input
- Allows adding, editing, and validating shifts
- Displays per-day breakdown
- Monthly totals are updated incrementally
- Downloads the work table directly as a landscape, right-to-left PDF
- On mobile, selecting a day shows its card collapsed by default. Sick/vacation controls, shift editing, and the compact summary remain visible; the detailed breakdown expands on demand.

#### PDF Export

- The title uses the selected month and year: `Month hours {monthName} {year}`.
- The first page shows the authenticated user's email when available, `baseRate`, and `standardHours` below the title.
- Additional pages repeat the metadata header and every page includes the Shiftly copyright footer.
- Week boundaries are emphasized visually, and meal allowances are exported as three independent columns: `Per Diem`, `Large Per Diem`, and `Small Per Diem`.
- The PDF is generated with embedded Unicode text, so titles, metadata, headers, values, and footers remain selectable and searchable, including Hebrew content.

### Monthly View

- Focused on aggregated monthly salary analysis
- Requires selecting **year and month**
- Ensures accurate per-diem and meal allowance rates based on period
- Loads persisted shifts and day statuses for the selected period independently of the Daily view
- Displays a compact monthly salary summary

Both views share the same domain calculation pipeline.
Only the presentation and configuration context changes.

### Configuration Panel

The `ConfigPanel` adapts its behavior based on the active view:

- In **Daily mode**:
  - Allows defining standard hours and hourly rate
  - When `baseRate > 0`, shows daily pay and the monthly salary summary
  - Clearing the hourly rate or setting it to `0` hides salary-dependent output

- In **Monthly mode**:
  - Year and month selection becomes mandatory
  - Ensures correct historical rates for per-diem and meal allowance
  - Enforces hourly rate definition for salary calculation

This separation keeps configuration logic explicit and context-aware.

### Workday Overview

- If `baseRate` is `0`: only displays worked hours per day.
- If `baseRate > 0`: shows the daily-pay column, per-day salary, and monthly salary summary.
- **Sick/Vacation days**: disables work segments.
- **Shabbat/holiday**: only allows work, not absence.
- **Cross-day shifts**: user must confirm with a checkbox.
- When Shabbat credit is applied, the day shows the total used and its sources, including earning dates and previous-month carry-over. Desktop keeps the explanation inline; mobile displays each source on its own line.
- **Mobile day cards**: OT, Shabbat, extras, Shabbat credit, and other breakdown details are hidden until the card is expanded.

### E2E Demos

<details>
<summary>August 2026 Hebrew desktop flow</summary>

![August 2026 Hebrew desktop flow](../../.github/assets/demos/august-2026-he-desktop.gif)
</details>

<details>
<summary>August 2026 Hebrew mobile flow</summary>

![August 2026 Hebrew mobile flow](../../.github/assets/demos/august-2026-mobile-he.gif)
</details>

### Day Configuration Examples

#### Shabbat or Holiday - Work Hours Allowed

Cannot mark as Sick/Vacation, but work segments are allowed.

![Shabbat Sick Vacation](../../.github/assets/screenshots/shabbat-sick-vacation.png)

#### Sick Day or Vacation Day - No Work Segments

Marked as Sick/Vacation; no work segments allowed.

![Sick/Vacation Select](../../.github/assets/screenshots/sick-vacation-select.png)

#### Cross-Day Shift - "חוצה יום" Checkbox

End time is next day; system asks to confirm crossing day.

|                              Cross-Day Warning                               |                           Shift Save                           |
| :--------------------------------------------------------------------------: | :------------------------------------------------------------: |
| ![Cross Day Warning](../../.github/assets/screenshots/cross-day-warning.png) | ![Shift Save](../../.github/assets/screenshots/shift-save.png) |

---

### Breakdown Summaries

#### Daily Breakdown - Desktop View

Detailed breakdown showing all calculation components for a single day.

|                                           Collapsed Details                                           |                                           Expanded Details                                           |
| :---------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------: |
| ![Desktop breakdown with collapsed details](../../.github/assets/screenshots/breakdown-summary-1.png) | ![Desktop breakdown with expanded details](../../.github/assets/screenshots/breakdown-summary-2.png) |

#### Daily Breakdown - Mobile View

|                                          Collapsed Details                                          |                                          Expanded Details                                          |
| :-------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------: |
| ![Mobile breakdown with collapsed details](../../.github/assets/screenshots/breakdown-mobile-1.png) | ![Mobile breakdown with expanded details](../../.github/assets/screenshots/breakdown-mobile-2.png) |

#### Monthly Summary

Aggregated monthly salary calculation with all components.

![Monthly Summary](../../.github/assets/screenshots/monthly-summary.png)

---

## License

This project is licensed under the [MIT License](../../LICENSE).
\n
