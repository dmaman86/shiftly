import { expect, test } from "@playwright/test";

import { prepareApp } from "../support/app";
import { selectMonthInDialog } from "../support/mobile";

/**
 * Touch devices pick the month through a modal dialog instead of the desktop
 * popper. Runs on both mobile engines; the full-month flow only on Android.
 */
test("selects another month through the modal date picker", async ({
  page,
}) => {
  await prepareApp(page);
  await page.goto("he/daily");
  await expect(
    page.getByTestId("mobile-calendar-day-2026-09-15"),
  ).toBeVisible();

  await selectMonthInDialog(page, 2026, 8);
  await expect(
    page.getByRole("button", { name: /בחירת תאריך|בחר תאריך/i }),
  ).toBeFocused();

  await expect(
    page.getByTestId("mobile-calendar-day-2026-08-01"),
  ).toBeVisible();
  await expect(page.getByTestId("work-day-card-2026-08-01")).toBeVisible();
});

test("discards an unconfirmed month selection when the modal is cancelled", async ({
  page,
}) => {
  await prepareApp(page);
  await page.goto("he/daily");
  const originalDay = page.getByTestId("mobile-calendar-day-2026-09-15");
  await expect(originalDay).toBeVisible();

  await page.getByRole("button", { name: /בחירת תאריך|בחר תאריך/i }).click();
  const dialog = page.getByRole("dialog");
  const shortLabel = new Intl.DateTimeFormat("he-IL", {
    month: "short",
  }).format(new Date(2026, 7, 1));
  await dialog.getByText(shortLabel, { exact: true }).click();
  await expect(dialog.getByRole("button", { name: "אישור" })).toBeVisible();
  await expect(originalDay).toBeVisible();
  await dialog.getByRole("button", { name: "ביטול" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: /בחירת תאריך|בחר תאריך/i }),
  ).toBeFocused();
  await expect(originalDay).toBeVisible();
  await selectMonthInDialog(page, 2026, 8);
  await expect(
    page.getByTestId("mobile-calendar-day-2026-08-01"),
  ).toBeVisible();
});
