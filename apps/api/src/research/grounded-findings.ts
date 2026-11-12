import { isDeepStrictEqual } from "node:util";
import type { NewCandidate } from "../ports/reference-data.ts";
import { sourceTier, publisherOf } from "./source-policy.ts";
import { jsonPath, parseJsonWithSpans } from "./json-spans.ts";
import {
  researchFindingsSchema,
  ResearchError,
  type GroundedAnswer,
  type ResearchFinding,
  type ResearchTask,
  type ResearchSpec,
  type ResearchKind,
  type GroundingSupport,
} from "./contracts.ts";
import { monthInterval, uncoveredIntervals, validateTask } from "./planner.ts";

const leaves = (
  value: unknown,
  path: readonly (string | number)[],
): (readonly (string | number)[])[] => {
  if (Array.isArray(value))
    return value.flatMap((item, i) => leaves(item, [...path, i]));
  if (value !== null && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) =>
      leaves(item, [...path, key]),
    );
  return [path];
};

/** Provider attribution is not independent verification of the source's contents. */
export const validateGroundedFindings = (
  task: ResearchTask,
  spec: ResearchSpec,
  answer: GroundedAnswer,
): {
  readonly candidates: readonly NewCandidate[];
  readonly resolvedParameters: readonly ResearchKind[];
  readonly unresolved: readonly string[];
} => {
  validateTask(task, spec);
  if (answer.finishReason !== "STOP") throw new ResearchError("invalid_output");
  const populated = answer.parts
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => text.trim() !== "");
  // Never concatenate parts: provider offsets are local to the original part.
  if (populated.length !== 1) throw new ResearchError("invalid_output");
  const { text, index: partIndex } = populated[0];
  const parsed = parseJsonWithSpans(text);
  const result = researchFindingsSchema.safeParse(parsed.value);
  if (!result.success) throw new ResearchError("invalid_output");
  const output = result.data;
  const request = task.request;
  const monthly = request.requestUnit === "calendar_month";
  if (
    output.taskId !== task.id ||
    output.specId !== task.specId ||
    output.specVersion !== task.specVersion ||
    output.year !== (monthly ? request.year : null) ||
    output.month !== (monthly ? request.month : null) ||
    output.subjectKey !==
      (request.requestUnit === "subject" ? request.subjectKey : null) ||
    !isDeepStrictEqual(
      [...output.parameters].sort(),
      [...request.parameters].sort(),
    )
  )
    throw new ResearchError("invalid_output");
  const window = monthly ? monthInterval(request.year, request.month) : null;
  if (
    output.missingPeriods.some(
      (gap) =>
        !request.parameters.includes(gap.kind) ||
        (window !== null &&
          (gap.from < window.from || gap.until > window.until)),
    )
  )
    throw new ResearchError("invalid_output");

  const bytes = Buffer.from(text);
  const supports = answer.supports.filter((support) => {
    if (
      support.partIndex !== partIndex ||
      !Number.isInteger(support.startIndex) ||
      !Number.isInteger(support.endIndex) ||
      support.startIndex < 0 ||
      support.endIndex <= support.startIndex ||
      support.endIndex > bytes.length ||
      support.chunkIndices.length === 0 ||
      support.chunkIndices.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= answer.chunks.length,
      )
    )
      return false;
    const segment = bytes
      .subarray(support.startIndex, support.endIndex)
      .toString("utf8");
    return (
      Buffer.byteLength(segment) === support.endIndex - support.startIndex &&
      (support.text === null || support.text === segment)
    );
  });
  const candidates: NewCandidate[] = [];
  const unresolved: string[] = [...output.conflicts];
  for (const [i, finding] of output.findings.entries()) {
    if (
      !request.parameters.includes(finding.kind) ||
      finding.population !== spec.population ||
      finding.subjectKey !==
        (request.requestUnit === "subject" ? request.subjectKey : null) ||
      (window !== null &&
        (finding.validFrom >= window.until ||
          (finding.validTo !== null && finding.validTo <= window.from)))
    ) {
      throw new ResearchError("invalid_output");
    }
    const problems = spec.validateFinding(finding, task);
    const overlaps = output.findings.some(
      (other, j) =>
        j !== i &&
        other.kind === finding.kind &&
        other.validFrom < (finding.validTo ?? "9999-12-31") &&
        finding.validFrom < (other.validTo ?? "9999-12-31"),
    );
    const missingOverlap = output.missingPeriods.some(
      (gap) =>
        gap.kind === finding.kind &&
        gap.from < (finding.validTo ?? "9999-12-31") &&
        finding.validFrom < gap.until,
    );
    if (
      problems.length > 0 ||
      overlaps ||
      missingOverlap ||
      output.conflicts.length > 0
    ) {
      unresolved.push(`${finding.kind}: conflicting or invalid finding`);
      continue;
    }
    const paths = leaves(finding, ["findings", i]).filter(
      (path) => path.at(-1) !== "sourceUri",
    );
    if (paths.length > 256) {
      unresolved.push(`${finding.kind}: finding exceeds validation budget`);
      continue;
    }
    const sourceIndex = answer.chunks.findIndex((chunk, chunkIndex) => {
      const uri = chunk.resolvedUri ?? chunk.uri;
      if (!chunk.uri || uri !== finding.sourceUri || sourceTier(uri) > 3)
        return false;
      // One cited source must back every field; an unrelated link in the metadata is not enough.
      return paths.every((path) => {
        const span = parsed.spans.get(jsonPath(path));
        if (!span) return false;
        const isString = bytes[span.start] === 34;
        return supports.some(
          (support) =>
            support.chunkIndices.includes(chunkIndex) &&
            support.startIndex <= span.start + (isString ? 1 : 0) &&
            support.endIndex >= span.end - (isString ? 1 : 0),
        );
      });
    });
    if (sourceIndex < 0) {
      unresolved.push(`${finding.kind}: insufficient grounding`);
      continue;
    }
    const chunk = answer.chunks[sourceIndex];
    const attached = supports.filter((s) =>
      s.chunkIndices.includes(sourceIndex),
    );
    candidates.push(
      groundedCandidate(
        finding,
        chunk.uri!,
        chunk.title,
        attached,
        answer.queries,
      ),
    );
  }
  const resolvedParameters = request.parameters.filter((kind) => {
    if (
      output.conflicts.length > 0 ||
      output.missingPeriods.some((gap) => gap.kind === kind)
    )
      return false;
    const findings = candidates.filter((c) => c.kind === kind);
    if (window === null) return findings.length === 1;
    return (
      uncoveredIntervals(
        window,
        findings.map((f) => ({
          from: f.validFrom,
          until: f.validTo ?? window.until,
        })),
      ).length === 0
    );
  });
  return { candidates, resolvedParameters, unresolved };
};

const groundedCandidate = (
  finding: ResearchFinding,
  providerUri: string,
  title: string | null,
  supports: readonly GroundingSupport[],
  queries: readonly string[],
): NewCandidate => {
  const tier = sourceTier(finding.sourceUri);
  const grounding = {
    validatedBy: "shiftly-grounding-v1",
    providerUri,
    supports,
    queries,
  };
  return {
    kind: finding.kind,
    subjectKey: finding.subjectKey,
    validFrom: finding.validFrom,
    validTo: finding.validTo,
    value: finding.value,
    origin: "research",
    trust: tier <= 2 ? "official_grounded" : "secondary_grounded",
    fallbackReason: tier <= 2 ? null : "official_source_insufficient",
    sources: [
      {
        url: providerUri,
        finalUrl: finding.sourceUri,
        publisher: publisherOf(finding.sourceUri),
        tier,
        discoveredVia: "grounding_metadata",
        accessStatus: "not_fetched",
        httpStatus: null,
        contentType: null,
        title,
        sha256: null,
        grounding,
        fetchAttemptedAt: null,
        role: "supporting",
      },
    ],
    evidence: [
      {
        evidenceType: tier <= 2 ? "grounded" : "trusted_secondary_grounded",
        source: 0,
        carriedFromRevisionId: null,
        quote: finding.quote,
        section: null,
        sourceReference: null,
        page: null,
        effectiveFrom: finding.validFrom,
        grounding,
        note: "Provider-attributed claim; quotation and source contents were not independently verified.",
      },
    ],
  };
};
