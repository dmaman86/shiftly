import { expect, test } from "@playwright/test";

import { getHorizontalOverflow, prepareApp } from "../support/app";

/**
 * Below the `md` breakpoint the header collapses into a menu. Every page must
 * be reachable through it and fit the viewport without horizontal scrolling.
 */

const PAGES = [
  { label: "חישוב חודשי", path: /\/he\/monthly$/ },
  { label: "כללי חישוב", path: /\/he\/calculation-rules$/ },
  { label: "חישוב יומי", path: /\/he\/daily$/ },
];

test("navigates between pages through the mobile menu without horizontal overflow", async ({
  page,
}) => {
  await prepareApp(page);
  await page.goto("he/daily");

  // Page content also links between pages; only the header menu is under test.
  const header = page.getByRole("banner");
  const menuButton = header.getByRole("button", { name: "פתיחת תפריט הניווט" });
  await expect(menuButton).toBeVisible();
  expect(await getHorizontalOverflow(page)).toBe(0);

  for (const { label, path } of PAGES) {
    await menuButton.click();
    const link = header.getByRole("link", { name: label, exact: true });
    await link.click();

    await expect(page).toHaveURL(path);
    await expect(link).toBeHidden();
    await expect
      .poll(() => getHorizontalOverflow(page), { message: `overflow on ${label}` })
      .toBe(0);
  }
});

test("expands the menu on the first visit only", async ({ page }) => {
  await prepareApp(page, { firstVisit: true });
  await page.goto("he/daily");

  const header = page.getByRole("banner");
  await expect(header.getByRole("button", { name: "סגירת תפריט הניווט" })).toHaveAttribute("aria-expanded", "true");
  await expect(header.getByRole("link", { name: "כללי חישוב", exact: true })).toBeVisible();

  await page.reload();
  await expect(header.getByRole("button", { name: "פתיחת תפריט הניווט" })).toHaveAttribute("aria-expanded", "false");
  await expect(header.getByRole("link", { name: "כללי חישוב", exact: true })).toBeHidden();
});
