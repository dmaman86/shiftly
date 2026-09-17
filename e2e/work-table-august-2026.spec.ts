import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

type WorkTableFixture = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
  timeZone: string;
  statuses: Array<{ date: string; status: "normal" | "sick" | "vacation" }>;
  shifts: Array<{
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_duty: boolean;
  }>;
};

type WorkTableResults = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
  timeZone: string;
  daily: Record<string, DailyResult>;
  monthly: {
    salary: number;
    breakdown: PayBreakdown;
  };
};

type PayBreakdown = {
  totalHours: number;
  actualHours: number;
  regular: {
    hours100: { hours: number };
    hours125: { hours: number };
    hours150: { hours: number };
  };
  extra: {
    hours20: { hours: number };
    hours50: { hours: number };
  };
  special: {
    shabbat150: { hours: number };
    shabbat200: { hours: number };
  };
  perDiemPoints: number;
  largePoints: number;
  smallPoints: number;
};

type DailyResult = {
  breakdown: PayBreakdown;
  salary: number;
};

const input = JSON.parse(
  readFileSync(resolve("e2e/fixtures/august-2026.json"), "utf8"),
) as WorkTableFixture;
const expected = JSON.parse(
  readFileSync(resolve("e2e/fixtures/august-2026.results.json"), "utf8"),
) as WorkTableResults;

const formatTime = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const formatValue = (value: number) =>
  Math.abs(value) < 0.005 ? "" : value.toFixed(2);

const formatSalary = (value: number) =>
  value > 0 ? `₪${formatValue(value)}` : "";

const expectDayDetail = async (
  page: Page,
  date: string,
  group: string,
  index: number,
  value: number,
) => {
  await expect(
    page.getByTestId(`day-details-${date}-${group}-${index}`),
  ).toHaveText(formatValue(value));
};

const dayRows = (page: Page, date: string) =>
  page.locator(`[data-testid="work-day-row-${date}"]`);

const fillTimeField = async (field: ReturnType<Page["getByTestId"]>, time: string) => {
  const [hours, minutes] = time.split(":");
  await field.getByRole("spinbutton", { name: "Hours" }).fill(hours);
  await field.getByRole("spinbutton", { name: "Minutes" }).fill(minutes);
  await field.getByRole("spinbutton", { name: "Minutes" }).press("Tab");
};

test("creates the August 2026 work table from the fixture", async ({ page }) => {
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

  await page.goto("en/daily");

  await page.getByRole("button", { name: /choose date/i }).click();
  await page.getByRole("spinbutton", { name: "Month" }).fill("August");
  await page.getByRole("spinbutton", { name: "Year" }).fill("2026");
  await page.keyboard.press("Enter");

  await expect(
    page.getByTestId("work-day-row-2026-08-01"),
  ).toBeVisible();

  const standardHoursInput = page.locator('input[name="standardHours"]');
  const baseRateInput = page.locator('input[name="baseRate"]');
  await standardHoursInput.fill(String(input.standardHours));
  await standardHoursInput.press("Tab");
  await baseRateInput.fill(String(input.baseRate));
  await baseRateInput.press("Tab");

  for (const status of input.statuses) {
    if (status.status === "normal") continue;

    const checkbox = page
      .getByTestId(`work-day-${status.status}-${status.date}`)
      .getByRole("checkbox");
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }

  for (const shift of input.shifts) {
    const rows = dayRows(page, shift.date);
    const firstRow = rows.first();

    await firstRow
      .getByTestId(`work-day-add-shift-${shift.date}`)
      .click();

    const shiftRow = rows.last();
    const startField = shiftRow.getByTestId("shift-start-time");
    const endField = shiftRow.getByTestId("shift-end-time");
    const startInput = startField.locator("input");
    const endInput = endField.locator("input");
    const startTime = formatTime(shift.start_time, input.timeZone);
    const endTime = formatTime(shift.end_time, input.timeZone);

    await fillTimeField(startField, startTime);
    await fillTimeField(endField, endTime);

    if (shift.start_time.slice(0, 10) !== shift.end_time.slice(0, 10)) {
      const crossDayToggle = shiftRow
        .getByTestId("shift-cross-day-toggle")
        .getByRole("checkbox");
      await crossDayToggle.check();
      await expect(crossDayToggle).toBeChecked();
    }

    await expect(startInput).toHaveValue(startTime);
    await expect(endInput).toHaveValue(endTime);
  }

  await expect(baseRateInput).toHaveValue(String(input.baseRate));
  for (const [date, result] of Object.entries(expected.daily)) {
    const breakdown = result.breakdown;
    const prefix = `work-day-${date}`;
    await expect(page.getByTestId(`${prefix}-actual-hours`)).toHaveText(
      formatValue(breakdown.actualHours),
    );
    await expect(page.getByTestId(`${prefix}-total-hours`)).toHaveText(
      formatValue(breakdown.totalHours),
    );
    await expect(page.getByTestId(`${prefix}-regular-hours`)).toHaveText(
      formatValue(breakdown.regular.hours100.hours),
    );
    await expect(page.getByTestId(`${prefix}-extra-hours`)).toHaveText(
      formatValue(
        breakdown.regular.hours125.hours + breakdown.regular.hours150.hours,
      ),
    );
    await expect(page.getByTestId(`${prefix}-salary`)).toHaveText(
      formatSalary(result.salary),
    );

    await page
      .getByTestId(`work-day-row-${date}`)
      .first()
      .getByRole("button", { name: /show day details/i })
      .click();
    await expect(page.locator(`#day-details-${date}`)).toBeVisible();

    await expectDayDetail(page, date, "overtime", 0, breakdown.regular.hours100.hours);
    await expectDayDetail(page, date, "overtime", 1, breakdown.regular.hours125.hours);
    await expectDayDetail(page, date, "overtime", 2, breakdown.regular.hours150.hours);
    await expectDayDetail(page, date, "shabbat", 0, breakdown.special.shabbat150.hours);
    await expectDayDetail(page, date, "shabbat", 1, breakdown.special.shabbat200.hours);
    await expectDayDetail(page, date, "extras", 0, breakdown.extra.hours20.hours);
    await expectDayDetail(page, date, "extras", 1, breakdown.extra.hours50.hours);
    await expectDayDetail(page, date, "meal", 0, breakdown.perDiemPoints);
    await expectDayDetail(page, date, "meal", 1, breakdown.largePoints);
    await expectDayDetail(page, date, "meal", 2, breakdown.smallPoints);
  }

  const monthlyBreakdown = expected.monthly.breakdown;
  await expect(page.getByTestId("work-table-footer")).toBeVisible();
  await expect(
    page.getByTestId("work-table-month-total-actual-hours"),
  ).toHaveText(formatValue(monthlyBreakdown.actualHours));
  await expect(
    page.getByTestId("work-table-month-total-total-hours"),
  ).toHaveText(formatValue(monthlyBreakdown.totalHours));
  await expect(
    page.getByTestId("work-table-month-total-regular-hours"),
  ).toHaveText(formatValue(monthlyBreakdown.regular.hours100.hours));
  await expect(
    page.getByTestId("work-table-month-total-extra-hours"),
  ).toHaveText(
    formatValue(
      monthlyBreakdown.regular.hours125.hours +
        monthlyBreakdown.regular.hours150.hours,
    ),
  );
  await expect(page.getByTestId("work-table-month-total-salary")).toHaveText(
    formatSalary(expected.monthly.salary),
  );
  await expect(page.getByTestId("monthly-salary-summary")).toBeVisible();
  await expect(page.getByTestId("monthly-salary-total")).toHaveText(
    formatSalary(expected.monthly.salary),
  );

  expect(expected.year).toBe(input.year);
  expect(expected.month).toBe(input.month);
  expect(expected.baseRate).toBe(input.baseRate);
  expect(Object.keys(expected.daily)).toHaveLength(input.shifts.length);
  expect(expected.monthly.breakdown.totalHours).toBeGreaterThan(0);
});
