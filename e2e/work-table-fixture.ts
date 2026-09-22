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

type WorkTableResults = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
  timeZone: string;
  daily: Record<string, { breakdown: PayBreakdown; salary: number }>;
  monthly: { salary: number; breakdown: PayBreakdown };
};

type FixtureTestOptions = {
  title: string;
  inputFile: string;
  resultFile: string;
  hebcalItems?: Array<{
    date: string;
    title: string;
    category: "holiday";
    yomtov?: boolean;
  }>;
};

const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, month - 1, 1),
  );

const shortMonthName = (year: number, month: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(year, month - 1, 1),
  );

const loadJson = <T>(file: string): T =>
  JSON.parse(readFileSync(resolve(file), "utf8")) as T;

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

const dayRows = (page: Page, date: string) =>
  page.locator(`[data-testid="work-day-row-${date}"]`);

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

const fillTimeField = async (
  field: ReturnType<Page["getByTestId"]>,
  time: string,
) => {
  const [hours, minutes] = time.split(":");
  await field.getByRole("spinbutton", { name: "Hours" }).fill(hours);
  await field.getByRole("spinbutton", { name: "Minutes" }).fill(minutes);
  await field.getByRole("spinbutton", { name: "Minutes" }).press("Tab");
};

export const defineWorkTableFixtureTest = ({
  title,
  inputFile,
  resultFile,
  hebcalItems = [],
}: FixtureTestOptions) => {
  const input = loadJson<WorkTableFixture>(inputFile);
  const expected = loadJson<WorkTableResults>(resultFile);

  test(title, async ({ page }) => {
    await page.route(
      /https:\/\/(www\.googletagmanager\.com|www\.google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net)\//,
      (route) => route.abort(),
    );

    await page.route("https://www.hebcal.com/hebcal/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: hebcalItems }),
      }),
    );

    await page.goto("en/daily");
    await page.getByRole("button", { name: /choose date/i }).click();
    const monthInput = page.getByRole("spinbutton", { name: "Month" });
    const yearInput = page.getByRole("spinbutton", { name: "Year" });
    const targetMonth = monthName(input.year, input.month);

    await monthInput.fill(targetMonth);
    await monthInput.press("Tab");
    await yearInput.fill(String(input.year));
    await yearInput.press("Tab");

    if ((await monthInput.textContent())?.trim() !== targetMonth) {
      await page
        .getByText(shortMonthName(input.year, input.month), { exact: true })
        .click();
    }

    await expect(monthInput).toHaveText(targetMonth);
    await expect(yearInput).toHaveText(String(input.year));
    const datePickerPopup = page.locator(".MuiPickersPopper-root");
    if (await datePickerPopup.isVisible()) {
      await page.getByRole("button", { name: /choose date/i }).click();
    }

    const firstDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
    await expect(page.getByTestId(`work-day-row-${firstDate}`)).toBeVisible();

    const standardHoursInput = page.locator('input[name="standardHours"]');
    const baseRateInput = page.locator('input[name="baseRate"]');
    await standardHoursInput.fill(String(input.standardHours));
    await standardHoursInput.press("Tab");
    await baseRateInput.fill(String(input.baseRate));
    await baseRateInput.press("Tab");

    for (const status of input.statuses) {
      if (status.status === "normal") continue;

      const checkbox = page
        .getByTestId(`work-day-row-${status.date}`)
        .getByRole("checkbox")
        .nth(status.status === "sick" ? 0 : 1);
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }

    for (const shift of input.shifts) {
      const rows = dayRows(page, shift.date);
      await rows
        .first()
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

      if (shift.is_duty) {
        await shiftRow
          .getByTestId("shift-cross-day-toggle")
          .getByRole("button")
          .first()
          .click();
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
      const salaryCell = page.getByTestId(`${prefix}-salary`);
      if ((await salaryCell.count()) > 0) {
        await expect(salaryCell).toHaveText(formatSalary(result.salary));
      }

      const detailsRow = page.getByTestId(`work-day-row-${date}`).first();
      const detailsButton = detailsRow.getByRole("button", {
        name: /show day details/i,
      });
      const expandedDetailsButton = detailsRow.getByRole("button", {
        name: /hide day details/i,
      });

      await expect(detailsButton).toBeVisible();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if ((await expandedDetailsButton.count()) > 0) break;
        await detailsButton.dispatchEvent("click");
        await page.waitForTimeout(100);
      }
      await expect(expandedDetailsButton).toBeVisible();

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
    await expect(page.getByTestId("work-table-month-total-actual-hours")).toHaveText(
      formatValue(monthlyBreakdown.actualHours),
    );
    await expect(page.getByTestId("work-table-month-total-total-hours")).toHaveText(
      formatValue(monthlyBreakdown.totalHours),
    );
    await expect(page.getByTestId("work-table-month-total-regular-hours")).toHaveText(
      formatValue(monthlyBreakdown.regular.hours100.hours),
    );
    await expect(page.getByTestId("work-table-month-total-extra-hours")).toHaveText(
      formatValue(
        monthlyBreakdown.regular.hours125.hours +
          monthlyBreakdown.regular.hours150.hours,
      ),
    );
    const monthlySalaryCell = page.getByTestId("work-table-month-total-salary");
    if ((await monthlySalaryCell.count()) > 0) {
      await expect(monthlySalaryCell).toHaveText(
        formatSalary(expected.monthly.salary),
      );
    }
    const monthlySummary = page.getByTestId("monthly-salary-summary");
    if ((await monthlySummary.count()) > 0) {
      await expect(monthlySummary).toBeVisible();
    }
    const monthlySalarySummary = page.getByTestId("monthly-salary-total");
    if ((await monthlySalarySummary.count()) > 0) {
      await expect(monthlySalarySummary).toHaveText(
        formatSalary(expected.monthly.salary),
      );
    }

    expect(expected.year).toBe(input.year);
    expect(expected.month).toBe(input.month);
    expect(expected.baseRate).toBe(input.baseRate);
    expect(Object.keys(expected.daily).length).toBeGreaterThan(0);
    expect(expected.monthly.breakdown.totalHours).toBeGreaterThan(0);
  });
};
