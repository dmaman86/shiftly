import { expect, test } from "@playwright/test";
import { getHorizontalOverflow, prepareApp } from "../support/app";

test.use({ viewport: { width: 1363, height: 936 } });

for (const language of ["en", "he"]) {
  test(`uses visible page headings and named controls (${language})`, async ({ page }) => {
    await prepareApp(page);
    for (const route of ["daily", "monthly", "calculation-rules"]) {
      await page.goto(`${language}/${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("main h5, main h6")).toHaveCount(0);
      await expect(page.locator("a button, button a")).toHaveCount(0);
    }
    await page.goto(`${language}/daily`);
    for (const add of await page.getByTestId(/^work-day-add-shift-/).all()) {
      await expect(add).toHaveAccessibleName(/.+/);
    }
  });
}

test("exposes named controls, single navigation links and associated validation", async ({ page }) => {
  await prepareApp(page);
  await page.goto("en/daily");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator("a button, button a")).toHaveCount(0);

  const row = page.getByTestId("work-day-row-2026-09-15");
  for (const checkbox of await row.getByRole("checkbox").all()) {
    await expect(checkbox).toHaveAccessibleName(/.+/);
  }
  const add = row.getByRole("button", { name: /add shift/i });
  await expect(add).toBeVisible();
  await add.click();
  await expect(row.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(row.getByRole("group", { name: /shift 1/i })).toHaveCount(2);
  const duty = row.getByRole("button", { name: /duty/i });
  await expect(duty).toHaveAttribute("aria-pressed", "false");

  const rate = page.locator('input[name="baseRate"]');
  await rate.fill("-1");
  await expect(rate).toHaveAttribute("aria-invalid", "true");
  await expect(rate).toHaveAccessibleDescription(/.+/);
  await rate.fill("50");
  await row.getByRole("group", { name: /^In, shift 1/i }).getByRole("spinbutton", { name: "Hours" }).fill("08");
  const end = row.getByRole("group", { name: /^Out, shift 1/i });
  await expect(end).toHaveAccessibleDescription(/end time must be after start time/i);
  await end.getByRole("spinbutton", { name: "Hours" }).fill("16");
  await expect(page.getByRole("status")).toContainText("Calculation updated", { timeout: 10000 });
  await duty.click();
  await expect(duty).toHaveAttribute("aria-pressed", "true");
  expect(await getHorizontalOverflow(page)).toBe(0);
});

test("retains accessible shift context in the mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareApp(page);
  await page.goto("en/daily");
  const add = page.getByTestId("work-day-add-shift-2026-09-15");
  await expect(add).toHaveAccessibleName(/add shift/i);
  await add.click();
  await add.click();
  for (const number of [1, 2]) {
    await expect(page.getByRole("group", { name: new RegExp(`shift ${number},`) })).toHaveCount(2);
  }
  for (const duty of await page.getByTestId("shift-duty-toggle").all()) {
    await expect(duty).toHaveAccessibleName(/duty/i);
    await expect(duty).toHaveAttribute("aria-pressed", "false");
  }
  expect(await getHorizontalOverflow(page)).toBe(0);
});

test("renders audited text colors above the normal-text contrast threshold", async ({ page }) => {
  await prepareApp(page, { holidays: [
    { date: "2026-09-11", title: "Erev Rosh Hashana", category: "holiday" },
    { date: "2026-09-12", title: "Rosh Hashana I", category: "holiday", yomtov: true },
  ] });
  await page.goto("en/daily");
  await page.locator('input[name="baseRate"]').fill("50");
  await expect(page.locator(".MuiChip-label")).toHaveCount(2);
  await expect(page.getByTestId("monthly-salary-total")).toBeVisible();
  const contrasts = await page.evaluate(() => {
    type Color = [number, number, number, number];
    const parse = (value: string): Color => {
      const parts = value.match(/[\d.]+/g)!.map(Number);
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    };
    const over = (front: Color, back: Color): Color => [
      front[0] * front[3] + back[0] * (1 - front[3]),
      front[1] * front[3] + back[1] * (1 - front[3]),
      front[2] * front[3] + back[2] * (1 - front[3]), 1,
    ];
    const luminance = (color: Color) => color.slice(0, 3).reduce((sum, channel, index) => {
      const value = channel / 255;
      return sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    }, 0);
    const targets = [
      ...Array.from(document.querySelectorAll(".MuiChip-label")),
      ...Array.from(document.querySelectorAll(".MuiAlert-message")),
      ...Array.from(document.querySelectorAll("td")).filter(element => getComputedStyle(element).color === "rgb(166, 68, 0)"),
    ];
    return targets.map(element => {
      const ancestors: Element[] = [];
      for (let current: Element | null = element; current; current = current.parentElement) ancestors.push(current);
      const background = ancestors.reverse().reduce((color, ancestor) => over(parse(getComputedStyle(ancestor).backgroundColor), color), [255, 255, 255, 1] as Color);
      const foreground = over(parse(getComputedStyle(element).color), background);
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return { text: element.textContent?.trim(), ratio: (values[0] + 0.05) / (values[1] + 0.05) };
    });
  });
  expect(contrasts.length).toBeGreaterThanOrEqual(4);
  for (const target of contrasts) expect(target.ratio, target.text).toBeGreaterThanOrEqual(4.5);
  console.log("Audited rendered contrast:", contrasts);
});
