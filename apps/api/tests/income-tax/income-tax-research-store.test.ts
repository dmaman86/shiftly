import { describe, expect, it, vi } from "vitest";
import { researchAndStoreIncomeTax } from "../../src/income-tax/income-tax-research.ts";
import type {
  CurrentRevision,
  NewCandidate,
  ReferenceKind,
  RevisionRepository,
} from "../../src/reference-data/ports.ts";
import type {
  FetchedDocument,
  ResearchDiscoveryResult,
} from "../../src/research/ports.ts";
import type { DebugArtifactStore } from "../../src/shared/debug-artifacts.ts";
import {
  ANSWER_2026,
  BOOKLET_2026_TEXT,
  BOOKLET_URL,
  BRACKETS_2026,
  fetchedDocument,
} from "../research/booklet-fixtures.ts";

const GOV_PAGE = "https://www.gov.il/he/pages/income-tax-monthly-deductions";
const KOL_ZCHUT = "https://www.kolzchut.org.il/he/page";
const SHA = "a".repeat(64);

const PENDING_2026: CurrentRevision = {
  id: "rev-existing",
  subjectKey: null,
  status: "pending_review",
  validFrom: "2026-01-01",
  trust: "official_verified",
};

const artifacts: DebugArtifactStore = {
  forDocument: async () => ({ write: async () => {} }),
};

const blocked = (url: string) =>
  fetchedDocument({
    requestedUrl: url,
    finalUrl: url,
    publisher: "www.gov.il",
    httpStatus: 403,
    contentType: "text/html",
    title: null,
    accessibility: "blocked",
    problem: "HTTP 403",
    sha256: null,
    format: null,
    text: "",
  });

const discovered = (...urls: string[]): ResearchDiscoveryResult => ({
  sources: urls.map((url) => ({
    url,
    title: new URL(url).hostname,
    origin: "grounding_metadata" as const,
  })),
  searchQueries: ["לוח ניכויים חודשי 2026"],
  call: {
    model: "gemma-4-31b-it",
    startedAt: "2026-10-20T12:00:00.000Z",
    durationMs: 1,
    outcome: "response",
    httpStatus: null,
    error: null,
  },
  rawText: null,
});

function setup(options: {
  documents: Record<string, FetchedDocument>;
  discovery?: ResearchDiscoveryResult;
  repository?: RevisionRepository | null;
  current?: Partial<Record<ReferenceKind, CurrentRevision[]>>;
}) {
  const stored: NewCandidate[] = [];
  const extract = vi.fn(async () => ({
    raw: ANSWER_2026,
    trace: {
      model: "gemma-4-31b-it",
      task: "income_tax_research",
      attempts: [],
      rawText: "",
    },
  }));
  const repository: RevisionRepository =
    options.repository ??
    ({
      insertCandidate: vi.fn(async (candidate: NewCandidate) => {
        stored.push(candidate);
        return `rev-${stored.length}`;
      }),
      findActive: vi.fn(async () => null),
      findStartingIn: vi.fn(
        async (kind: ReferenceKind) => options.current?.[kind] ?? [],
      ),
    } satisfies RevisionRepository);
  const run = () =>
    researchAndStoreIncomeTax(2026, {
      research: { discover: async () => options.discovery ?? discovered() },
      fetcher: { fetch: async (url) => options.documents[url] },
      extraction: { extract },
      artifacts,
      revisions: options.repository === null ? null : repository,
    });
  return { run, stored, extract };
}

describe("researchAndStoreIncomeTax", () => {
  it("stores brackets and credit point as separate official candidates", async () => {
    const { run, stored } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
    });

    const result = await run();

    expect(result.persistence).toEqual({
      status: "stored",
      revisions: [
        { kind: "income_tax.monthly_brackets", id: "rev-1" },
        { kind: "income_tax.credit_point", id: "rev-2" },
      ],
    });
    const [brackets, creditPoint] = stored;
    expect(brackets).toMatchObject({
      kind: "income_tax.monthly_brackets",
      subjectKey: null,
      validFrom: "2026-01-01",
      validTo: null,
      value: { brackets: BRACKETS_2026 },
      origin: "research",
      trust: "official_verified",
      fallbackReason: null,
      evidence: [
        {
          evidenceType: "fetched_verified",
          source: 0,
          sourceReference: "page 10",
          page: 10,
          effectiveFrom: "2026-01-01",
        },
      ],
    });
    expect(brackets.evidence[0].quote).toContain("עד - 7,010 10%");
    expect(brackets.sources).toEqual([
      {
        url: BOOKLET_URL,
        finalUrl: BOOKLET_URL,
        publisher: "www.gov.il",
        tier: 1,
        discoveredVia: "known_source",
        accessStatus: "fetched",
        httpStatus: 200,
        contentType: "application/pdf",
        title: "לוח ניכויים חודשי ינואר 2025",
        sha256: SHA,
        grounding: null,
        fetchAttemptedAt: "2026-10-20T12:00:00.000Z",
        role: "supporting",
      },
    ]);
    expect(creditPoint).toMatchObject({
      kind: "income_tax.credit_point",
      subjectKey: null,
      value: { monthlyValue: 242 },
      evidence: [{ quote: "נקודת זיכוי 33 א 242 לחודש", page: 12 }],
    });
  });

  it("keeps blocked official sources and stores the secondary value with its fallback", async () => {
    const { run, stored } = setup({
      documents: {
        [BOOKLET_URL]: blocked(BOOKLET_URL),
        [GOV_PAGE]: blocked(GOV_PAGE),
        [KOL_ZCHUT]: fetchedDocument({
          requestedUrl: KOL_ZCHUT,
          finalUrl: KOL_ZCHUT,
          publisher: "www.kolzchut.org.il",
          contentType: "text/html",
          format: "html-text",
          sha256: "b".repeat(64),
          text: BOOKLET_2026_TEXT.replace(/\[page \d+\]\n/g, ""),
        }),
      },
      discovery: discovered(GOV_PAGE, KOL_ZCHUT),
    });

    await run();

    const [brackets] = stored;
    expect(brackets).toMatchObject({
      trust: "secondary_verified",
      fallbackReason: "official_source_blocked",
      evidence: [{ evidenceType: "fetched_verified", source: 2 }],
    });
    expect(
      brackets.sources.map(({ url, tier, accessStatus, sha256, role }) => ({
        url,
        tier,
        accessStatus,
        sha256,
        role,
      })),
    ).toEqual([
      {
        url: BOOKLET_URL,
        tier: 1,
        accessStatus: "blocked",
        sha256: null,
        role: "consulted",
      },
      {
        url: GOV_PAGE,
        tier: 1,
        accessStatus: "blocked",
        sha256: null,
        role: "consulted",
      },
      {
        url: KOL_ZCHUT,
        tier: 3,
        accessStatus: "fetched",
        sha256: "b".repeat(64),
        role: "supporting",
      },
    ]);
    expect(brackets.sources[1]).toMatchObject({
      discoveredVia: "grounding_metadata",
      httpStatus: 403,
      grounding: {
        searchTitle: "www.gov.il",
        searchQueries: ["לוח ניכויים חודשי 2026"],
      },
    });
  });

  it("only returns the result while persistence is disabled", async () => {
    const { run } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
      repository: null,
    });
    const result = await run();
    expect(result.research?.status).toBe("validated");
    expect(result.persistence).toEqual({ status: "disabled" });
  });

  it("stores nothing when the research is unresolved", async () => {
    const { run, stored } = setup({
      documents: { [BOOKLET_URL]: blocked(BOOKLET_URL) },
    });
    const result = await run();
    expect(result.persistence).toEqual({ status: "nothing_to_store" });
    expect(stored).toEqual([]);
  });

  it("reports a storage failure without losing the research result", async () => {
    const insertCandidate = vi
      .fn()
      .mockResolvedValueOnce("rev-1")
      .mockRejectedValueOnce(new Error("trust is not backed by evidence"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { run } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
      repository: {
        insertCandidate,
        findActive: vi.fn(),
        findStartingIn: vi.fn(async () => []),
      },
    });

    const result = await run();

    expect(result.research?.status).toBe("validated");
    expect(result.persistence).toEqual({
      status: "failed",
      revisions: [{ kind: "income_tax.monthly_brackets", id: "rev-1" }],
      error: "trust is not backed by evidence",
    });
    expect(errorLog).toHaveBeenCalledOnce();
    errorLog.mockRestore();
  });

  it("skips research when both kinds already have a revision for the year", async () => {
    const { run, stored, extract } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
      current: {
        "income_tax.monthly_brackets": [PENDING_2026],
        "income_tax.credit_point": [{ ...PENDING_2026, status: "active" }],
      },
    });

    const result = await run();

    expect(result.research).toBeNull();
    expect(result.coverage.map(({ status }) => status)).toEqual([
      "covered",
      "covered",
    ]);
    expect(result.persistence).toEqual({ status: "nothing_to_store" });
    expect(extract).not.toHaveBeenCalled();
    expect(stored).toEqual([]);
  });

  it("researches when one kind is missing and stores only that kind", async () => {
    const { run, stored } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
      current: { "income_tax.monthly_brackets": [PENDING_2026] },
    });

    const result = await run();

    expect(result.research?.status).toBe("validated");
    expect(result.coverage).toMatchObject([
      { kind: "income_tax.monthly_brackets", status: "covered" },
      { kind: "income_tax.credit_point", status: "missing" },
    ]);
    expect(stored.map(({ kind }) => kind)).toEqual(["income_tax.credit_point"]);
  });

  it("researches anyway when coverage cannot be read", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { run } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
      repository: {
        insertCandidate: vi.fn(async () => "rev-1"),
        findActive: vi.fn(),
        findStartingIn: vi.fn(async () => {
          throw new Error("network down");
        }),
      },
    });

    const result = await run();

    expect(result.coverage).toMatchObject([
      { status: "unchecked", reason: "network down" },
      { status: "unchecked", reason: "network down" },
    ]);
    expect(result.research?.status).toBe("validated");
    expect(result.persistence.status).toBe("stored");
    errorLog.mockRestore();
  });

  it("marks coverage unchecked while persistence is disabled", async () => {
    const { run } = setup({
      documents: { [BOOKLET_URL]: fetchedDocument() },
      repository: null,
    });
    const result = await run();
    expect(result.coverage).toMatchObject([
      { status: "unchecked", reason: "persistence disabled" },
      { status: "unchecked", reason: "persistence disabled" },
    ]);
  });
});
