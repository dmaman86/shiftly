import { expect, test, type Locator, type Page } from "@playwright/test";

import { prepareApp } from "../support/app";
import {
  formatHours,
  formatTableSalary,
  formatTime,
  isCrossDay,
  loadMonthScenario,
} from "../support/scenario";

/**
 * Full desktop flow: pick a month, enter a whole month of statuses and shifts
 * through the table, and check every rendered value against the golden result.
 * Calculation correctness for all scenarios lives in the Vitest integration
 * test; this proves the desktop UI wires input and output to it correctly.
 */

const SCENARIO = "august-2026";

const LABELS = {
  en: {
    locale: "en-US",
    chooseDate: /choose date/i,
    month: "Month",
    year: "Year",
    hours: "Hours",
    minutes: "Minutes",
    showDayDetails: /show day details/i,
    hideDayDetails: /hide day details/i,
  },
  he: {
    locale: "he-IL",
    chooseDate: /בחר תאריך|בחירת תאריך/i,
    month: "חודש",
    year: "שנה",
    hours: "שעות",
    minutes: "דקות",
    showDayDetails: /הצג פרטי יום/i,
    hideDayDetails: /הסתר פרטי יום/i,
  },
} as const;

type Language = keyof typeof LABELS;

const monthName = (
  year: number,
  month: number,
  locale: string,
  style: "long" | "short",
) =>
  new Intl.DateTimeFormat(locale, { month: style }).format(
    new Date(year, month - 1, 1),
  );

const fillTimeField = async (
  field: Locator,
  time: string,
  labels: { hours: string; minutes: string },
) => {
  const [hours, minutes] = time.split(":");
  const minutesInput = field.getByRole("spinbutton", { name: labels.minutes });
  await field.getByRole("spinbutton", { name: labels.hours }).fill(hours);
  await minutesInput.fill(minutes);
  await minutesInput.press("Tab");
};

const expectDayDetail = async (
  page: Page,
  date: string,
  group: string,
  index: number,
  value: number,
) => {
  await expect(
    page.getByTestId(`day-details-${date}-${group}-${index}`),
  ).toHaveText(formatHours(value));
};

const { input, expected } = loadMonthScenario(SCENARIO);
// Salary columns and the salary summary only render when a base rate is set.
const showsSalary = input.baseRate > 0;

const expectSalary = async (locator: Locator, salary: number) => {
  if (showsSalary) {
    await expect(locator).toHaveText(formatTableSalary(salary));
  } else {
    await expect(locator).toHaveCount(0);
  }
};

for (const language of Object.keys(LABELS) as Language[]) {
  const labels = LABELS[language];

  test(`fills and calculates the ${SCENARIO} work table (${language})`, async ({
    page,
  }) => {
    await prepareApp(page, { holidays: input.holidays });
    await page.goto(`${language}/daily`);

    await page.getByRole("button", { name: labels.chooseDate }).click();
    const monthInput = page.getByRole("spinbutton", { name: labels.month });
    const yearInput = page.getByRole("spinbutton", { name: labels.year });
    const targetMonth = monthName(
      input.year,
      input.month,
      labels.locale,
      "long",
    );

    await monthInput.fill(targetMonth);
    await monthInput.press("Tab");
    await yearInput.fill(String(input.year));
    await yearInput.press("Tab");

    if ((await monthInput.textContent())?.trim() !== targetMonth) {
      await page
        .getByText(monthName(input.year, input.month, labels.locale, "short"), {
          exact: true,
        })
        .click();
    }

    await expect(monthInput).toHaveText(targetMonth);
    await expect(yearInput).toHaveText(String(input.year));
    if (await page.locator(".MuiPickersPopper-root").isVisible()) {
      await page.getByRole("button", { name: labels.chooseDate }).click();
    }

    const firstDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
    await expect(page.getByTestId(`work-day-row-${firstDate}`)).toBeVisible();

    const standardHoursInput = page.locator('input[name="standardHours"]');
    const baseRateInput = page.locator('input[name="baseRate"]');
    await standardHoursInput.fill(String(input.standardHours));
    await standardHoursInput.press("Tab");
    await baseRateInput.fill(String(input.baseRate));
    await baseRateInput.press("Tab");

    for (const { date, status } of input.statuses) {
      if (status === "normal") continue;
      const checkbox = page
        .getByTestId(`work-day-${status}-${date}`)
        .getByRole("checkbox");
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }

    for (const shift of input.shifts) {
      const rows = page.getByTestId(`work-day-row-${shift.date}`);
      await rows
        .first()
        .getByTestId(`work-day-add-shift-${shift.date}`)
        .click();

      const shiftRow = rows.last();
      const startField = shiftRow.getByTestId("shift-start-time");
      const endField = shiftRow.getByTestId("shift-end-time");
      const startTime = formatTime(shift.start_time, input.timeZone);
      const endTime = formatTime(shift.end_time, input.timeZone);

      await fillTimeField(startField, startTime, labels);
      await fillTimeField(endField, endTime, labels);

      if (isCrossDay(shift)) {
        const crossDayToggle = shiftRow
          .getByTestId("shift-cross-day-toggle")
          .getByRole("checkbox");
        await crossDayToggle.check();
        await expect(crossDayToggle).toBeChecked();
      }

      if (shift.is_duty) {
        await shiftRow.getByTestId("shift-duty-toggle").click();
      }

      await expect(startField.locator("input")).toHaveValue(startTime);
      await expect(endField.locator("input")).toHaveValue(endTime);
    }

    await expect(baseRateInput).toHaveValue(String(input.baseRate));

    for (const [date, { breakdown, salary }] of Object.entries(
      expected.daily,
    )) {
      const prefix = `work-day-${date}`;
      await expect(page.getByTestId(`${prefix}-actual-hours`)).toHaveText(
        formatHours(breakdown.actualHours),
      );
      await expect(page.getByTestId(`${prefix}-total-hours`)).toHaveText(
        formatHours(breakdown.totalHours),
      );
      await expect(page.getByTestId(`${prefix}-regular-hours`)).toHaveText(
        formatHours(breakdown.regular.hours100.hours),
      );
      await expect(page.getByTestId(`${prefix}-extra-hours`)).toHaveText(
        formatHours(
          breakdown.regular.hours125.hours + breakdown.regular.hours150.hours,
        ),
      );
      await expectSalary(page.getByTestId(`${prefix}-salary`), salary);

      const detailsRow = page.getByTestId(`work-day-row-${date}`).first();
      await detailsRow
        .getByRole("button", { name: labels.showDayDetails })
        .click();
      await expect(
        detailsRow.getByRole("button", { name: labels.hideDayDetails }),
      ).toBeVisible();

      await expectDayDetail(
        page,
        date,
        "overtime",
        0,
        breakdown.regular.hours100.hours,
      );
      await expectDayDetail(
        page,
        date,
        "overtime",
        1,
        breakdown.regular.hours125.hours,
      );
      await expectDayDetail(
        page,
        date,
        "overtime",
        2,
        breakdown.regular.hours150.hours,
      );
      await expectDayDetail(
        page,
        date,
        "shabbat",
        0,
        breakdown.special.shabbat150.hours,
      );
      await expectDayDetail(
        page,
        date,
        "shabbat",
        1,
        breakdown.special.shabbat200.hours,
      );
      await expectDayDetail(
        page,
        date,
        "extras",
        0,
        breakdown.extra.hours20.hours,
      );
      await expectDayDetail(
        page,
        date,
        "extras",
        1,
        breakdown.extra.hours50.hours,
      );
      await expectDayDetail(page, date, "meal", 0, breakdown.perDiemPoints);
      await expectDayDetail(page, date, "meal", 1, breakdown.largePoints);
      await expectDayDetail(page, date, "meal", 2, breakdown.smallPoints);
    }

    const monthly = expected.monthly.breakdown;
    await expect(page.getByTestId("work-table-footer")).toBeVisible();
    await expect(
      page.getByTestId("work-table-month-total-actual-hours"),
    ).toHaveText(formatHours(monthly.actualHours));
    await expect(
      page.getByTestId("work-table-month-total-total-hours"),
    ).toHaveText(formatHours(monthly.totalHours));
    await expect(
      page.getByTestId("work-table-month-total-regular-hours"),
    ).toHaveText(formatHours(monthly.regular.hours100.hours));
    await expect(
      page.getByTestId("work-table-month-total-extra-hours"),
    ).toHaveText(
      formatHours(
        monthly.regular.hours125.hours + monthly.regular.hours150.hours,
      ),
    );
    await expectSalary(
      page.getByTestId("work-table-month-total-salary"),
      expected.monthly.salary,
    );
    await expectSalary(
      page.getByTestId("monthly-salary-total"),
      expected.monthly.salary,
    );
  });
}
