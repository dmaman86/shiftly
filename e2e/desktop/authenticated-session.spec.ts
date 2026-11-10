import { expect, test } from "@playwright/test";

import { prepareApp } from "../support/app";
import { serveUserData, signIn, watchSupabaseData } from "../support/auth";

test("a signed-in user's month loads from their saved data", async ({
  page,
}) => {
  await prepareApp(page);
  await signIn(page);
  const supabaseData = await watchSupabaseData(page);
  const userData = await serveUserData(page, {
    monthlyConfigs: [
      {
        year: 2026,
        month: 9,
        standardHours: 6.67,
        baseRate: 57.5,
        unusedShabbatCreditHours: 0,
      },
    ],
    workDays: [{ date: "2026-09-02", status: "sick" }],
    shifts: [
      {
        id: "00000000-0000-4000-8000-0000000000f1",
        date: "2026-09-01",
        startTime: "2026-09-01T05:00:00+00:00",
        endTime: "2026-09-01T13:00:00+00:00",
        isDuty: false,
      },
    ],
  });

  await page.goto("en/daily");

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.locator('input[name="baseRate"]')).toHaveValue("57.5");

  // The saved month came from apps/api; Supabase is never asked for it.
  await expect
    .poll(() => userData.all())
    .toEqual(
      expect.arrayContaining([
        "GET /me/months/2026/9/config",
        "GET /me/months/2026/9/work-days",
        "GET /me/months/2026/9/shifts",
      ]),
    );
  expect(supabaseData.all()).toEqual([]);
});

test("a guest never asks Supabase for application data", async ({ page }) => {
  await prepareApp(page);
  const supabaseData = await watchSupabaseData(page);

  await page.goto("en/daily");

  await expect(page.locator('input[name="baseRate"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  expect(supabaseData.all()).toEqual([]);
});
