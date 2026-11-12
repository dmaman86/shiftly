import { createHash } from "node:crypto";
import { israelDate } from "../services/election-record.ts";
import {
  researchRequestSchema,
  calendarDateSchema,
  type ResearchRequest,
  type ResearchInterval,
  type ResearchSnapshot,
  type ResearchSpec,
  type ResearchTask,
  type ResearchKind,
  ResearchError,
} from "./contracts.ts";

export const monthInterval = (
  year: number,
  month: number,
): ResearchInterval => ({
  from: `${year}-${String(month).padStart(2, "0")}-01`,
  until:
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
});

/** Subtract a union of intervals; never treat a revision's start year as coverage. */
export const uncoveredIntervals = (
  window: ResearchInterval,
  covered: readonly ResearchInterval[],
): ResearchInterval[] => {
  let cursor = window.from;
  const gaps: ResearchInterval[] = [];
  for (const interval of [...covered].sort((a, b) =>
    a.from.localeCompare(b.from),
  )) {
    if (interval.until <= cursor || interval.from >= window.until) continue;
    if (interval.from > cursor)
      gaps.push({ from: cursor, until: interval.from });
    if (interval.until > cursor) cursor = interval.until;
    if (cursor >= window.until) break;
  }
  if (cursor < window.until) gaps.push({ from: cursor, until: window.until });
  return gaps;
};

export const taskKey = (task: ResearchTask): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        specId: task.specId,
        specVersion: task.specVersion,
        request: {
          ...task.request,
          parameters: [...task.request.parameters].sort(),
        },
      }),
    )
    .digest("hex");

export const validateTask = (task: ResearchTask, spec: ResearchSpec): void => {
  const result = researchRequestSchema.safeParse(task.request);
  if (
    !result.success ||
    task.specId !== spec.id ||
    task.specVersion !== spec.version ||
    task.request.domain !== spec.domain ||
    !calendarDateSchema.safeParse(task.asOfDate).success ||
    !Number.isFinite(spec.refreshPolicy.intervalDays) ||
    spec.refreshPolicy.intervalDays <= 0 ||
    !Number.isFinite(spec.refreshPolicy.unresolvedDays) ||
    spec.refreshPolicy.unresolvedDays <= 0
  ) {
    throw new ResearchError("invalid_task");
  }
};

const sameScope = (left: ResearchRequest, right: ResearchRequest): boolean =>
  left.domain === right.domain &&
  left.requestUnit === right.requestUnit &&
  (left.requestUnit === "calendar_month" &&
  right.requestUnit === "calendar_month"
    ? left.year === right.year && left.month === right.month
    : left.requestUnit === "subject" &&
      right.requestUnit === "subject" &&
      left.subjectKey === right.subjectKey);

export const planResearchTask = (
  request: ResearchRequest,
  spec: ResearchSpec,
  snapshot: ResearchSnapshot,
  now: Date,
  options: { readonly force?: boolean } = {},
): ResearchTask | null => {
  const base: ResearchTask = {
    id: "plan",
    specId: spec.id,
    specVersion: spec.version,
    request,
    asOfDate: israelDate(now),
    currentValues: [],
  };
  validateTask(base, spec);
  const parameters = request.parameters.filter((kind): kind is ResearchKind => {
    const attempts = snapshot.attempts.filter(
      (attempt) =>
        sameScope(attempt.task.request, request) &&
        attempt.task.request.parameters.includes(kind),
    );
    if (
      attempts.some(
        (attempt) =>
          ((attempt.state === "claimed" || attempt.state === "dispatched") &&
            Date.parse(attempt.leaseUntil) > now.getTime()) ||
          (!options.force &&
            (attempt.state === "dispatched" ||
              attempt.state === "unknown" ||
              Date.parse(attempt.nextEligibleAt) > now.getTime())),
      )
    )
      return false;
    const revisions = snapshot.revisions.filter(
      (r) =>
        r.kind === kind &&
        (request.requestUnit === "subject"
          ? r.subjectKey === request.subjectKey
          : r.subjectKey === null),
    );
    if (request.requestUnit === "subject") {
      if (revisions.some((r) => r.status === "pending_review")) return false;
      if (
        !options.force &&
        revisions.some(
          (r) =>
            r.status === "active" &&
            (spec.isFinalRevision
              ? spec.isFinalRevision(r, base.asOfDate)
              : r.sufficientEvidence &&
                typeof r.value === "object" &&
                r.value !== null &&
                "electionStatus" in r.value &&
                (r.value.electionStatus === "occurred" ||
                  r.value.electionStatus === "cancelled")),
        )
      )
        return false;
    } else {
      const window = monthInterval(request.year, request.month);
      const intervals = (pending: boolean) =>
        revisions
          .filter((r) =>
            pending
              ? r.status === "pending_review"
              : r.status === "active" && r.sufficientEvidence,
          )
          .map((r) => ({
            from: r.validFrom,
            until: r.validTo ?? window.until,
          }));
      if (uncoveredIntervals(window, intervals(true)).length === 0)
        return false;
      const missing =
        uncoveredIntervals(window, [...intervals(true), ...intervals(false)])
          .length > 0;
      if (missing || options.force) return true;
      // Historical coverage is separate from the cadence of current/future verification.
      if (window.until <= `${base.asOfDate.slice(0, 7)}-01`) return false;
    }
    const lastCheck = attempts
      .filter(
        (a) => a.resolvedParameters.includes(kind) && a.finishedAt !== null,
      )
      .map((a) => a.finishedAt!)
      .sort((a, b) => Date.parse(a) - Date.parse(b))
      .at(-1);
    return (
      options.force === true ||
      lastCheck === undefined ||
      now.getTime() - Date.parse(lastCheck) >=
        spec.refreshPolicy.intervalDays * 86_400_000
    );
  });
  if (parameters.length === 0) return null;
  const task = {
    ...base,
    request: { ...request, parameters },
    currentValues: snapshot.revisions.filter((r) => {
      if (r.status !== "active" || !parameters.includes(r.kind as ResearchKind))
        return false;
      if (request.requestUnit === "subject")
        return r.subjectKey === request.subjectKey;
      const window = monthInterval(request.year, request.month);
      return (
        r.subjectKey === null &&
        r.validFrom < window.until &&
        (r.validTo === null || r.validTo > window.from)
      );
    }),
  };
  return { ...task, id: taskKey(task) };
};
