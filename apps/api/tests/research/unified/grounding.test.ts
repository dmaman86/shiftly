import { describe, expect, it } from "vitest";
import {
  parseJsonWithSpans,
  jsonPath,
} from "../../../src/research/json-spans.ts";
import { validateGroundedFindings } from "../../../src/research/grounded-findings.ts";
import { SPEC, TASK, FINDING, answerFor } from "./fixtures.ts";

describe("original JSON spans", () => {
  it("uses UTF-8 offsets, preserves escapes and rejects duplicate keys", () => {
    const raw = '{"עברית":"שלום","value":123}';
    const parsed = parseJsonWithSpans(raw);
    const span = parsed.spans.get(jsonPath(["value"]))!;
    expect(Buffer.from(raw).subarray(span.start, span.end).toString()).toBe(
      "123",
    );
    for (const input of [
      '{"x":1,"x":2}',
      '{"x":1,"\\u0078":2}',
      '{"a":1e999}',
      '{"a":1,}',
      "[] garbage",
    ]) {
      expect(() => parseJsonWithSpans(input)).toThrow("invalid_output");
    }
  });
});

describe("conservative provider grounding", () => {
  it("creates grounded pending inputs, never locally verified claims", () => {
    const result = validateGroundedFindings(TASK, SPEC, answerFor());
    expect(result.resolvedParameters).toEqual(TASK.request.parameters);
    expect(result.candidates[0]).toMatchObject({
      trust: "official_grounded",
      validFrom: "2026-01-01",
      validTo: null,
      sources: [
        { accessStatus: "not_fetched", sha256: null, fetchAttemptedAt: null },
      ],
      evidence: [{ evidenceType: "grounded" }],
    });
  });
  it("rejects links without claim supports and citations only in model JSON", () => {
    const answer = answerFor();
    expect(
      validateGroundedFindings(TASK, SPEC, { ...answer, supports: [] })
        .candidates,
    ).toEqual([]);
    expect(
      validateGroundedFindings(TASK, SPEC, {
        ...answer,
        chunks: [],
        supports: [],
      }).candidates,
    ).toEqual([]);
  });
  it("rejects fabricated support indices, wrong source and altered segment text", () => {
    const answer = answerFor();
    for (const patch of [
      { chunkIndices: [9] },
      { partIndex: 3 },
      { endIndex: 1e8 },
      { text: "fabricated text" },
    ]) {
      expect(
        validateGroundedFindings(TASK, SPEC, {
          ...answer,
          supports: [{ ...answer.supports[0], ...patch }],
        }).candidates,
      ).toEqual([]);
    }
    expect(
      validateGroundedFindings(TASK, SPEC, {
        ...answer,
        chunks: [
          { uri: "https://www.gov.il/other", title: null, resolvedUri: null },
        ],
      }).candidates,
    ).toEqual([]);
  });
  it("does not accept partial field attribution as support for the entire finding", () => {
    const answer = answerFor();
    const start = answer.parts[0].indexOf("123");
    expect(
      validateGroundedFindings(TASK, SPEC, {
        ...answer,
        supports: [
          {
            partIndex: 0,
            startIndex: start,
            endIndex: start + 3,
            text: "123",
            chunkIndices: [0],
          },
        ],
      }).candidates,
    ).toEqual([]);
  });
  it("requires monthly scope echoes, valid value rules and exact effective intervals", () => {
    const raw = answerFor().parts[0];
    expect(() =>
      validateGroundedFindings(TASK, SPEC, {
        ...answerFor(),
        parts: [raw.replace('"month":2', '"month":3')],
      }),
    ).toThrow("invalid_output");
    const findings = [
      { ...FINDING, validTo: "2026-02-15" },
      { ...FINDING, validFrom: "2026-02-15", value: { monthlyValue: 456 } },
    ];
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, findings),
    );
    expect(result.candidates.map((c) => [c.validFrom, c.validTo])).toEqual([
      ["2026-01-01", "2026-02-15"],
      ["2026-02-15", null],
    ]);
    expect(result.resolvedParameters).toHaveLength(1);
    expect(
      validateGroundedFindings(
        TASK,
        SPEC,
        answerFor(TASK, [{ ...FINDING, value: {} }]),
      ).candidates,
    ).toEqual([]);
  });
  it("does not mark a partially supported month as resolved or accept overlaps", () => {
    expect(
      validateGroundedFindings(
        TASK,
        SPEC,
        answerFor(TASK, [{ ...FINDING, validTo: "2026-02-15" }]),
      ).resolvedParameters,
    ).toEqual([]);
    expect(
      validateGroundedFindings(
        TASK,
        SPEC,
        answerFor(TASK, [FINDING, { ...FINDING, validFrom: "2026-02-15" }]),
      ).candidates,
    ).toEqual([]);
  });
  it("keeps secondary grounding distinct and ignores confidence/domain titles", () => {
    const finding = {
      ...FINDING,
      sourceUri: "https://www.kolzchut.org.il/he/synthetic",
    };
    const answer = answerFor(TASK, [finding]);
    const result = validateGroundedFindings(TASK, SPEC, {
      ...answer,
      chunks: [{ uri: finding.sourceUri, title: "gov.il", resolvedUri: null }],
    });
    expect(result.candidates[0]).toMatchObject({
      trust: "secondary_grounded",
      fallbackReason: "official_source_insufficient",
    });
    expect(
      validateGroundedFindings(TASK, SPEC, {
        ...answer,
        chunks: [
          {
            uri: "https://example.org/synthetic",
            title: "gov.il",
            resolvedUri: null,
          },
        ],
      }).candidates,
    ).toEqual([]);
  });
  it("rejects truncation and multiple content parts instead of repairing via another model", () => {
    expect(() =>
      validateGroundedFindings(TASK, SPEC, {
        ...answerFor(),
        finishReason: "MAX_TOKENS",
      }),
    ).toThrow();
    expect(() =>
      validateGroundedFindings(TASK, SPEC, {
        ...answerFor(),
        parts: ["{}", "{}"],
      }),
    ).toThrow();
  });
});
