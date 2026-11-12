import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  ResearchError,
  calendarDateSchema,
  researchRequestSchema,
  researchKindSchema,
  type ResearchStore,
  type ResearchRequest,
  type ResearchSnapshot,
  type ResearchTask,
  type AttemptClaim,
  type ResearchCompletion,
} from "../research/contracts.ts";
import { monthInterval, taskKey } from "../research/planner.ts";
import type { NewCandidate } from "../ports/reference-data.ts";

const sourceSchema = z.object({
  tier: z.number().int().min(1).max(4),
  access_status: z.string(),
  discovered_via: z.string(),
});
const revisionSchema = z.object({
  id: z.string(),
  kind: researchKindSchema,
  subject_key: z.string().nullable(),
  status: z.enum(["active", "pending_review"]),
  valid_from: calendarDateSchema,
  valid_to: calendarDateSchema.nullable(),
  value: z.unknown(),
  trust: z.enum([
    "official_verified",
    "official_grounded",
    "secondary_verified",
    "secondary_grounded",
    "legacy_seed",
    "manual",
    "carried_forward",
  ]),
  reference_evidence: z.array(
    z.object({
      evidence_type: z.string(),
      grounding: z.unknown(),
      reference_sources: sourceSchema.nullable(),
    }),
  ),
});
const storedTaskSchema = z.object({
  id: z.string(),
  specId: z.string(),
  specVersion: z.number().int(),
  asOfDate: calendarDateSchema,
  request: researchRequestSchema,
});
const attemptSchema = z.object({
  id: z.string(),
  task: storedTaskSchema,
  state: z.enum(["claimed", "dispatched", "completed", "failed", "unknown"]),
  lease_until: z.iso.datetime({ offset: true }),
  next_eligible_at: z.iso.datetime({ offset: true }),
  finished_at: z.iso.datetime({ offset: true }).nullable(),
  result: z
    .object({ resolvedParameters: z.array(researchKindSchema) })
    .nullable(),
});

export const researchScope = (request: ResearchRequest): string =>
  request.requestUnit === "subject"
    ? request.subjectKey
    : `month:${monthInterval(request.year, request.month).from}`;

const groundedMarker = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "validatedBy" in value &&
  value.validatedBy === "shiftly-grounding-v1" &&
  "supports" in value &&
  Array.isArray(value.supports) &&
  value.supports.length > 0;

export class SupabaseResearchStore implements ResearchStore {
  private readonly client: SupabaseClient;
  constructor(options: {
    url: string;
    secretKey: string;
    fetch?: typeof fetch;
  }) {
    const requestFetch = options.fetch ?? fetch;
    const boundedFetch: typeof fetch = (input, init) =>
      requestFetch(input, {
        ...init,
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
          : AbortSignal.timeout(10_000),
      });
    this.client = createClient(options.url, options.secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: { retry: false },
      global: { fetch: boundedFetch },
    });
  }

  async read(input: ResearchRequest): Promise<ResearchSnapshot> {
    const request = researchRequestSchema.parse(input);
    const revisions = [];
    const attempts = [];
    // Fail closed rather than silently treating a PostgREST row limit as complete coverage.
    for (let offset = 0; ; offset += 500) {
      if (offset >= 50_000) throw new ResearchError("research_unavailable");
      let query = this.client
        .from("reference_revisions")
        .select(
          "id,kind,subject_key,status,valid_from,valid_to,value,trust,reference_evidence(evidence_type,grounding,reference_sources(tier,access_status,discovered_via))",
        )
        .in("kind", request.parameters)
        .in("status", ["active", "pending_review"]);
      if (request.requestUnit === "calendar_month") {
        // Read the requested kinds' timelines, not just their month intersection:
        // a finding can prove a real effective interval starting before that month.
        query = query.is("subject_key", null);
      } else query = query.eq("subject_key", request.subjectKey);
      const { data, error } = await query
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new ResearchError("research_unavailable");
      const rows = z.array(revisionSchema).parse(data);
      revisions.push(
        ...rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          subjectKey: row.subject_key,
          status: row.status,
          validFrom: row.valid_from,
          validTo: row.valid_to,
          value: row.value,
          trust: row.trust,
          sufficientEvidence: row.reference_evidence.some((evidence) => {
            const source = evidence.reference_sources;
            if (!source) return false;
            if (
              row.trust === "official_verified" ||
              row.trust === "secondary_verified"
            )
              return (
                evidence.evidence_type === "fetched_verified" &&
                source.access_status === "fetched" &&
                (row.trust === "official_verified"
                  ? source.tier <= 2
                  : source.tier === 3)
              );
            return (
              groundedMarker(evidence.grounding) &&
              source.discovered_via === "grounding_metadata" &&
              (row.trust === "official_grounded"
                ? source.tier <= 2 && evidence.evidence_type === "grounded"
                : row.trust === "secondary_grounded" &&
                  source.tier === 3 &&
                  evidence.evidence_type === "trusted_secondary_grounded")
            );
          }),
        })),
      );
      if (rows.length < 500) break;
    }
    for (let offset = 0; ; offset += 500) {
      if (offset >= 50_000) throw new ResearchError("research_unavailable");
      const { data, error } = await this.client
        .from("reference_research_attempts")
        .select("id,task,state,lease_until,next_eligible_at,finished_at,result")
        .eq("domain", request.domain)
        .eq("scope", researchScope(request))
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new ResearchError("research_unavailable");
      const rows = z.array(attemptSchema).parse(data);
      attempts.push(
        ...rows.map((row) => ({
          id: row.id,
          task: { ...row.task, currentValues: [] },
          state: row.state,
          leaseUntil: row.lease_until,
          nextEligibleAt: row.next_eligible_at,
          finishedAt: row.finished_at,
          resolvedParameters: row.result?.resolvedParameters ?? [],
        })),
      );
      if (rows.length < 500) break;
    }
    return { revisions, attempts };
  }

  async claim(
    task: ResearchTask,
    force: boolean,
  ): Promise<AttemptClaim | null> {
    const { data, error } = await this.client.rpc("claim_reference_research", {
      p_task_key: taskKey(task),
      p_task: task,
      p_force: force,
    });
    if (error) throw new ResearchError("research_unavailable");
    return data === null
      ? null
      : z.strictObject({ id: z.uuid(), token: z.uuid() }).parse(data);
  }
  async dispatch(claim: AttemptClaim): Promise<boolean> {
    const { data, error } = await this.client.rpc(
      "dispatch_reference_research",
      { p_id: claim.id, p_token: claim.token },
    );
    if (error || typeof data !== "boolean")
      throw new ResearchError("research_unavailable");
    return data;
  }
  async isOwner(claim: AttemptClaim): Promise<boolean> {
    const { data, error } = await this.client
      .from("reference_research_attempts")
      .select("id")
      .eq("id", claim.id)
      .eq("token", claim.token)
      .eq("state", "dispatched")
      .gt("lease_until", new Date().toISOString())
      .maybeSingle();
    if (error) throw new ResearchError("research_unavailable");
    return data !== null;
  }
  async finish(
    claim: AttemptClaim,
    result: ResearchCompletion,
    nextEligibleAt: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("finish_reference_research", {
      p_id: claim.id,
      p_token: claim.token,
      p_result: result,
      p_next_eligible_at: nextEligibleAt,
    });
    if (error) throw new ResearchError("research_unavailable");
  }
  async insertCandidate(
    claim: AttemptClaim,
    candidate: NewCandidate,
  ): Promise<string> {
    const { data, error } = await this.client.rpc("insert_research_candidate", {
      p_id: claim.id,
      p_token: claim.token,
      p_candidate: candidate,
    });
    if (error || typeof data !== "string")
      throw new ResearchError("research_unavailable");
    return data;
  }
}
