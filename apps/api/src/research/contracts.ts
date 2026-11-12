import { z } from "zod";
import type {
  ActiveRevision,
  NewCandidate,
  ReferenceKind,
} from "../ports/reference-data.ts";

export const RESEARCH_DOMAINS = {
  "income-tax": ["income_tax.monthly_brackets", "income_tax.credit_point"],
  contributions: [
    "social_security.reduced_rate_boundary",
    "social_security.max_insurable_income",
    "national_insurance.employee_reduced_rate",
    "national_insurance.employee_standard_rate",
    "health_insurance.employee_reduced_rate",
    "health_insurance.employee_standard_rate",
  ],
  elections: ["calendar.knesset_election"],
} as const satisfies Record<string, readonly ReferenceKind[]>;

export type ResearchDomain = keyof typeof RESEARCH_DOMAINS;
export const researchKindSchema = z.enum([
  ...RESEARCH_DOMAINS["income-tax"],
  ...RESEARCH_DOMAINS.contributions,
  ...RESEARCH_DOMAINS.elections,
]);
export type ResearchKind = z.infer<typeof researchKindSchema>;
export const calendarDateSchema = z.iso.date();
const parametersSchema = z
  .array(researchKindSchema)
  .min(1)
  .max(8)
  .refine(
    (values) => new Set(values).size === values.length,
    "Duplicate parameters",
  );

export const researchRequestSchema = z
  .discriminatedUnion("requestUnit", [
    z.strictObject({
      requestUnit: z.literal("calendar_month"),
      domain: z.enum(["income-tax", "contributions"]),
      year: z.number().int().min(2015).max(2100),
      month: z.number().int().min(1).max(12),
      parameters: parametersSchema,
    }),
    z.strictObject({
      requestUnit: z.literal("subject"),
      domain: z.literal("elections"),
      subjectKey: z.string().regex(/^knesset:[1-9]\d*$/),
      parameters: parametersSchema,
    }),
  ])
  .superRefine((request, ctx) => {
    const allowed: readonly string[] = RESEARCH_DOMAINS[request.domain];
    if (request.parameters.some((kind) => !allowed.includes(kind))) {
      ctx.addIssue({
        code: "custom",
        message: "Parameter does not belong to the domain",
      });
    }
    if (
      request.requestUnit === "calendar_month" &&
      request.year === 2015 &&
      request.month < 11
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Research begins in November 2015",
      });
    }
  });
export type ResearchRequest = z.infer<typeof researchRequestSchema>;
export type ResearchInterval = {
  readonly from: string;
  readonly until: string;
};
export type ResearchRevision = ActiveRevision & {
  readonly status: "active" | "pending_review";
  readonly sufficientEvidence: boolean;
};
export type ResearchTask = {
  readonly id: string;
  readonly specId: string;
  readonly specVersion: number;
  readonly request: ResearchRequest;
  readonly asOfDate: string;
  readonly currentValues: readonly ActiveRevision[];
};

export type ResearchSpec = {
  readonly id: string;
  readonly version: number;
  readonly domain: ResearchDomain;
  readonly population: string;
  readonly sourcePriority: readonly string[];
  readonly researchInstructions: string;
  readonly refreshPolicy: {
    readonly intervalDays: number;
    readonly unresolvedDays: number;
  };
  readonly isFinalRevision?: (
    revision: ResearchRevision,
    asOfDate: string,
  ) => boolean;
  /** Domain specs supply real value/date/population rules; the generic runner cannot invent them. */
  readonly validateFinding: (
    finding: ResearchFinding,
    task: ResearchTask,
  ) => readonly string[];
  /** Compare only individually admitted, provider-attributed findings; never use unsupported peers. */
  readonly validateRelatedFinding?: (
    finding: ResearchFinding,
    findings: readonly ResearchFinding[],
    task: ResearchTask,
  ) => readonly string[];
};

export const researchFindingSchema = z
  .strictObject({
    kind: researchKindSchema,
    subjectKey: z.string().nullable(),
    population: z.string().min(1).max(2000),
    validFrom: calendarDateSchema,
    validTo: calendarDateSchema.nullable(),
    value: z.unknown(),
    sourceUri: z.url({ protocol: /^https$/ }),
    quote: z.string().min(12).max(12000),
  })
  .refine(
    (finding) =>
      finding.validTo === null || finding.validTo > finding.validFrom,
    "Invalid effective interval",
  );
export type ResearchFinding = z.infer<typeof researchFindingSchema>;
export const researchFindingsSchema = z.strictObject({
  taskId: z.string(),
  specId: z.string(),
  specVersion: z.number().int().positive(),
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
  subjectKey: z.string().nullable(),
  parameters: parametersSchema,
  findings: z.array(researchFindingSchema).max(100),
  missingPeriods: z
    .array(
      z
        .strictObject({
          kind: researchKindSchema,
          from: calendarDateSchema,
          until: calendarDateSchema,
          reason: z.string().min(1).max(2000),
        })
        .refine((gap) => gap.from < gap.until, "Invalid missing interval"),
    )
    .max(100),
  conflicts: z.array(z.string().min(1).max(2000)).max(100),
  notes: z.string().max(10000),
});
export const RESEARCH_OUTPUT_SCHEMA = z.toJSONSchema(researchFindingsSchema);

export type GroundingChunk = {
  readonly uri: string | null;
  readonly title: string | null;
  /** Only resolved from a provider-supplied redirect, never supplied by the model. */
  readonly resolvedUri: string | null;
};
export type GroundingSupport = {
  readonly partIndex: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly text: string | null;
  readonly chunkIndices: readonly number[];
};
export type GroundedAnswer = {
  readonly model: string;
  readonly parts: readonly string[];
  readonly finishReason: string | null;
  readonly chunks: readonly GroundingChunk[];
  readonly supports: readonly GroundingSupport[];
  readonly queries: readonly string[];
  readonly usage: Readonly<Record<string, number>>;
};
export interface GroundedResearchProvider {
  research(task: ResearchTask, spec: ResearchSpec): Promise<GroundedAnswer>;
}
export type ResearchAttempt = {
  readonly id: string;
  readonly task: ResearchTask;
  readonly state: "claimed" | "dispatched" | "completed" | "failed" | "unknown";
  readonly leaseUntil: string;
  readonly nextEligibleAt: string;
  readonly resolvedParameters: readonly ResearchKind[];
  readonly finishedAt: string | null;
};
export type ResearchSnapshot = {
  readonly revisions: readonly ResearchRevision[];
  readonly attempts: readonly ResearchAttempt[];
};
export type AttemptClaim = { readonly id: string; readonly token: string };
export type ResearchCompletion = {
  readonly outcome:
    | "completed"
    | "unresolved"
    | "invalid_output"
    | "provider_error"
    | "persistence_failed";
  readonly resolvedParameters: readonly ResearchKind[];
  readonly candidateIds: readonly string[];
  readonly provider?: {
    readonly model: string;
    readonly durationMs: number;
    readonly usage: Readonly<Record<string, number>>;
  };
};
/** No activation method: only administrative code can publish a revision. */
export interface ResearchStore {
  read(request: ResearchRequest): Promise<ResearchSnapshot>;
  claim(task: ResearchTask, force: boolean): Promise<AttemptClaim | null>;
  dispatch(claim: AttemptClaim): Promise<boolean>;
  isOwner(claim: AttemptClaim): Promise<boolean>;
  finish(
    claim: AttemptClaim,
    result: ResearchCompletion,
    nextEligibleAt: string,
  ): Promise<void>;
  insertCandidate(
    claim: AttemptClaim,
    candidate: NewCandidate,
  ): Promise<string>;
}

export class ResearchError extends Error {
  readonly code:
    | "invalid_task"
    | "invalid_output"
    | "provider_error"
    | "research_unavailable";
  constructor(code: ResearchError["code"]) {
    super(code);
    this.name = "ResearchError";
    this.code = code;
  }
}
