import { expect, test } from "@playwright/test";
import { prepareApp } from "../support/app";

test("keeps the selector and page height stable while the next calendar loads", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await prepareApp(page);
  await page.goto("en/daily");
  await expect(
    page.getByRole("heading", { name: /September 2026/ }),
  ).toBeVisible();
  const rate = page.getByLabel("Hourly Rate", { exact: true });
  // Include the salary summary in the height that must survive loading.
  await rate.fill("60");
  await expect(rate).toHaveValue("60");
  await expect(
    page.getByRole("heading", { name: /Monthly Salary Summary/ }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 55));
  const previousHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const selector = page.getByRole("group", { name: /date/i });
  const originalSelector = await selector.elementHandle();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/calendar/*.json", async (route) => {
    await pending;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });

  try {
    await page.getByRole("button", { name: /choose date/i }).click();
    await expect(
      page.getByRole("radio", { name: "September", exact: true }),
    ).toBeFocused();
    const monthOption = page.getByRole("radio", {
      name: "August",
      exact: true,
    });
    await monthOption.scrollIntoViewIfNeeded();
    const previousScroll = await page.evaluate(() => window.scrollY);
    await monthOption.click();
    await expect(page.locator('[aria-busy="true"]')).not.toHaveCount(0);
    expect(
      await originalSelector?.evaluate((element) => element.isConnected),
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeGreaterThanOrEqual(previousHeight - 5);
    expect(await page.evaluate(() => window.scrollY)).toBe(previousScroll);
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: /August 2026/ }),
  ).toBeVisible();
  expect(
    await originalSelector?.evaluate((element) => element.isConnected),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: /choose date/i }),
  ).toBeFocused();
});
