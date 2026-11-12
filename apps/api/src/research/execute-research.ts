import { isDeepStrictEqual } from "node:util";
import type { NewCandidate } from "../ports/reference-data.ts";
import { validateGroundedFindings } from "./grounded-findings.ts";
import { planResearchTask, uncoveredIntervals } from "./planner.ts";
import {
  ResearchError,
  type GroundedResearchProvider,
  type ResearchCompletion,
  type ResearchRequest,
  type ResearchSpec,
  type ResearchStore,
  type ResearchRevision,
} from "./contracts.ts";

const unchanged = (
  candidate: NewCandidate,
  revisions: readonly ResearchRevision[],
): boolean => {
  const matching = revisions.filter(
    (r) =>
      r.status === "active" &&
      r.sufficientEvidence &&
      r.kind === candidate.kind &&
      r.subjectKey === candidate.subjectKey &&
      isDeepStrictEqual(r.value, candidate.value),
  );
  // Never collapse election identity into a date lookup, nor clip effective periods to a month.
  if (candidate.subjectKey !== null)
    return matching.some(
      (r) =>
        r.validFrom === candidate.validFrom && r.validTo === candidate.validTo,
    );
  const until = candidate.validTo ?? "9999-12-31";
  return (
    uncoveredIntervals(
      { from: candidate.validFrom, until },
      matching.map((r) => ({
        from: r.validFrom,
        until: r.validTo ?? "9999-12-31",
      })),
    ).length === 0
  );
};

/** The durable dispatch gate precedes the only provider call. No activation capability is injected. */
export const executeResearch = async (
  request: ResearchRequest,
  spec: ResearchSpec,
  deps: {
    readonly store: ResearchStore;
    readonly provider: GroundedResearchProvider;
    readonly now: () => Date;
  },
  options: {
    readonly force?: boolean;
    readonly persistCandidates?: boolean;
  } = {},
): Promise<{
  readonly status: "skipped" | "lost_ownership" | ResearchCompletion["outcome"];
  readonly candidateIds: readonly string[];
  readonly candidates?: readonly NewCandidate[];
  readonly attemptId?: string;
}> => {
  // Read/plan/claim failures propagate as unavailability before any model request.
  const snapshot = await deps.store.read(request);
  const task = planResearchTask(request, spec, snapshot, deps.now(), options);
  if (!task) return { status: "skipped", candidateIds: [] };
  const claim = await deps.store.claim(task, options.force === true);
  if (!claim || !(await deps.store.dispatch(claim)))
    return { status: "skipped", candidateIds: [] };
  const candidateIds: string[] = [];
  let candidates: readonly NewCandidate[] = [];
  let completion: ResearchCompletion;
  let phase: "provider" | "validation" | "persistence" = "provider";
  const started = deps.now().getTime();
  let providerInfo: ResearchCompletion["provider"];
  // The fingerprint identifies scope; the durable attempt id identifies this one explicit dispatch.
  const dispatchedTask = { ...task, id: claim.id };
  try {
    const answer = await deps.provider.research(dispatchedTask, spec);
    const usage: Record<string, number> = {};
    for (const key of [
      "promptTokenCount",
      "candidatesTokenCount",
      "thoughtsTokenCount",
      "totalTokenCount",
    ]) {
      const count = answer.usage[key];
      if (Number.isSafeInteger(count) && count >= 0) usage[key] = count;
    }
    if (/^[a-zA-Z0-9._:/-]{1,128}$/.test(answer.model))
      providerInfo = {
        model: answer.model,
        durationMs: Math.max(0, deps.now().getTime() - started),
        usage,
      };
    phase = "validation";
    const validated = validateGroundedFindings(dispatchedTask, spec, answer);
    phase = "persistence";
    if (!(await deps.store.isOwner(claim)))
      return {
        status: "lost_ownership",
        candidateIds: [],
        attemptId: claim.id,
      };
    // Re-read after inference: a concurrent approval may have changed published coverage.
    const current = await deps.store.read(request);
    candidates = validated.candidates.filter(
      (candidate) => !unchanged(candidate, current.revisions),
    );
    if (options.persistCandidates === true) {
      for (const candidate of candidates) {
        if (!(await deps.store.isOwner(claim)))
          return {
            status: "lost_ownership",
            candidateIds,
            attemptId: claim.id,
          };
        candidateIds.push(await deps.store.insertCandidate(claim, candidate));
      }
    }
    completion = {
      outcome:
        validated.resolvedParameters.length === task.request.parameters.length
          ? "completed"
          : "unresolved",
      resolvedParameters: validated.resolvedParameters,
      candidateIds,
    };
    // A dry run must not suppress a future operational task for values it did not store.
    if (!options.persistCandidates && candidates.length > 0)
      completion = {
        ...completion,
        resolvedParameters: [],
        outcome: "unresolved",
      };
  } catch (error) {
    completion = {
      outcome:
        phase === "provider"
          ? error instanceof ResearchError && error.code === "invalid_output"
            ? "invalid_output"
            : "provider_error"
          : phase === "validation"
            ? "invalid_output"
            : "persistence_failed",
      resolvedParameters: [],
      candidateIds,
    };
  }
  if (providerInfo) completion = { ...completion, provider: providerInfo };
  const days =
    completion.outcome === "completed"
      ? spec.refreshPolicy.intervalDays
      : spec.refreshPolicy.unresolvedDays;
  try {
    await deps.store.finish(
      claim,
      completion,
      new Date(deps.now().getTime() + days * 86_400_000).toISOString(),
    );
  } catch {
    // Do not lose already stored pending ids, nor repeat inference to reconstruct them.
    return {
      status: "persistence_failed",
      candidateIds,
      candidates,
      attemptId: claim.id,
    };
  }
  return {
    status: completion.outcome,
    candidateIds,
    candidates,
    attemptId: claim.id,
  };
};
