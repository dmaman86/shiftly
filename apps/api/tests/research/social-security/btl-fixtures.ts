import { readFileSync } from "node:fs";

const fixture = (name: string) =>
  readFileSync(
    new URL(`../../fixtures/social-security/btl/${name}`, import.meta.url),
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
