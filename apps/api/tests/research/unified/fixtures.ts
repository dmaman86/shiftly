import { z } from "zod";
import type {
  ResearchSpec,
  ResearchTask,
  ResearchFinding,
  GroundedAnswer,
  ResearchRequest,
  ResearchStore,
  ResearchSnapshot,
} from "../../../src/research/contracts.ts";
import { vi } from "vitest";

/** Synthetic data, not Israeli reference values or a captured provider response. */
export const REQUEST: Extract<
  ResearchRequest,
  { requestUnit: "calendar_month" }
> = {
  requestUnit: "calendar_month",
  domain: "income-tax",
  year: 2026,
  month: 2,
  parameters: ["income_tax.credit_point"],
};
export const SPEC: ResearchSpec = {
  id: "synthetic-tax",
  version: 1,
  domain: "income-tax",
  population: "Synthetic employee population",
  sourcePriority: ["Official synthetic fixture"],
  researchInstructions: "Synthetic fixture only",
  refreshPolicy: { intervalDays: 90, unresolvedDays: 30 },
  validateFinding: (finding) =>
    z
      .strictObject({ monthlyValue: z.number().positive() })
      .safeParse(finding.value).success
      ? []
      : ["Invalid value"],
};
export const TASK: ResearchTask = {
  id: "synthetic-task",
  specId: SPEC.id,
  specVersion: 1,
  asOfDate: "2026-02-20",
  request: REQUEST,
  currentValues: [],
};
export const FINDING: ResearchFinding = {
  kind: "income_tax.credit_point",
  subjectKey: null,
  population: SPEC.population,
  validFrom: "2026-01-01",
  validTo: null,
  value: { monthlyValue: 123 },
  sourceUri: "https://www.gov.il/synthetic-fixture",
  quote: "Synthetic quote for tests only; not a real official parameter.",
};

export const answerFor = (
  task: ResearchTask = TASK,
  findings: readonly ResearchFinding[] = [FINDING],
): GroundedAnswer => {
  const request = task.request;
  const text = JSON.stringify({
    taskId: task.id,
    specId: task.specId,
    specVersion: task.specVersion,
    year: request.requestUnit === "calendar_month" ? request.year : null,
    month: request.requestUnit === "calendar_month" ? request.month : null,
    subjectKey: request.requestUnit === "subject" ? request.subjectKey : null,
    parameters: request.parameters,
    findings,
    conflicts: [],
    missingPeriods: [],
    notes: "Synthetic fixture",
  });
  return {
    model: "synthetic-model",
    parts: [text],
    finishReason: "STOP",
    chunks: [
      { uri: FINDING.sourceUri, title: "Synthetic source", resolvedUri: null },
    ],
    supports: [
      {
        partIndex: 0,
        startIndex: 0,
        endIndex: Buffer.byteLength(text),
        text,
        chunkIndices: [0],
      },
    ],
    queries: ["synthetic test"],
    usage: { totalTokenCount: 1 },
  };
};
export const storeWith = (
  snapshot: ResearchSnapshot = { revisions: [], attempts: [] },
) => ({
  read: vi.fn<ResearchStore["read"]>(async () => snapshot),
  claim: vi.fn<ResearchStore["claim"]>(async () => ({
    id: "attempt",
    token: "owner",
  })),
  dispatch: vi.fn<ResearchStore["dispatch"]>(async () => true),
  isOwner: vi.fn<ResearchStore["isOwner"]>(async () => true),
  finish: vi.fn<ResearchStore["finish"]>(async () => {}),
  insertCandidate: vi.fn<ResearchStore["insertCandidate"]>(
    async () => "pending-revision",
  ),
});
