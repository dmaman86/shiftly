import { expect, test } from "@playwright/test";

import { prepareApp } from "../support/app";
import { signIn, watchSupabaseData } from "../support/auth";

test("a signed-in user's month loads from their saved data", async ({
  page,
}) => {
  await prepareApp(page);
  await signIn(page);
  const supabaseData = await watchSupabaseData(page, {
    monthlyConfigs: [
      {
        year: 2026,
        month: 9,
        standard_hours: 6.67,
        base_rate: 57.5,
        unused_shabbat_credit_hours: 0,
      },
    ],
  });

  await page.goto("en/daily");

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.locator('input[name="baseRate"]')).toHaveValue("57.5");

  // The saved month was read, and only through paths still being migrated.
  expect(supabaseData.all()).toContain("GET /rest/v1/monthly_configs");
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
