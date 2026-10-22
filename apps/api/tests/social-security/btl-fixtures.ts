import { readFileSync } from "node:fs";
import type { FetchedDocument } from "../../src/research/ports.ts";
import { waybackCaptureUrl } from "../../src/research/web-archive.ts";
import { BTL_EMPLOYEE_RATES_URL } from "../../src/social-security/contributions-research.ts";

const fixture = (name: string) =>
  readFileSync(
    new URL(`../fixtures/social-security/btl/${name}`, import.meta.url),
    "utf8",
  );

/** Excerpts recorded in tests/fixtures/social-security/btl/SOURCES.md. */
export const BTL_2015 = fixture("archived-2015-12-27.txt");
export const BTL_2025_FEBRUARY = fixture("archived-2025-02-05.txt");
export const BTL_LIVE = fixture("live-2026-10-22.txt");
export const THRESHOLD_HISTORY = fixture("thresholds-history-2026-10-22.txt");
export const EMPLOYEE_TOTAL_HISTORY = fixture(
  "employee-totals-history-2026-10-22.txt",
);
export const REPORT_2018 = fixture("report-2018-page-35.txt");
export const REPORT_2019 = fixture("report-2019-page-35.txt");

export const CAPTURE_2015 = {
  timestamp: "20151227003000",
  capturedOn: "2015-12-27",
  url: waybackCaptureUrl("20151227003000", BTL_EMPLOYEE_RATES_URL),
};
export const CAPTURE_2025 = {
  timestamp: "20250205212112",
  capturedOn: "2025-02-05",
  url: waybackCaptureUrl("20250205212112", BTL_EMPLOYEE_RATES_URL),
};

export const TODAY = new Date("2026-10-22T09:00:00.000Z");

export const btlDocument = (
  url: string,
  text: string,
  patch: Partial<FetchedDocument> = {},
): FetchedDocument => ({
  requestedUrl: url,
  finalUrl: url,
  httpStatus: 200,
  contentType: "text/html; charset=utf-8",
  publisher: new URL(url).hostname,
  title: "שיעורי דמי ביטוח לעובדים שכירים",
  retrievedAt: TODAY.toISOString(),
  sha256: "b".repeat(64),
  accessibility: "accessible",
  problem: null,
  format: "html-text",
  text,
  bytes: null,
  ...patch,
});
