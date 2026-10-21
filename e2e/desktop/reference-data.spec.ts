import { expect, test } from "@playwright/test";
import {
  PUBLISHED_TIMELINES,
  TIMELINES_ROUTE,
  prepareApp,
} from "../support/app";

test("calculates with the rates included in the app when the API is down, until a retry succeeds", async ({
  page,
}) => {
  await prepareApp(page);
  await page.route(TIMELINES_ROUTE, (route) => route.abort());
  await page.goto("en/daily");

  const warning = page.getByTestId("reference-data-baseline");
  await expect(warning).toBeVisible();
  await expect(warning).toContainText(/rates included in the app/i);
  // The month is still calculated: the work table is there.
  await expect(page.locator(".MuiChip-label")).toHaveCount(7);

  await page.unroute(TIMELINES_ROUTE);
  await page.route(TIMELINES_ROUTE, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ timelines: PUBLISHED_TIMELINES }),
    }),
  );
  await warning.getByRole("button", { name: /try again/i }).click();
  await expect(warning).toBeHidden();
});

test("does not calculate a month whose published rates have a gap", async ({
  page,
}) => {
  await prepareApp(page, {
    timelines: {
      ...PUBLISHED_TIMELINES,
      "per_diem.point_rate": [
        {
          validFrom: "2015-11-01",
          validTo: "2026-01-01",
          value: { amount: 36.3 },
        },
      ],
    },
  });
  await page.goto("en/daily");

  const issue = page.getByTestId("reference-issue");
  await expect(issue).toBeVisible();
  await expect(issue).toContainText(/not calculated/i);
  await expect(issue).toContainText(/per diem/i);
  await expect(page.locator(".MuiChip-label")).toHaveCount(0);
  await expect(page.getByTestId("reference-data-baseline")).toHaveCount(0);
});
