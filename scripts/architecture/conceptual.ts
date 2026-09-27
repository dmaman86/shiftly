import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import type { ArchitectureTarget } from "./config.ts";
import { normalizeMermaid } from "./diagram.ts";

export interface ConceptualDiagram {
  status: "available" | "unavailable";
  mermaid?: string;
  fingerprint?: string;
  reason?: string;
}

const diagrams: Record<string, string> = {
  overview: `flowchart TB
    user["User"]
    e2e["E2E Testing System<br/>(Playwright, Fixtures)"]

    subgraph shiftly["Shiftly Application System"]
      client["Client Application<br/>(UI, Routing, Global State)"]
      domain["Domain Logic Engine<br/>(PayMap Pipeline, Builders, Calculators)"]
      supabase["Supabase Services<br/>(Auth, Edge Functions, Client)"]

      client --> domain
      client --> supabase
    end

    google["Google Auth Service"]
    database["PostgreSQL Database<br/>(User Data, RLS)"]

    user --> client
    e2e --> client
    google --> client
    supabase --> database`,
  domain: `flowchart TB
    components["{Reducer | Calculator | Builder}"]
    breakdowns["{Pay Breakdowns | Time-based Aggregations}"]
    bundles["{PayCalculationBundle | WorkDayReducerBundle | FixedSegmentBundle | PerDiemBundle | MealAllowanceBundle}"]
    layers["{CoreServices | Resolvers | Calculators | RateCalculators | ShiftLayer | DayLayer | MonthLayer}"]
    pipeline["PayMapPipeline"]

    components -->|"operate on"| breakdowns
    components -->|"implemented by"| layers
    breakdowns -->|"grouped into"| bundles
    bundles -->|"composed in"| layers
    layers -->|"integrated into"| pipeline`,
  "work-table": `flowchart LR
    subgraph workTable["Work Table Feature"]
      workTableUi["WorkTable & DayRow<br/>(UI Components)"]
      workTableState["WorkTableDayStateProvider<br/>useWorkTableMonthSession<br/>(State Management)"]
      workTableMappers["Work Table Mappers"]

      workTableUi -->|"uses/updates"| workTableState
      workTableState -->|"transforms data"| workTableMappers
    end

    subgraph salarySummary["Salary Summary Feature"]
      salaryUi["MonthlySalarySummary<br/>& SalaryCardSection<br/>(UI Components)"]
      salaryMappers["Salary Summary Mappers"]

      salaryUi -->|"processes data"| salaryMappers
    end

    globalStore["Global State Store"]

    workTableState -->|"persists/hydrates"| globalStore
    workTableMappers -->|"updates breakdowns"| globalStore
    globalStore -->|"provides aggregated data"| salaryUi
    salaryUi -->|"reads breakdowns"| globalStore`,
  "application-state": `flowchart TB
    components["React Components"]
    globalStateHook["useGlobalState Hook"]
    globalBreakdownHook["useGlobalBreakdown Hook"]
    globalStore["Zustand Global Store<br/>(useGlobalStore)"]
    breakdownCalculator["Global Breakdown Calculator<br/>(calculateGlobalBreakdown)"]
    state["Global State<br/>(GlobalState, initialGlobalState)"]

    components -->|"uses"| globalStateHook
    components -->|"uses"| globalBreakdownHook
    globalStateHook -->|"accesses"| globalStore
    globalBreakdownHook -->|"reads dailyPayMaps from"| globalStore
    globalBreakdownHook -->|"uses"| breakdownCalculator
    globalStore -->|"manages"| state
    breakdownCalculator -->|"processes dailyPayMaps from"| state`,
  data: `flowchart LR
    features["Application Features"]
    monthlyData["Monthly Data Provider<br/>(Hydration & Persistence)"]
    services["Feature Services<br/>(Monthly Config, Work Days, Shifts, Account)"]
    adapters["Data Adapters<br/>(Domain-to-View Models)"]
    supabase["Supabase Client & CRUD"]
    database["PostgreSQL Database<br/>(RLS-Protected Tables)"]

    features -->|"reads and updates"| monthlyData
    monthlyData -->|"uses"| services
    features -->|"maps results through"| adapters
    services -->|"persists and queries"| supabase
    supabase -->|"reads and writes"| database`,
};

const legacyDomainDiagram = `flowchart TB
    components["{Builder | Calculator | Factory}"]
    breakdowns["{Pay Breakdowns | Time-based Aggregations}"]
    reducers["{Reducers | Resolvers}"]
    pipeline["PayMapPipeline"]

    components -->|"operate on"| breakdowns
    breakdowns -->|"aggregated by"| reducers
    components -->|"composed by"| pipeline
    reducers -->|"integrated into"| pipeline`;

const resolveDiagram = (worktreePath: string, target: ArchitectureTarget) => {
  if (
    target.name === "domain" &&
    !existsSync(path.resolve(worktreePath, "src/domain/pipelines"))
  ) {
    return legacyDomainDiagram;
  }
  return diagrams[target.name];
};

export const createConceptualDiagram = () => ({
  async generate(worktreePath: string, target: ArchitectureTarget): Promise<ConceptualDiagram> {
    const sourceRoot = path.resolve(worktreePath, target.sourceRoot);
    const diagram = resolveDiagram(worktreePath, target);

    if (!diagram) {
      return { status: "unavailable", reason: "No conceptual diagram for " + target.name };
    }
    if (!existsSync(sourceRoot)) {
      return { status: "unavailable", reason: "No source matches " + target.focus };
    }

    const mermaid = normalizeMermaid(diagram);
    return {
      status: "available",
      mermaid,
      fingerprint: createHash("sha256").update(mermaid).digest("hex"),
    };
  },
});
