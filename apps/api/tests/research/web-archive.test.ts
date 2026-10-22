import { describe, expect, it, vi } from "vitest";
import {
  WaybackArchiveIndex,
  waybackCaptureDay,
  waybackCaptureUrl,
} from "../../src/research/web-archive.ts";
import { sourceTier } from "../../src/research/source-policy.ts";

const PAGE = "https://www.btl.gov.il/Insurance/Rates/Pages/a.aspx";

describe("WaybackArchiveIndex", () => {
  it("lists distinct successful captures, oldest first", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json([
        ["timestamp", "statuscode"],
        ["20250205212112", "200"],
        ["20151227003000", "200"],
        ["not-a-timestamp", "200"],
      ]),
    );
    const captures = await new WaybackArchiveIndex({ fetch }).snapshots(PAGE);

    expect(captures).toEqual([
      {
        timestamp: "20151227003000",
        capturedOn: "2015-12-27",
        url: `https://web.archive.org/web/20151227003000id_/${PAGE}`,
      },
      {
        timestamp: "20250205212112",
        capturedOn: "2025-02-05",
        url: `https://web.archive.org/web/20250205212112id_/${PAGE}`,
      },
    ]);
    const requested = new URL(String(fetch.mock.calls[0][0]));
    expect(requested.searchParams.get("filter")).toBe("statuscode:200");
    expect(requested.searchParams.get("collapse")).toBe("digest");
  });

  it("fails loudly when the index does not answer", async () => {
    const fetch = vi.fn(async () => new Response("busy", { status: 503 }));
    await expect(
      new WaybackArchiveIndex({ fetch }).snapshots(PAGE),
    ).rejects.toThrow("the archive index answered HTTP 503");
  });
});

describe("waybackCaptureDay", () => {
  it("reads the capture day, also after a redirect to another timestamp", () => {
    expect(waybackCaptureDay(waybackCaptureUrl("20250205212112", PAGE))).toBe(
      "2025-02-05",
    );
    expect(
      waybackCaptureDay(`https://web.archive.org/web/20250206000000/${PAGE}`),
    ).toBe("2025-02-06");
    expect(waybackCaptureDay(PAGE)).toBeNull();
  });

  it("captures of official pages are official mirrors", () => {
    expect(sourceTier(waybackCaptureUrl("20250205212112", PAGE))).toBe(2);
  });
});
