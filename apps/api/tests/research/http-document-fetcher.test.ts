import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  HttpDocumentFetcher,
  USER_AGENT,
} from "../../src/research/http-document-fetcher.ts";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const URL_ = "https://www.kolzchut.org.il/he/page";

function respond(
  body: ConstructorParameters<typeof Response>[0],
  init: ResponseInit & { url?: string } = {},
) {
  const response = new Response(body, init);
  if (init.url) Object.defineProperty(response, "url", { value: init.url });
  return response;
}

function fetcherWith(response: Response | Error) {
  const fetch = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  return {
    fetcher: new HttpDocumentFetcher({ fetch, now: () => NOW }),
    fetch,
  };
}

describe("HttpDocumentFetcher", () => {
  it("reads an HTML page and records what was downloaded", async () => {
    const html = "<title>מדרגות מס הכנסה</title><p>10% עד 7,010</p>";
    const { fetcher, fetch } = fetcherWith(
      respond(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
        url: `${URL_}?redirected=1`,
      }),
    );

    const document = await fetcher.fetch(URL_);

    expect(fetch).toHaveBeenCalledWith(
      URL_,
      expect.objectContaining({
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
      }),
    );
    expect(document).toMatchObject({
      requestedUrl: URL_,
      finalUrl: `${URL_}?redirected=1`,
      httpStatus: 200,
      contentType: "text/html; charset=utf-8",
      publisher: "www.kolzchut.org.il",
      title: "מדרגות מס הכנסה",
      retrievedAt: NOW.toISOString(),
      sha256: createHash("sha256").update(html).digest("hex"),
      accessibility: "accessible",
      problem: null,
      format: "html-text",
      text: "10% עד 7,010",
    });
  });

  it.each([
    [403, {}],
    [429, {}],
    [200, { "cf-mitigated": "challenge" }],
  ])(
    "reports HTTP %i %j as blocked without reading it",
    async (status, headers) => {
      const { fetcher } = fetcherWith(
        respond("Just a moment...", { status, headers }),
      );
      expect(await fetcher.fetch(URL_)).toMatchObject({
        accessibility: "blocked",
        httpStatus: status,
        sha256: null,
        text: "",
      });
    },
  );

  it("reports a missing document as not found", async () => {
    const { fetcher } = fetcherWith(respond(null, { status: 404 }));
    expect(await fetcher.fetch(URL_)).toMatchObject({
      accessibility: "not_found",
      problem: "HTTP 404",
    });
  });

  it("reports a network failure as an error", async () => {
    const { fetcher } = fetcherWith(new Error("getaddrinfo ENOTFOUND"));
    expect(await fetcher.fetch(URL_)).toMatchObject({
      accessibility: "error",
      httpStatus: null,
      problem: "getaddrinfo ENOTFOUND",
    });
  });

  it("does not read content types it cannot convert", async () => {
    const { fetcher } = fetcherWith(
      respond(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      }),
    );
    expect(await fetcher.fetch(URL_)).toMatchObject({
      accessibility: "unsupported_content",
      problem: "content type image/png",
      text: "",
    });
  });

  it("reports a corrupt PDF as unreadable", async () => {
    const { fetcher } = fetcherWith(
      respond("%PDF-1.7 not really", {
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    expect(await fetcher.fetch(URL_)).toMatchObject({
      accessibility: "unsupported_content",
      format: "pdf-text",
    });
  });
});
