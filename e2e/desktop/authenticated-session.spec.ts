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
  });

  await page.goto("en/daily");

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.locator('input[name="baseRate"]')).toHaveValue("57.5");

  // The saved month came from apps/api; Supabase is reached only through
  // paths still being migrated.
  expect(userData.all()).toContain("GET /me/months/2026/9/config");
  expect(supabaseData.all()).not.toContain("GET /rest/v1/monthly_configs");
  expect(supabaseData.unexpected()).toEqual([]);
});

test("a guest never asks Supabase for application data", async ({ page }) => {
  await prepareApp(page);
  const supabaseData = await watchSupabaseData(page);

  await page.goto("en/daily");

  await expect(page.locator('input[name="baseRate"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  expect(supabaseData.all()).toEqual([]);
});
