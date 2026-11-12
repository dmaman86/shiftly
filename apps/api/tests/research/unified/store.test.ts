import { describe, expect, it, vi } from "vitest";
import { SupabaseResearchStore } from "../../../src/repositories/supabase-research-store.ts";
import { REQUEST } from "./fixtures.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
describe("Supabase research boundary", () => {
  it("reads full effective timelines for requested kinds without annual start filtering", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json([]));
    const store = new SupabaseResearchStore({
      url: "https://project.supabase.co",
      secretKey: "synthetic",
      fetch,
    });
    expect(await store.read(REQUEST)).toEqual({ revisions: [], attempts: [] });
    expect(fetch).toHaveBeenCalledTimes(2);
    const revisionsUrl = new URL(String(fetch.mock.calls[0][0]));
    expect(revisionsUrl.searchParams.get("kind")).toBe(
      "in.(income_tax.credit_point)",
    );
    expect(revisionsUrl.searchParams.get("status")).toBe(
      "in.(active,pending_review)",
    );
    expect(revisionsUrl.searchParams.has("valid_from")).toBe(false);
    expect(revisionsUrl.searchParams.get("select")).toContain(
      "reference_evidence",
    );
    const attemptsUrl = new URL(String(fetch.mock.calls[1][0]));
    expect(attemptsUrl.searchParams.get("scope")).toBe("eq.month:2026-02-01");
  });
  it("does not infer sufficient evidence from an official trust label alone", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
      String(input).includes("reference_revisions")
        ? json([
            {
              id: "revision",
              kind: "income_tax.credit_point",
              subject_key: null,
              status: "active",
              valid_from: "2025-01-01",
              valid_to: null,
              value: { monthlyValue: 123 },
              trust: "official_verified",
              reference_evidence: [],
            },
          ])
        : json([]),
    );
    const store = new SupabaseResearchStore({
      url: "https://project.supabase.co",
      secretKey: "synthetic",
      fetch,
    });
    expect((await store.read(REQUEST)).revisions[0].sufficientEvidence).toBe(
      false,
    );
  });
  it("fails closed when attempt tracking or coverage cannot be read", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ message: "unavailable" }, 503),
    );
    const store = new SupabaseResearchStore({
      url: "https://project.supabase.co",
      secretKey: "synthetic",
      fetch,
    });
    await expect(store.read(REQUEST)).rejects.toThrow("research_unavailable");
  });
});
