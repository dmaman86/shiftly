# Shiftly – Work Hours Tracking & Calculation System

> 📘 Hebrew version available: [README_HE.md](./README_HE.md)

**Shiftly** is a work-hours tracking and salary calculation application built with **React + TypeScript**.
It is designed to accurately calculate monthly salary based on daily shifts, special days, per-diem rules, and the rules applied in government offices.

The project focuses not only on correctness, but on **clear domain modeling, architectural stability, and long-term maintainability**.

> ⚠️ This system provides **indicative calculations only**.  
> The results should not be used for official payroll purposes  
> and do not replace calculations performed by an authorized payroll department.

---

## Motivation

Shiftly was born from a real problem observed in a government office.

Workers track time in shifts: a continuous block of hours with a clear start and end. Israeli payslips don't work that way. They are computed in weighted segments: overtime brackets that restart with each working day, Shabbat and holiday additions that begin at specific hours, and night additions that cut through the middle of a shift.

The result is a predictable frustration: employees get a payslip they have no practical way to verify. Shiftly bridges that gap. You enter shifts the way you think about them, and it calculates pay by the rules applied in government offices, so every amount can be inspected and explained.

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
- **Holidays computed in the browser, plus Knesset election days published by the API**
  - Automatic resolution of Jewish holidays
  - Differentiation between full and partial special days
- Sick days & vacation days
- Cross-day shifts
- Per-diem calculation with historical rate timeline
- Meal allowance calculation (small / large)
- Optional hourly-rate calculation: when `baseRate > 0`, the daily pay column and salary summary are shown; clearing it or setting it to `0` hides them
- Monthly aggregated breakdown
- Monthly totals recomputed from the current daily pay maps after adding, updating, or removing shifts
- Fully reactive UI
- Landscape, right-to-left PDF export with weekly separators, independent meal-allowance columns, per-page metadata, and the application copyright footer
- Knesset election day premium (100% for regular work between 07:00 and 22:00)
- Optional Google sign-in with cross-device data persistence through the Shiftly API
- Profile page: signed-in users get an account card and three historical charts with preset or custom monthly ranges; guests see a locked preview

---

## Authentication & Data Persistence

The salary calculators work **without an account** — calculation data stays in memory. The personal profile and persisted history require authentication.

Signing in with a **Google account** (via Supabase Auth) additionally persists your data, tied to your account, so it carries over across sessions and devices. The browser uses Supabase for sign-in only; every read and write goes through `apps/api`:

- **Monthly configuration** — year, month, standard hours, hourly rate
- **Day status** — sick / vacation marks per day
- **Shifts** — start, end, and duty flag for each saved shift
- **Shabbat credit carry-over** — unused Shabbat credit hours roll forward to the next month instead of being lost

| Table             | Stores                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| `monthly_configs` | Per-(user, year, month) settings, plus the running Shabbat-credit carry-over balance |
| `work_days`       | Per-(user, date) status (`sick` / `vacation`) — a missing row means `normal`         |
| `shifts`          | Per-user saved shifts, with the date denormalized onto each row for direct querying  |

The browser does not query these tables. `apps/api` verifies the access token on every request and reads or writes them only for that user, through `UserScope`; saving a shift and importing a guest month run as backend-only Postgres functions. Row Level Security and its ownership policies stay enabled as a backstop. The schema lives in `supabase/migrations/`, and pgTAP tests in `supabase/tests/` check its privileges.

Every user-data request names the account it was issued for. If another account signs in before it is sent, the request is dropped instead of reaching the new account's data.

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

<!-- diagram:overview -->

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
%% Source: v1.1.0 (release candidate; source HEAD). Selected layer dependencies, including type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Solid arrows point from consumers to dependencies; dashed arrows show runtime calls across process boundaries.
%% The browser uses Supabase for authentication only; every data read and write goes through apps/api.
flowchart TD
  subgraph web["apps/web — React SPA on GitHub Pages"]
    layer_ui["Presentation<br/>Daily, monthly, calculation rules, public profile"]
    layer_app["Application and state<br/>Providers, hooks, Zustand editor state, TanStack Query"]
    layer_data["Services and adapters<br/>apiClient, reference caches, computed holidays, guest draft"]
  end
  subgraph domain_pkg["packages/domain"]
    layer_domain["@shiftly/domain — standalone payroll engine<br/>Calculation pipelines, ReferenceResolver"]
  end
  subgraph api["apps/api — Express 5 on Cloud Run (Node 24)"]
    api_http["middleware + routes<br/>/reference, /me, /admin"]
    api_core["services + ports<br/>Framework-free rules"]
    api_repos["repositories<br/>UserScope, Supabase adapters"]
    api_research["research pipelines + cli<br/>Admin only"]
  end
  subgraph supabase["Supabase"]
    sb_auth{{"Supabase Auth<br/>Google OAuth, JWT"}}
    sb_db[("Postgres<br/>User data, reference data, RLS")]
  end
  external_ga{{"Google Analytics"}}
  external_gemini{{"Google AI (Gemma)"}}
  layer_ui --> layer_app
  layer_ui --> layer_data
  layer_app --> layer_data
  layer_app --> layer_domain
  layer_data --> layer_domain
  layer_ui --> layer_domain
  api_http --> api_core
  api_http --> api_repos
  api_core -.->|"mirrors timeline validation<br/>contract test, no runtime import"| layer_domain
  api_repos -->|"implements ports"| api_core
  api_research --> api_repos
  layer_data -.->|"sign-in, session tokens only"| sb_auth
  layer_data -.->|"HTTPS + bearer token<br/>expectedUserId guard"| api_http
  layer_data -.->|"page views, events"| external_ga
  api_http -.->|"verify token, revalidate session"| sb_auth
  api_repos -.->|"service_role, scoped to the verified user"| sb_db
  api_research -.->|"extraction and research"| external_gemini
  e2e["Playwright E2E<br/>Hermetic: API and Auth from fixtures, data requests aborted"]
  e2e -.->|"exercises UI"| layer_ui
  pgtap["pgTAP<br/>Grants, RLS, backend-only RPCs"]
  pgtap -.->|"tests"| sb_db
  click layer_ui "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/routes/AppRoutes.tsx"
  click layer_app "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/AppProviders.tsx"
  click layer_data "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/api/client.ts"
  click layer_domain "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/composition.ts"
  click api_http "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/app.ts"
  click api_core "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/services"
  click api_repos "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/user-scope.ts"
  click api_research "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/research"
  click e2e "https://github.com/dmaman86/shiftly/blob/main/playwright.config.ts"
  click pgtap "https://github.com/dmaman86/shiftly/tree/main/supabase/tests"
  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef toneViolet fill:#ede9fe,stroke:#7c3aed,stroke-width:1.5px,color:#2e1065
  class layer_ui toneBlue
  class layer_app toneMint
  class layer_data,api_repos toneRose
  class layer_domain,api_core toneAmber
  class api_http,api_research toneViolet
```

<!-- /diagram:overview -->

</details>

## Architectural Layers

### Domain
<details>
<summary>Domain</summary>

<!-- diagram:domain -->

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
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Selected module dependencies, including type imports; arrows point from consumers to dependencies.
%% Dashed arrows show injected runtime calls. Rates come from a ReferenceResolver: the web app builds one from the API's timelines, or uses the embedded baseline.
%% apps/api cannot import this package at runtime: it mirrors MonthlyTimeline's checks, and a contract test runs the same cases through both.
flowchart TD
  subgraph group_domain["Payroll logic"]
    node_0["composition<br/>[packages/domain/src/composition.ts]"]
    node_1["buildDayLayer.pipeline<br/>[packages/domain/src/pipelines/buildDayLayer.pipeline.ts]"]
    node_3["buildMonthLayer.pipeline<br/>[packages/domain/src/pipelines/buildMonthLayer.pipeline.ts]"]
    node_4["buildCalculators.pipeline<br/>[packages/domain/src/pipelines/buildCalculators.pipeline.ts]"]
    node_6["shiftmap.builder<br/>[packages/domain/src/builder/shiftmap.builder.ts]"]
    node_7["daypaymap.builder<br/>[packages/domain/src/builder/daypaymap.builder.ts]"]
    node_8["workdaysformonth.builder<br/>[packages/domain/src/builder/workdaysformonth.builder.ts]"]
    node_9["timeline-shift-pay.calculator<br/>[packages/domain/src/calculator/timeline-shift-pay.calculator.ts]"]
    node_10["classify-shift-timeline<br/>[packages/domain/src/timeline/classify-shift-timeline.ts]"]
    node_11["month-pay-map.reducer<br/>[packages/domain/src/reducer/month-pay-map.reducer.ts]"]
    node_12["workdayinfo.resolver<br/>[packages/domain/src/resolve/workdayinfo.resolver.ts]"]
    node_13["date.service<br/>[packages/domain/src/services/date.service.ts]"]
    node_14["shift.service<br/>[packages/domain/src/services/shift.service.ts]"]
    node_15["perdiem-month.reducer<br/>[packages/domain/src/reducer/perdiem-month.reducer.ts]"]
    node_16["workday-month.reducer<br/>[packages/domain/src/reducer/workday-month.reducer.ts]"]
    node_17["fixed-segment-month.reducer<br/>[packages/domain/src/reducer/fixed-segment-month.reducer.ts]"]
    node_18["meal-allowance-month.reducer<br/>[packages/domain/src/reducer/meal-allowance-month.reducer.ts]"]
    node_19["buildShiftLayer.pipeline<br/>[packages/domain/src/pipelines/buildShiftLayer.pipeline.ts]"]
    rate_pipeline["buildRateCalculators.pipeline<br/>[packages/domain/src/pipelines/buildRateCalculators.pipeline.ts]"]
    day_from_shifts["calculateDayFromShifts<br/>[packages/domain/src/calculator/day-from-shifts.calculator.ts]"]
    addition_classifier["AdditionClassifier<br/>[packages/domain/src/calculator/additions/addition.classifier.ts]"]
    base_hours["BaseHoursClassifier<br/>Base progression + election pay-equivalent hours<br/>[packages/domain/src/calculator/regular/base-hours.classifier.ts]"]
    election_hours["calculateElectionHours<br/>Regular overlap with election date 07:00–22:00<br/>[packages/domain/src/calculator/election-hours.calculator.ts]"]
    regular_day["RegularByDayCalculator<br/>Consolidated day timeline<br/>[packages/domain/src/calculator/regular/regularByDay.calculator.ts]"]
    calendar_types["CalendarEventKind / WorkDayMeta<br/>knessetNumber; calendarKnessetNumbers<br/>[packages/domain/src/types/types.ts]"]
    shabbat_credit["allocateShabbatCredit — exported credit allocation API<br/>[packages/domain/src/calculator/shabbat-credit.calculator.ts]"]
    reference_resolver["createReferenceResolver — rate by month, unavailable is explicit<br/>[packages/domain/src/reference/reference-resolver.ts]"]
    monthly_timeline["MonthlyTimeline<br/>[packages/domain/src/reference/timeline.ts]"]
    baseline["BASELINE_REFERENCES — embedded fallback timelines<br/>[packages/domain/src/reference/baseline.ts]"]
    system_start["SYSTEM_START_DATE<br/>[packages/domain/src/constants/system.constant.ts]"]
  end
  node_0 --> rate_pipeline
  node_0 --> baseline
  node_0 -->|"resolver type"| reference_resolver
  rate_pipeline --> reference_resolver
  baseline --> reference_resolver
  reference_resolver --> monthly_timeline
  reference_resolver --> system_start
  node_0 --> day_from_shifts
  node_0 -->|"policy type"| addition_classifier
  node_19 --> addition_classifier
  node_9 --> addition_classifier
  node_9 --> base_hours
  node_4 --> regular_day
  node_7 -.->|"calculateFromTimeline via injected calculator"| regular_day
  regular_day --> base_hours
  base_hours --> election_hours
  base_hours -->|"metadata type"| calendar_types
  election_hours -->|"timeline and election metadata types"| calendar_types
  node_8 -->|"build election metadata"| calendar_types
  node_0 -->|"depends on"| node_4
  node_0 -->|"depends on"| node_13
  node_0 -->|"depends on"| node_14
  node_0 -->|"depends on"| node_1
  node_0 -->|"depends on"| node_3
  node_0 -->|"depends on"| node_12
  node_0 -->|"depends on"| node_19
  node_1 -->|"depends on"| node_7
  node_1 -->|"depends on"| node_8
  node_3 -->|"depends on"| node_17
  node_3 -->|"depends on"| node_18
  node_3 -->|"depends on"| node_11
  node_3 -->|"depends on"| node_15
  node_3 -->|"depends on"| node_16
  node_6 -->|"depends on"| node_14
  node_6 -->|"depends on"| node_13
  node_6 -->|"depends on"| node_10
  node_6 -->|"depends on"| node_9
  node_8 -->|"depends on"| node_12
  node_8 -->|"depends on"| node_13
  node_10 -->|"depends on"| node_13
  node_11 -->|"depends on"| node_17
  node_11 -->|"depends on"| node_18
  node_11 -->|"depends on"| node_16
  node_14 -->|"depends on"| node_13
  node_19 -->|"depends on"| node_6
  node_19 -->|"depends on"| node_9
  click node_0 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/composition.ts"
  click node_1 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildDayLayer.pipeline.ts"
  click node_3 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildMonthLayer.pipeline.ts"
  click node_4 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildCalculators.pipeline.ts"
  click node_6 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/builder/shiftmap.builder.ts"
  click node_7 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/builder/daypaymap.builder.ts"
  click node_8 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/builder/workdaysformonth.builder.ts"
  click node_9 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/timeline-shift-pay.calculator.ts"
  click node_10 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/timeline/classify-shift-timeline.ts"
  click node_11 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/month-pay-map.reducer.ts"
  click node_12 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/resolve/workdayinfo.resolver.ts"
  click node_13 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/services/date.service.ts"
  click node_14 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/services/shift.service.ts"
  click node_15 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/perdiem-month.reducer.ts"
  click node_16 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/workday-month.reducer.ts"
  click node_17 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/fixed-segment-month.reducer.ts"
  click node_18 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reducer/meal-allowance-month.reducer.ts"
  click node_19 "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildShiftLayer.pipeline.ts"
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  class node_0,node_1,node_3,node_4,node_6,node_7,node_8,node_9,node_10,node_11,node_12,node_13,node_14,node_15,node_16,node_17,node_18,node_19 toneAmber
  class rate_pipeline,day_from_shifts,addition_classifier,shabbat_credit toneAmber
  click rate_pipeline "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/pipelines/buildRateCalculators.pipeline.ts"
  click day_from_shifts "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/day-from-shifts.calculator.ts"
  click addition_classifier "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/additions/addition.classifier.ts"
  click shabbat_credit "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/shabbat-credit.calculator.ts"
  class base_hours,election_hours,regular_day,calendar_types toneAmber
  click base_hours "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/regular/base-hours.classifier.ts"
  click election_hours "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/election-hours.calculator.ts"
  click regular_day "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/calculator/regular/regularByDay.calculator.ts"
  click calendar_types "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/types/types.ts"
  click reference_resolver "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reference/reference-resolver.ts"
  click monthly_timeline "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reference/timeline.ts"
  click baseline "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/reference/baseline.ts"
  click system_start "https://github.com/dmaman86/shiftly/blob/main/packages/domain/src/constants/system.constant.ts"
  class reference_resolver,monthly_timeline,baseline,system_start toneAmber
```

<!-- /diagram:domain -->

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
  Accumulate calculated daily values into a fresh monthly breakdown whenever the daily pay maps change.

- **Resolvers**
  Multi-method decision services (day-type classification, available months) whose shape doesn't reduce to a single input/output calculation.

- **Composition**
  Centralized wiring of domain components via `pipelines/`. The public API is assembled in `packages/domain/src/composition.ts` and exported by `packages/domain/src/index.ts`; the web app imports `@shiftly/domain` and adapts it in `apps/web/src/app/domain/domain.instance.ts`.

### Presentation
<details>
<summary>Presentation</summary>

<!-- diagram:presentation -->

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
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include lazy page imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Selected module dependencies; arrows point from consumers to dependencies.
%% ProfilePage is public: guests get GuestProfileCard and LockedProfileHistory, so useProfileHistory only runs for a signed-in user.
%% Reference and election notices surface degraded data (API unreachable, stale cache) instead of silently computing without it.
flowchart TD
  subgraph group_ui["Presentation"]
    app["App<br/>[apps/web/src/app/App.tsx]"]
    routes["AppRoutes — /:lang/daily, monthly, calculation-rules, profile<br/>[apps/web/src/app/routes/AppRoutes.tsx]"]
    layout["Layout<br/>[apps/web/src/layout/Layout.tsx]"]
    view_switcher["ViewSwitcher — desktop and mobile navigation<br/>[apps/web/src/layout/view-switcher/components/ViewSwitcher.tsx]"]
    daily["DailyPage<br/>[apps/web/src/pages/DailyPage.tsx]"]
    monthly["MonthlySummaryPage<br/>[apps/web/src/pages/MonthlySummaryPage.tsx]"]
    rules["CalculationRulesPage<br/>[apps/web/src/pages/CalculationRulesPage.tsx]"]
    profile_page["ProfilePage — account or guest view<br/>[apps/web/src/pages/ProfilePage.tsx]"]
    work_table["WorkTable<br/>[apps/web/src/features/work-table/components/month/WorkTable.tsx]"]
    salary_summary["MonthlySalarySummary<br/>[apps/web/src/features/salary-summary/components/MonthlySalarySummary.tsx]"]
    config_panel["ConfigPanel<br/>[apps/web/src/features/config/ConfigPanel.tsx]"]
    monthly_boundary["MonthlyContentBoundary — scoped period replacement<br/>[apps/web/src/features/monthly-data/MonthlyContentBoundary.tsx]"]
    reference_notice["ReferenceDataNotice / ReferenceIssueNotice<br/>[apps/web/src/features/reference/ReferenceDataNotice.tsx]"]
    election_notice["ElectionDataNotice — election days missing or stale<br/>[apps/web/src/features/calendar/ElectionDataNotice.tsx]"]
    auth_controls["AuthControls<br/>[apps/web/src/features/auth/AuthControls.tsx]"]
    sign_in["GoogleSignInButton<br/>[apps/web/src/features/auth/GoogleSignInButton.tsx]"]
    guest_notice["GuestModeNotice<br/>[apps/web/src/features/auth/GuestModeNotice.tsx]"]
    account_card["AccountProfileCard — delete account<br/>[apps/web/src/features/auth/AccountProfileCard.tsx]"]
    guest_card["GuestProfileCard<br/>[apps/web/src/features/auth/GuestProfileCard.tsx]"]
    profile_history["ProfileHistory — persisted charts<br/>[apps/web/src/features/profile/components/ProfileHistory.tsx]"]
    locked_history["LockedProfileHistory — disabled range, locked charts<br/>[apps/web/src/features/profile/components/LockedProfileHistory.tsx]"]
    conflict_dialog["GuestDraftConflictDialog<br/>[apps/web/src/features/guest-draft/GuestDraftConflictDialog.tsx]"]
  end
  subgraph group_app["Application and state"]
    use_work_days["useWorkDays<br/>[apps/web/src/hooks/useWorkDays.ts]"]
    use_reference_status["useReferenceStatus<br/>[apps/web/src/hooks/useReferenceStatus.ts]"]
    profile_query["useProfileHistory<br/>[apps/web/src/features/profile/hooks/useProfileHistory.ts]"]
    guest_import["GuestDraftImportProvider<br/>[apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx]"]
  end
  subgraph group_data["Services"]
    account_service["account.service — DELETE /me/account<br/>[apps/web/src/services/account/account.service.ts]"]
    api_error["resolveApiErrorMessage — API codes to i18n messages<br/>[apps/web/src/utils/api-error.resolve.util.ts]"]
  end
  app --> routes
  app --> layout
  layout --> view_switcher
  routes -->|"lazy"| daily
  routes -->|"lazy"| monthly
  routes -->|"lazy"| rules
  routes -->|"lazy"| profile_page
  daily --> work_table
  daily --> salary_summary
  daily --> config_panel
  daily --> monthly_boundary
  daily --> reference_notice
  daily --> election_notice
  daily --> auth_controls
  monthly --> salary_summary
  monthly --> config_panel
  monthly --> monthly_boundary
  monthly --> reference_notice
  monthly --> election_notice
  monthly --> auth_controls
  rules --> auth_controls
  work_table --> guest_notice
  guest_notice --> sign_in
  auth_controls --> sign_in
  profile_page -->|"user"| account_card
  profile_page -->|"user"| profile_history
  profile_page -->|"guest"| guest_card
  profile_page -->|"guest"| locked_history
  guest_card --> sign_in
  profile_history --> profile_query
  profile_history --> reference_notice
  profile_history --> election_notice
  election_notice --> use_work_days
  reference_notice --> use_reference_status
  guest_import --> conflict_dialog
  account_card --> account_service
  account_card --> api_error
  click app "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/App.tsx"
  click routes "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/routes/AppRoutes.tsx"
  click layout "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/layout/Layout.tsx"
  click view_switcher "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/layout/view-switcher/components/ViewSwitcher.tsx"
  click daily "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/DailyPage.tsx"
  click monthly "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/MonthlySummaryPage.tsx"
  click rules "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/CalculationRulesPage.tsx"
  click profile_page "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/pages/ProfilePage.tsx"
  click work_table "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/components/month/WorkTable.tsx"
  click salary_summary "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/salary-summary/components/MonthlySalarySummary.tsx"
  click config_panel "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/config/ConfigPanel.tsx"
  click monthly_boundary "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/MonthlyContentBoundary.tsx"
  click reference_notice "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/reference/ReferenceDataNotice.tsx"
  click election_notice "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/calendar/ElectionDataNotice.tsx"
  click auth_controls "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/AuthControls.tsx"
  click sign_in "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/GoogleSignInButton.tsx"
  click guest_notice "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/GuestModeNotice.tsx"
  click account_card "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/AccountProfileCard.tsx"
  click guest_card "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/auth/GuestProfileCard.tsx"
  click profile_history "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/components/ProfileHistory.tsx"
  click locked_history "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/components/LockedProfileHistory.tsx"
  click conflict_dialog "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/GuestDraftConflictDialog.tsx"
  click use_work_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useWorkDays.ts"
  click use_reference_status "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useReferenceStatus.ts"
  click profile_query "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/hooks/useProfileHistory.ts"
  click guest_import "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx"
  click account_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/account/account.service.ts"
  click api_error "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/utils/api-error.resolve.util.ts"
  classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class app,routes,layout,view_switcher,daily,monthly,rules,profile_page,work_table,salary_summary,config_panel,monthly_boundary,reference_notice,election_notice,auth_controls,sign_in,guest_notice,account_card,guest_card,profile_history,locked_history,conflict_dialog toneBlue
  class use_work_days,use_reference_status,profile_query,guest_import toneMint
  class account_service,api_error toneRose
```

<!-- /diagram:presentation -->

</details>

#### Application and UI Types
`apps/web/src/app/` is the application composition root. The web app imports the framework-independent `@shiftly/domain` package and adapts its public API for React. For example, application code calls `domain.payMap.calculateDayFromShifts(...)`.

Domain contracts remain under `packages/domain/src/types`. UI-facing models such as `PayBreakdownViewModel`, `CompactPayBreakdownVM`, and `WorkDayInfo` live under `apps/web/src/app/types`, because they describe presentation and application state rather than domain rules. Adapters and feature mappers convert domain results into those application models.

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

<!-- diagram:application -->

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
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Selected module dependencies; arrows point from consumers to dependencies. Profile reads do not hydrate editor state.
%% DomainProvider builds the payroll engine from the API's reference timelines, falling back to the embedded baseline.
%% Every user-data service call carries the owner it was issued for (expectedUserId); a session switch cancels it.
flowchart TD
  subgraph group_app["Application and state"]
    providers["AppProviders<br/>[apps/web/src/app/providers/AppProviders.tsx]"]
    auth_provider["AuthProvider — Supabase Auth session<br/>[apps/web/src/app/providers/auth/AuthProvider.tsx]"]
    domain_provider["DomainProvider<br/>[apps/web/src/app/providers/domain/DomainProvider.tsx]"]
    use_timelines["useReferenceTimelines — API, cache or baseline<br/>[apps/web/src/app/providers/domain/useReferenceTimelines.ts]"]
    reference_status["referenceStatusContext<br/>[apps/web/src/app/providers/domain/referenceStatusContext.ts]"]
    domain_instance["domain.instance — engine with a ReferenceResolver<br/>[apps/web/src/app/domain/domain.instance.ts]"]
    reference_issues["referenceIssues — months without reference values<br/>[apps/web/src/app/domain/referenceIssues.ts]"]
    month_resolver["month.resolver<br/>[apps/web/src/app/months/month.resolver.ts]"]
    snackbar["AppSnackbarProvider<br/>[apps/web/src/app/providers/snackbar/AppSnackbarProvider.tsx]"]
    monthly_data["MonthlyDataProvider — monthly config load and save<br/>[apps/web/src/features/monthly-data/MonthlyDataProvider.tsx]"]
    config_status["monthlyConfigStatusContext<br/>[apps/web/src/features/monthly-data/monthlyConfigStatusContext.ts]"]
    config_actions["monthlyConfigActionsContext<br/>[apps/web/src/features/monthly-data/monthlyConfigActionsContext.ts]"]
    guest_import["GuestDraftImportProvider — owner-bound confirmation<br/>[apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx]"]
    import_gate["guestDraftImportContext<br/>[apps/web/src/features/guest-draft/guestDraftImportContext.ts]"]
    month_session["useWorkTableMonthSession — days and shifts<br/>[apps/web/src/features/work-table/hooks/month/useWorkTableMonthSession.ts]"]
    shift_upserts["useDebouncedShiftUpserts<br/>[apps/web/src/features/work-table/hooks/month/useDebouncedShiftUpserts.ts]"]
    draft_capture["useGuestDraftCapture<br/>[apps/web/src/features/work-table/hooks/month/useGuestDraftCapture.ts]"]
    work_days["useWorkDays — holidays + election days<br/>[apps/web/src/hooks/useWorkDays.ts]"]
    profile_query["useProfileHistory<br/>[apps/web/src/features/profile/hooks/useProfileHistory.ts]"]
    profile_loader["profileHistory.service — read-only loading<br/>[apps/web/src/features/profile/services/profileHistory.service.ts]"]
    profile_history["profileHistory — pure calculation<br/>[apps/web/src/features/profile/helpers/profileHistory.ts]"]
    global_store["globalStore — Zustand<br/>[apps/web/src/store/globalStore.ts]"]
    use_auth["useAuth<br/>[apps/web/src/hooks/useAuth.ts]"]
    use_domain["useDomain<br/>[apps/web/src/hooks/useDomain.ts]"]
  end
  subgraph group_data["Services"]
    monthly_config_service["monthlyConfig.service<br/>[apps/web/src/services/monthlyConfig/monthlyConfig.service.ts]"]
    shift_service["shift.service<br/>[apps/web/src/services/shift/shift.service.ts]"]
    work_day_service["workDay.service<br/>[apps/web/src/services/workDay/workDay.service.ts]"]
    guest_draft_service["guestDraft.service<br/>[apps/web/src/services/guestDraft/guestDraft.service.ts]"]
    reference_timelines["referenceTimelines<br/>[apps/web/src/services/reference/referenceTimelines.ts]"]
    election_days["electionDays<br/>[apps/web/src/services/reference/electionDays.ts]"]
    israeli_holidays["israeliHolidays — computed with jewish-date<br/>[apps/web/src/services/calendar/israeliHolidays.ts]"]
  end
  external_query{{"TanStack Query — queries and mutations"}}
  external_supabase{{"Supabase Auth SDK"}}
  external_domain{{"@shiftly/domain"}}
  providers --> auth_provider
  providers --> domain_provider
  providers --> snackbar
  auth_provider -->|"session only"| external_supabase
  domain_provider --> use_timelines
  domain_provider --> domain_instance
  domain_provider --> reference_status
  use_timelines --> reference_timelines
  use_timelines --> reference_status
  domain_instance --> month_resolver
  domain_instance --> reference_issues
  domain_instance --> external_domain
  use_domain --> domain_provider
  monthly_data --> config_status
  monthly_data --> config_actions
  monthly_data --> import_gate
  monthly_data --> monthly_config_service
  monthly_data --> global_store
  monthly_data --> use_auth
  guest_import --> import_gate
  guest_import --> guest_draft_service
  guest_import --> shift_service
  guest_import --> work_day_service
  guest_import --> use_auth
  month_session --> shift_service
  month_session --> work_day_service
  month_session --> shift_upserts
  month_session --> draft_capture
  month_session --> import_gate
  month_session --> global_store
  month_session --> use_auth
  work_days --> election_days
  work_days --> israeli_holidays
  work_days -->|"calendar event types"| external_domain
  profile_query --> profile_loader
  profile_query --> work_days
  profile_query --> use_auth
  profile_query --> use_domain
  profile_query --> import_gate
  profile_loader --> monthly_config_service
  profile_loader --> shift_service
  profile_loader --> work_day_service
  profile_loader --> profile_history
  profile_history --> global_store
  providers --> external_query
  monthly_data --> external_query
  month_session --> external_query
  profile_query -->|"wait for writes; cancel stale reads"| external_query
  click providers "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/AppProviders.tsx"
  click auth_provider "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/auth/AuthProvider.tsx"
  click domain_provider "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/domain/DomainProvider.tsx"
  click use_timelines "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/domain/useReferenceTimelines.ts"
  click reference_status "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/domain/referenceStatusContext.ts"
  click domain_instance "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/domain/domain.instance.ts"
  click reference_issues "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/domain/referenceIssues.ts"
  click month_resolver "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/months/month.resolver.ts"
  click snackbar "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/app/providers/snackbar/AppSnackbarProvider.tsx"
  click monthly_data "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/MonthlyDataProvider.tsx"
  click config_status "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/monthlyConfigStatusContext.ts"
  click config_actions "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/monthly-data/monthlyConfigActionsContext.ts"
  click guest_import "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/GuestDraftImportProvider.tsx"
  click import_gate "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/guest-draft/guestDraftImportContext.ts"
  click month_session "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/hooks/month/useWorkTableMonthSession.ts"
  click shift_upserts "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/hooks/month/useDebouncedShiftUpserts.ts"
  click draft_capture "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/work-table/hooks/month/useGuestDraftCapture.ts"
  click work_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useWorkDays.ts"
  click profile_query "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/hooks/useProfileHistory.ts"
  click profile_loader "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/services/profileHistory.service.ts"
  click profile_history "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/features/profile/helpers/profileHistory.ts"
  click global_store "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/store/globalStore.ts"
  click use_auth "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useAuth.ts"
  click use_domain "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/hooks/useDomain.ts"
  click monthly_config_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/monthlyConfig/monthlyConfig.service.ts"
  click shift_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/shift/shift.service.ts"
  click work_day_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/workDay/workDay.service.ts"
  click guest_draft_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/guestDraft/guestDraft.service.ts"
  click reference_timelines "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/referenceTimelines.ts"
  click israeli_holidays "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/calendar/israeliHolidays.ts"
  click election_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/electionDays.ts"
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class providers,auth_provider,domain_provider,use_timelines,reference_status,domain_instance,reference_issues,month_resolver,snackbar,monthly_data,config_status,config_actions,guest_import,import_gate,month_session,shift_upserts,draft_capture,work_days,profile_query,profile_loader,profile_history,global_store,use_auth,use_domain toneMint
  class monthly_config_service,shift_service,work_day_service,guest_draft_service,reference_timelines,election_days,israeli_holidays toneRose
```

<!-- /diagram:application -->

</details>

#### State Management
- **Zustand** handles global period configuration and daily pay maps
- **React Context** owns authentication, dependency injection, UI integration boundaries, and the current work-table editing session
- **TanStack Query** coordinates authenticated work-table reads and writes through apps/api
- Daily pay maps are updated by date key, and the monthly breakdown is derived deterministically from the current maps

Global Zustand state:

- `apps/web/src/store/globalStore.ts`
- `apps/web/src/store/globalBreakdown.ts`

### Data
<details>
<summary>Data</summary>

<!-- diagram:data -->

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
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% Web data access. Solid arrows point from consumers to dependencies; dashed arrows are HTTP calls and browser storage.
%% supabase.client is used for authentication only (lint-enforced); user data and reference data come from apps/api.
%% apiClient attaches the session token on request, refreshes once on 401 and drops a call whose owner is no longer signed in.
flowchart TD
  subgraph group_data["Services and adapters (apps/web)"]
    api_client["apiClient — axios, bearer token, single refresh,<br/>expectedUserId guard, typed error codes<br/>[apps/web/src/services/api/client.ts]"]
    supabase_client["supabase.client — Auth only<br/>[apps/web/src/services/supabase/supabase.client.ts]"]
    monthly_config_service["monthlyConfig.service — /me/months/:y/:m/config, shabbat-credit<br/>[apps/web/src/services/monthlyConfig/monthlyConfig.service.ts]"]
    work_day_service["workDay.service — /me/months/:y/:m/work-days, /me/work-days/:date<br/>[apps/web/src/services/workDay/workDay.service.ts]"]
    shift_service["shift.service — /me/months/:y/:m/shifts, /me/shifts/:id<br/>[apps/web/src/services/shift/shift.service.ts]"]
    guest_draft_service["guestDraft.service — /me/months/:y/:m/guest-import<br/>[apps/web/src/services/guestDraft/guestDraft.service.ts]"]
    guest_draft_storage["guestDraft.storage — signed-out draft<br/>[apps/web/src/services/guestDraft/guestDraft.storage.ts]"]
    account_service["account.service — DELETE /me/account<br/>[apps/web/src/services/account/account.service.ts]"]
    reference_service["reference.service — /reference/elections, /reference/timelines<br/>[apps/web/src/services/reference/reference.service.ts]"]
    reference_timelines["referenceTimelines<br/>[apps/web/src/services/reference/referenceTimelines.ts]"]
    timeline_cache["timelineCache — last known timelines<br/>[apps/web/src/services/reference/timelineCache.ts]"]
    election_days["electionDays<br/>[apps/web/src/services/reference/electionDays.ts]"]
    election_cache["electionCache — last known election days<br/>[apps/web/src/services/reference/electionCache.ts]"]
    israeli_holidays["israeliHolidays — computed with jewish-date<br/>[apps/web/src/services/calendar/israeliHolidays.ts]"]
    analytics["analytics.service / gtag<br/>[apps/web/src/services/analytics/analytics.service.ts]"]
    holiday_adapter["holiday.adapter<br/>[apps/web/src/adapters/holiday.adapter.ts]"]
    election_adapter["election.adapter<br/>[apps/web/src/adapters/election.adapter.ts]"]
    timelines_adapter["referenceTimelines.adapter<br/>[apps/web/src/adapters/referenceTimelines.adapter.ts]"]
    pay_vm["dayToPayBreakdownVM / monthToPayBreakdownVM<br/>[apps/web/src/adapters/monthToPayBreakdownVM.ts]"]
    api_error["resolveApiErrorMessage — API client codes to messages<br/>[apps/web/src/utils/api-error.resolve.util.ts]"]
  end
  external_domain{{"@shiftly/domain"}}
  local_storage[("localStorage")]
  api{{"apps/api"}}
  sb_auth{{"Supabase Auth"}}
  external_analytics{{"Google Analytics (gtag)"}}
  monthly_config_service --> api_client
  work_day_service --> api_client
  shift_service --> api_client
  guest_draft_service --> api_client
  guest_draft_service -->|"draft type"| guest_draft_storage
  account_service --> api_client
  reference_service --> api_client
  api_client -->|"session token, user id"| supabase_client
  reference_timelines --> reference_service
  reference_timelines --> timeline_cache
  reference_timelines --> timelines_adapter
  election_days --> reference_service
  election_days --> election_cache
  timeline_cache --> reference_service
  election_cache --> reference_service
  holiday_adapter --> israeli_holidays
  election_adapter --> reference_service
  timelines_adapter --> external_domain
  holiday_adapter --> external_domain
  election_adapter --> external_domain
  pay_vm --> external_domain
  shift_service -->|"shift types"| external_domain
  work_day_service -->|"status enum"| external_domain
  api_client -.->|"HTTPS"| api
  supabase_client -.->|"OAuth, session refresh"| sb_auth
  guest_draft_storage -.-> local_storage
  timeline_cache -.-> local_storage
  election_cache -.-> local_storage
  analytics -.-> external_analytics
  click api_client "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/api/client.ts"
  click supabase_client "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/supabase/supabase.client.ts"
  click monthly_config_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/monthlyConfig/monthlyConfig.service.ts"
  click work_day_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/workDay/workDay.service.ts"
  click shift_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/shift/shift.service.ts"
  click guest_draft_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/guestDraft/guestDraft.service.ts"
  click guest_draft_storage "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/guestDraft/guestDraft.storage.ts"
  click account_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/account/account.service.ts"
  click reference_service "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/reference.service.ts"
  click reference_timelines "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/referenceTimelines.ts"
  click timeline_cache "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/timelineCache.ts"
  click election_days "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/electionDays.ts"
  click election_cache "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/reference/electionCache.ts"
  click israeli_holidays "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/calendar/israeliHolidays.ts"
  click analytics "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/services/analytics/analytics.service.ts"
  click holiday_adapter "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/holiday.adapter.ts"
  click election_adapter "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/election.adapter.ts"
  click timelines_adapter "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/referenceTimelines.adapter.ts"
  click pay_vm "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/adapters/monthToPayBreakdownVM.ts"
  click api_error "https://github.com/dmaman86/shiftly/blob/main/apps/web/src/utils/api-error.resolve.util.ts"
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  class api_client,supabase_client,monthly_config_service,work_day_service,shift_service,guest_draft_service,guest_draft_storage,account_service,reference_service,reference_timelines,timeline_cache,election_days,election_cache,israeli_holidays,analytics,holiday_adapter,election_adapter,timelines_adapter,pay_vm,api_error toneRose
```

<!-- /diagram:data -->

</details>

#### Adapters
Convert domain objects into UI-friendly view models.
This ensures the domain never depends on presentation concerns.

### Backend API
<details>
<summary>Backend API</summary>

<!-- diagram:api -->

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
%% Source: v1.1.0 (release candidate; source HEAD). Module dependencies include type imports. Commit: 581f74ea896bfef47de8892d99903c263df9c7c5.
%% apps/api on Cloud Run. Solid arrows point from consumers to dependencies; dashed arrows are calls to external systems.
%% services/ and ports/ never import Express, Supabase or adapters (ESLint-enforced); repositories/ implement the ports.
%% User-owned tables and api_* functions are reached only through UserScope, which pins every query to the verified caller.
flowchart TD
  subgraph entry["Entry points"]
    server["server.ts — reads config, builds adapters, listens<br/>[apps/api/src/server.ts]"]
    app["app.ts — middleware order and route mounting<br/>[apps/api/src/app.ts]"]
    config["config — env files and validation<br/>[apps/api/src/config/env.ts]"]
    cli["cli — election:record, election:activate,<br/>reference:activate, research<br/>[apps/api/src/cli/]"]
  end
  subgraph http["middleware/ and routes/"]
    middleware["cors, json-body (no compressed bodies), request-log<br/>[apps/api/src/middleware/]"]
    auth_mw["requireAuth, requireFreshSession, requireAdmin<br/>[apps/api/src/middleware/auth.ts]"]
    reference_routes["GET /reference/elections, /reference/timelines<br/>Public, cached<br/>[apps/api/src/routes/published-elections-router.ts]"]
    me_routes["/me — config, work-days, shifts,<br/>guest-import, account<br/>[apps/api/src/routes/]"]
    admin_routes["/admin/income-tax/:year<br/>Admin only<br/>[apps/api/src/routes/rules-router.ts]"]
  end
  subgraph core["services/ and ports/ — framework-free"]
    month_period["month-period — month and date bounds<br/>[apps/api/src/services/month-period.ts]"]
    published["published-elections / published-timelines<br/>Validate what is published<br/>[apps/api/src/services/published-timelines.ts]"]
    activation["election-record, election-activation,<br/>timeline-activation, store-candidates<br/>[apps/api/src/services/]"]
    ports["ports — AuthVerifier, RoleRepository,<br/>RevisionRepository<br/>[apps/api/src/ports/]"]
    errors["UserDataError + HTTP mapping<br/>[apps/api/src/errors/user-data-errors.ts]"]
  end
  subgraph adapters["repositories/ — Supabase adapters"]
    user_scope["UserScope — select/delete pinned to user_id,<br/>rpc only api_* with p_user_id<br/>[apps/api/src/repositories/user-scope.ts]"]
    user_repos["monthly-config, work-days, shifts,<br/>guest-import repositories<br/>[apps/api/src/repositories/]"]
    auth_adapters["supabase-auth-verifier, supabase-role-repository<br/>[apps/api/src/repositories/supabase-auth-verifier.ts]"]
    account_deleter["account-deleter — Auth admin API<br/>[apps/api/src/repositories/account-deleter.ts]"]
    reference_readers["cached + supabase published readers,<br/>revision repository<br/>[apps/api/src/repositories/]"]
  end
  research["research/ — income tax, social security,<br/>evidence, source policy<br/>[apps/api/src/research/]"]
  sb_auth{{"Supabase Auth"}}
  sb_db[("Supabase Postgres")]
  gemini{{"Google AI (Gemma)"}}
  sources{{"Public sources<br/>Wikipedia, Kol Zchut, BTL, Wayback"}}
  server --> config
  server --> app
  server -->|"builds"| user_scope
  server -->|"builds"| auth_adapters
  server -->|"builds"| account_deleter
  server -->|"builds"| reference_readers
  cli --> config
  cli --> activation
  cli --> reference_readers
  cli --> research
  app --> middleware
  app --> auth_mw
  app --> reference_routes
  app --> me_routes
  app --> admin_routes
  app --> errors
  auth_mw --> ports
  reference_routes --> published
  me_routes --> auth_mw
  me_routes --> month_period
  me_routes --> user_repos
  me_routes --> user_scope
  me_routes --> account_deleter
  admin_routes --> research
  research -->|"store candidates, coverage"| activation
  research --> ports
  month_period --> errors
  activation --> ports
  activation --> research
  user_repos --> month_period
  user_scope --> ports
  user_scope --> errors
  auth_adapters -->|"implements"| ports
  reference_readers -->|"implements"| ports
  reference_readers --> published
  account_deleter --> errors
  auth_adapters -.->|"verify token, revalidate session, roles"| sb_auth
  account_deleter -.->|"admin.deleteUser; rows cascade"| sb_auth
  user_scope -.->|"service_role"| sb_db
  reference_readers -.->|"published revisions"| sb_db
  research -.-> gemini
  research -.-> sources
  click server "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/server.ts"
  click app "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/app.ts"
  click config "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/config/env.ts"
  click cli "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/cli"
  click middleware "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/middleware"
  click auth_mw "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/middleware/auth.ts"
  click reference_routes "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/routes/published-elections-router.ts"
  click me_routes "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/routes"
  click admin_routes "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/routes/rules-router.ts"
  click month_period "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/services/month-period.ts"
  click published "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/services/published-timelines.ts"
  click activation "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/services"
  click ports "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/ports"
  click errors "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/errors/user-data-errors.ts"
  click user_scope "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/user-scope.ts"
  click user_repos "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/repositories"
  click auth_adapters "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/supabase-auth-verifier.ts"
  click account_deleter "https://github.com/dmaman86/shiftly/blob/main/apps/api/src/repositories/account-deleter.ts"
  click reference_readers "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/repositories"
  click research "https://github.com/dmaman86/shiftly/tree/main/apps/api/src/research"
  classDef toneViolet fill:#ede9fe,stroke:#7c3aed,stroke-width:1.5px,color:#2e1065
  classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
  classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  class server,app,config,cli toneMint
  class middleware,auth_mw,reference_routes,me_routes,admin_routes toneViolet
  class month_period,published,activation,ports,errors toneAmber
  class user_scope,user_repos,auth_adapters,account_deleter,reference_readers toneRose
  class research toneViolet
```

<!-- /diagram:api -->

</details>

`apps/api` runs on Cloud Run. The browser signs in with Supabase Auth and sends
its access token; the API verifies it, and reaches user data only through
`UserScope`, which pins every query to the verified caller. See
[apps/api/README.md](../../apps/api/README.md) for the layout and the
dependency rule.

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
- **Holiday day-type classification**: Hebrew-calendar rules computed in the browser

The base progression is accumulated across the continuous Regular timeline: the first configured `standardHours` interval is 100%, the next `midTierThreshold` hours are 125%, and the remaining hours are 150%. Midnight and special-time boundaries do not reset that progression. Evening/night additions are evaluated independently through a date-based policy. Evening qualification requires at least three qualifying regular hours within one shift on the same calendar date; separate shifts on that date do not combine their qualifying hours. Cross-day shifts are evaluated separately for each calendar date within the shift.

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

### Knesset Election Day

Knesset elections remain separate from religious `yomtov` holidays. The event adapter recognizes `category: "election"`, `subcat: "knesset"` and `knessetNumber`, and carries the number into day metadata for translated desktop/mobile badges. Adjacent election dates are available to cross-midnight shifts through `calendarKnessetNumbers`.

Under the owner-specified payroll rule, regular work overlapping **07:00–22:00 on the election calendar date** earns an additional 100%. The premium is added to `regular.hours100.hours` after the normal 100/125/150 progression. It does not consume `standardHours`, change overtime tiers, increase `actualHours`/`totalHours`, or apply to special intervals or unworked absences. Evening/night additions remain separate. These 100% hours are pay-equivalent quantities, not all actual worked time.

For 2021-03-23, 06:37–14:32 with seven standard hours: actual work is `475/60`, election overlap is `452/60`, 100% is `7 + 452/60` and 125% is `55/60`. The UI shows 7.92 actual hours, 14.53 at 100% and 0.92 at 125%; internal calculations retain minute precision. This is the agreed implementation contract, not independently verified legal entitlement.

Holidays are computed in the browser from Hebrew-calendar rules; there are no static calendar files. Knesset election days are reference data in the database: an admin records each election with its official evidence and activates it (`election:record`, `election:activate` in apps/api), and the app reads the published days from `GET /reference/elections`. When the API cannot be reached, the app keeps its last known answer or warns that election days are missing. See [scripts](../../scripts/README.md) and [validation limitations](../../VALIDATION.md).

### Reducers

Accumulate breakdowns from an empty state. Monthly totals are derived from the current daily pay maps, not maintained through inverse updates:

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
- **jewish-date** 2.0.29 (Hebrew calendar for holiday computation)
- **Supabase** 2.112.4 (Google OAuth in the browser; Postgres through `apps/api`)

### Backend (`apps/api`)

- **Node.js** 24 (type stripping, no build step) on **Google Cloud Run**
- **Express** 5.3
- **Zod** 4 (request and environment validation)
- **Supabase** 2.112.4 with the secret key, behind `UserScope`
- **Google Gen AI** 2.27 (admin-only reference-data research)

### Testing

- **Vitest** 4
- **Testing Library** (React, Jest-DOM, User Event)
- **Playwright** 1.63 (Chromium and WebKit end-to-end tests)
- **pgTAP** (database privileges, Row Level Security and backend-only functions)

---

## Testing

Shiftly uses **Vitest** for unit and integration testing, with a focus on domain logic validation.

### Running Tests

```bash
# Run tests in watch mode
bun run test

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage

# Run tests in CI mode (single run)
bun run test:ci

# Database tests (pgTAP); needs the Supabase CLI and Docker
bun run test:db
```

`bun run test` covers the web app, `@shiftly/domain` and `apps/api`.

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
bun run test:e2e

# Open Playwright UI mode
bun run test:e2e:ui

# Run with a visible browser
bun run test:e2e:headed
```

The golden month scenarios (inputs and expected outputs) are stored in:

```text
e2e/
├── fixtures/
│   ├── august-2026.json / august-2026.result.json
│   ├── march-2021.json / march-2021.result.json
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

Every fixture is verified by the Vitest integration test `apps/web/src/test/integration/work-table-month-fixtures.test.ts`, which runs the same calculation path as the app without a browser. Playwright drives March 2021 and August 2026 through the UI (desktop English/Hebrew and Android Hebrew), including the election badge. The loader uses the yearly static calendar unless the fixture supplies an explicit calendar override. March 2021 was generated as a starting point, then corrected by the owner against their own actual payslip, as confirmed on 2026-10-19. Its current expected values are owner-confirmed real-world references compared at two decimals. Preserve those corrections; do not replace them with regenerated domain output to make tests pass.

Locally, Playwright starts an isolated Vite server on `127.0.0.1:4173` with the `/shiftly/` base path, aliases the domain to current source, disables HMR and does not build or reuse another server. In CI it serves the prebuilt `dist/` with `vite preview`. Calendar requests are mocked from scenario data to keep tests deterministic. The desktop flow closes each verified day breakdown and waits for its exit transition before continuing; controls are centered away from the sticky footer.
The CI workflow installs Chromium and WebKit and runs the E2E suite automatically.

### Quality Checks and Production Build

```bash
# Type-check the application and Vite configuration
bun run typecheck

# Run static analysis
bun run lint

# Create the production bundle in dist/
bun run build
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
bun install
bun run dev

# Alternative package manager:
# bun install --frozen-lockfile
# bun run dev
```

Visit `http://localhost:5173/shiftly` in your browser.

### Sign-in and Persistence Setup (optional)

Guest mode works with no setup at all — nothing is persisted, no account required.

Signing in and saving data needs a Supabase project and the Shiftly API.

1. **Web app.** Create `.env.local` in the repository root:

   ```bash
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   VITE_API_URL=http://localhost:3000
   ```

2. **API.** Create `apps/api/.env` with the variables listed in
   [apps/api/README.md](../../apps/api/README.md#environment), then run
   `bun run dev:api`. The secret key stays in the API: never give it a `VITE_`
   prefix.

3. **Redirects.** Google sign-in always returns to the app root
   (`<origin>/shiftly/`) and then restores the page the user started from.
   Under **Authentication → URL Configuration → Redirect URLs**, allow that
   root for every origin you use, for example:

   ```text
   https://dmaman86.github.io/shiftly/**
   http://localhost:5173/shiftly/**
   ```

4. **Database.** Apply the migrations in `supabase/migrations/` with
   `supabase db push` (or run them in order in the SQL Editor). They create the
   `monthly_configs`, `work_days` and `shifts` tables, their Row Level Security
   policies and the backend-only functions the API calls.

Account deletion goes through the API (`DELETE /me/account`): it revalidates the
session with Supabase Auth, then deletes the user with the secret key. The table
foreign keys use `on delete cascade`, so the user's rows go with them. The
`supabase/functions/delete-account` Edge Function that did this before is no
longer called and is being retired.

---

## Project Structure

```plaintext
.
├── .github/
│   ├── assets/                 # README screenshots
│   └── workflows/              # CI, pull-request checks, deployment
├── docs/
│   └── architecture/           # Current diagrams and per-tag history
├── e2e/                         # Playwright end-to-end tests and fixtures
├── playwright.config.ts         # Playwright configuration
├── scripts/                     # Diagram sync and reference-timeline diagnostics
├── apps/api/src/                # Backend on Cloud Run (see apps/api/README.md)
│   ├── middleware/             # CORS, JSON body, request log, authentication
│   ├── routes/                 # /reference, /me and /admin routers
│   ├── services/               # Framework-free rules
│   ├── ports/                  # Interfaces the services depend on
│   ├── repositories/           # Supabase adapters, including UserScope
│   ├── research/               # Admin reference-data research pipelines
│   └── cli/                    # Admin commands
├── apps/web/src/
│   ├── adapters/               # External data and domain-to-view adapters
│   ├── app/                    # Application composition root
│   │   ├── domain/             # Domain instance and application-facing types
│   │   ├── types/              # Application and UI view models
│   │   ├── providers/          # Auth, direction, domain and snackbar providers
│   │   └── routes/             # Application and language-aware routing
│   ├── constants/              # Shared domain and UI constants
│   ├── components/             # Shared presentational UI components
│   ├── features/               # Feature-owned UI and orchestration
│   │   ├── auth/               # Google sign-in controls
│   │   ├── calculation-rules/  # Rules and interactive calculation example
│   │   ├── config/             # Work parameters and persisted monthly config
│   │   ├── feedback/           # User feedback notifications
│   │   ├── info-dialog/        # Application information dialog
│   │   ├── monthly-data/       # Monthly configuration hydration and persistence
│   │   ├── monthly-pay/        # Derived monthly pay and Shabbat credit allocation
│   │   │   └── hooks/          # Allocation calculation and carry-over persistence
│   │   ├── profile/            # Read-only history, metrics, charts and range selection
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
│   ├── pages/                  # Daily, monthly, calculation-rules and profile pages
│   ├── store/                  # Zustand global state and breakdown calculations
│   ├── services/               # Analytics, apps/api and Supabase Auth clients
│   ├── test/                   # Web app, store, service and UI test suites
│   └── utils/                  # API result handling and shared helpers
├── packages/
│   └── domain/
│       ├── src/                 # Framework-independent payroll engine and public index.ts
│       └── tests/               # Domain tests, independent from React
└── supabase/
    ├── functions/               # Legacy delete-account Edge Function (being retired)
    ├── migrations/              # Schema, Row Level Security and backend-only functions
    └── tests/                   # pgTAP database tests
```

---

## Why This Architecture?

This architecture was chosen to handle:

- Complex salary rules
- Time-based edge cases (cross-day shifts, partial days)
- Multiple aggregation levels (shift → day → month)
- Deterministic monthly aggregation from the current daily pay maps
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

Shiftly provides two main calculation views, a public rules page, and an authenticated profile:

| Route | Access | Purpose |
| --- | --- | --- |
| `/:lang/daily` | Public | Shift entry and daily breakdowns |
| `/:lang/monthly` | Public | Monthly salary calculation |
| `/:lang/calculation-rules` | Public | Calculation rules, interactive example and demo |
| `/:lang/profile` | Authenticated | Account card and saved monthly history |

`:lang` is `he` or `en`; routes run under the configured application base path.

### Daily View

- Focused on day-by-day shift input
- Allows adding, editing, and validating shifts
- Displays per-day breakdown
- Monthly totals are recomputed from an empty breakdown when daily pay maps change
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

### Profile and Historical Charts

The profile account card is separate from the public calculation-rules page. Desktop and mobile navigation expose the profile only to signed-in users. Direct profile URLs wait for authentication initialization; guests are redirected to `/:lang/calculation-rules` in the same language, preserving query parameters. Supabase RLS remains the server-side ownership boundary.

The three charts use saved monthly configurations, day statuses and shifts:

- **Actual Hrs vs Payable Hrs:** actual hours exclude sick leave and vacation; payable hours include paid absences and applied Shabbat credit, without overtime multipliers.
- **Base Hours vs Overtime Hours:** hours in the 100% segment versus the 125% and 150% segments. Evening, night and Shabbat additions are not extra worked time.
- **Total Payment composition:** base pay, extras and allowances sum to the unedited salary summary's calculated gross total. Extras include full overtime pay, not just the premium; allowances include per diem and meals. This is not net pay or proof of payment received.

One selector above all three charts offers the last **3, 6 or 12 months**, **this year** (January through the current month), and **custom start/end months**. Six months is the default. Custom endpoints are inclusive and take effect only after **Apply range**; invalid or reversed drafts leave the active range unchanged. Dates are limited to November 2015 through the current month, and only the actual current month is marked partial.

History is read-only and recalculated with the current domain engine, not an immutable payroll snapshot. It uses saved previous-month Shabbat carry-over and excludes temporary salary-summary quantity overrides. Missing records are distinct from zero-hour months; payment is unavailable without a positive saved hourly rate. Loading failures show a retry action instead of incomplete chart totals.

History queries are scoped to the user and both range endpoints, wait for pending writes/imports, discard obsolete reads, and load in three-month batches. Charts provide keyboard/touch tooltips and expandable exact-value tables using existing MUI/CSS components. English and Hebrew translations live under `profile_page` in their respective `pages.json`, not a separate namespace.

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
