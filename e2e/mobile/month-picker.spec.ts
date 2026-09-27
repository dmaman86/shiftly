import { expect, test } from "@playwright/test";

import { prepareApp } from "../support/app";
import { selectMonthInDialog } from "../support/mobile";

/**
 * Touch devices pick the month through a modal dialog instead of the desktop
 * popper. Runs on both mobile engines; the full-month flow only on Android.
 */
test("selects another month through the modal date picker", async ({ page }) => {
  await prepareApp(page);
  await page.goto("he/daily");
  await expect(page.getByTestId("mobile-calendar-day-2026-09-15")).toBeVisible();

  await selectMonthInDialog(page, 2026, 8);

  await expect(page.getByTestId("mobile-calendar-day-2026-08-01")).toBeVisible();
  await expect(page.getByTestId("work-day-card-2026-08-01")).toBeVisible();
});
