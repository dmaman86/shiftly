import { expect, test } from "@playwright/test";

import { getHorizontalOverflow, prepareApp } from "../support/app";

/**
 * Between the `sm` and `md` breakpoints the work table already uses the
 * desktop layout while the header still uses the mobile menu. Guard that
 * mixed state, which neither the phone nor the desktop profile renders.
 */

test.use({ viewport: { width: 768, height: 1024 } });

test("uses the table layout with the collapsed menu at tablet width", async ({ page }) => {
  await prepareApp(page);
  await page.goto("he/daily");

  await expect(page.getByRole("button", { name: "פתיחת תפריט הניווט" })).toBeVisible();
  await expect(page.getByTestId("work-day-row-2026-09-15").first()).toBeVisible();
  await expect(page.getByTestId(/^mobile-calendar-day-/)).toHaveCount(0);
  expect(await getHorizontalOverflow(page)).toBe(0);
});
