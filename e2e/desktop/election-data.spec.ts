import { expect, test } from "@playwright/test";
import {
  ELECTIONS_ROUTE,
  PUBLISHED_ELECTIONS,
  prepareApp,
} from "../support/app";

const fulfillElections: Parameters<
  import("@playwright/test").Page["route"]
>[1] = (route) => {
  const year = Number(new URL(route.request().url()).searchParams.get("year"));
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      year,
      elections: PUBLISHED_ELECTIONS.filter(({ date }) =>
        date.startsWith(`${year}-`),
      ),
    }),
  });
};

test("keeps holidays and warns when election days cannot be loaded, until a retry succeeds", async ({
  page,
}) => {
  await prepareApp(page);
  await page.route(ELECTIONS_ROUTE, (route) => route.abort());
  await page.goto("en/daily");

  const warning = page.getByTestId("election-data-missing");
  await expect(warning).toBeVisible();
  await expect(warning).toContainText(/election-day premium may be missing/i);
  // Holidays are computed in the browser and do not depend on the API.
  await expect(page.locator(".MuiChip-label")).toHaveCount(7);

  await page.unroute(ELECTIONS_ROUTE);
  await page.route(ELECTIONS_ROUTE, fulfillElections);
  await warning.getByRole("button", { name: /try again/i }).click();
  await expect(warning).toBeHidden();
});

test("uses the last election days it received when the API later fails", async ({
  page,
}) => {
  await prepareApp(page);
  await page.goto("en/daily");
  await expect(page.locator(".MuiChip-label")).toHaveCount(7);
  await expect(page.getByTestId("election-data-missing")).toHaveCount(0);

  await page.unroute(ELECTIONS_ROUTE);
  await page.route(ELECTIONS_ROUTE, (route) => route.abort());
  await page.reload();

  const warning = page.getByTestId("election-data-stale");
  await expect(warning).toBeVisible();
  await expect(warning).toContainText(/based on data saved on/i);
});
