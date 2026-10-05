import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { prepareApp } from "../support/app";

/**
 * jsPDF is loaded on demand, so this guards both halves of that contract in a
 * real browser: the library is not requested on page load, and the dynamic
 * chunk still loads and produces a valid PDF when the user exports.
 */
test("loads jsPDF only on export and downloads a valid PDF", async ({
  page,
}) => {
  const jspdfRequests: string[] = [];
  page.on("request", (request) => {
    if (/jspdf/i.test(request.url())) jspdfRequests.push(request.url());
  });

  await prepareApp(page);
  await page.goto("he/daily");
  const exportButton = page.getByRole("button", { name: "ייצא כ-PDF" });
  await expect(exportButton).toBeVisible();
  expect(jspdfRequests).toEqual([]);

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  expect(jspdfRequests.length).toBeGreaterThan(0);
  expect(download.suggestedFilename()).toBe("work-table-2026-09.pdf");
  const content = await readFile(await download.path());
  expect(content.subarray(0, 5).toString()).toBe("%PDF-");
});
