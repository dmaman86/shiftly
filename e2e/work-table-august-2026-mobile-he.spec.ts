import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Locator } from "@playwright/test";

type MobileFixture = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
  timeZone: string;
  shifts: Array<{
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_duty: boolean;
  }>;
};

const input = JSON.parse(
  readFileSync(resolve("e2e/fixtures/august-2026.json"), "utf8"),
) as MobileFixture;

const monthName = new Intl.DateTimeFormat("he-IL", {
  month: "long",
}).format(new Date(input.year, input.month - 1, 1));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: input.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const fillTimeField = async (
  field: Locator,
  time: string,
  offset: number,
) => {
  const [hours, minutes] = time.split(":");
  const spinbuttons = field.getByRole("spinbutton");
  const hoursInput = spinbuttons.nth(offset);
  const minutesInput = spinbuttons.nth(offset + 1);
  await hoursInput.fill(hours);
  await minutesInput.fill(minutes);
  await minutesInput.press("Tab");
};

test("creates the August 2026 work table in Hebrew on mobile", async ({
  page,
}) => {
  await page.route(
    /https:\/\/(www\.googletagmanager\.com|www\.google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net)\//,
    (route) => route.abort(),
  );
  await page.route("https://www.hebcal.com/hebcal/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    }),
  );

  await page.goto("he/daily");
  await page
    .getByRole("button", { name: /בחירת תאריך|בחר תאריך/i })
    .click();

  const datePickerDialog = page.getByRole("dialog");
  await datePickerDialog.getByText("אוג׳", { exact: true }).click();
  await datePickerDialog.getByRole("button", { name: "אישור" }).click();
  await expect(
    page.getByRole("heading", { name: `שעות חודש ${monthName} ${input.year}` }),
  ).toBeVisible();

  await page
    .locator('input[name="standardHours"]')
    .fill(String(input.standardHours));
  await page.locator('input[name="standardHours"]').press("Tab");
  await page
    .locator('input[name="baseRate"]')
    .fill(String(input.baseRate));
  await page.locator('input[name="baseRate"]').press("Tab");

  for (const shift of input.shifts) {
    await page
      .getByTestId(`mobile-calendar-day-${shift.date}`)
      .click();

    const dayCard = page.getByTestId(`work-day-card-${shift.date}`);
    await dayCard
      .getByTestId(`work-day-add-shift-${shift.date}`)
      .click();

    await fillTimeField(
      page.getByRole("group", { name: "כניסה" }).last(),
      formatTime(shift.start_time),
      0,
    );
    await fillTimeField(
      page.getByRole("group", { name: "יציאה" }).last(),
      formatTime(shift.end_time),
      0,
    );

    if (shift.start_time.slice(0, 10) !== shift.end_time.slice(0, 10)) {
      await page
        .getByTestId("shift-cross-day-toggle")
        .last()
        .locator("input")
        .check();
    }

    if (shift.is_duty) {
      await page.getByTestId("shift-duty-toggle").last().click();
    }
  }

  await page
    .getByTestId("mobile-calendar-day-2026-08-01")
    .click();
  await expect(page.getByTestId("work-day-card-2026-08-01")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "הצג פרטי יום", exact: true }),
  ).toBeVisible();
});
