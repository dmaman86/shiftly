import { expect, test, type Locator, type Page } from "@playwright/test";

import { prepareApp } from "../support/app";
import { selectMonthInDialog } from "../support/mobile";
import {
  formatHours,
  formatTableSalary,
  formatTileSalary,
  formatTime,
  isCrossDay,
  loadMonthScenario,
} from "../support/scenario";

/**
 * Critical mobile flow: pick the month in the modal picker, enter a whole month
 * through the calendar + day card, and check that the day cards and month
 * summary show the golden results. Detailed breakdowns are covered on desktop
 * and in the Vitest integration test. Android only (see playwright.config.ts).
 */

const SCENARIO = "august-2026";
const { input, expected } = loadMonthScenario(SCENARIO);

const STATUS_LABELS = { sick: "מחלה", vacation: "חופש" } as const;

const fillTimeGroup = async (group: Locator, time: string) => {
  const [hours, minutes] = time.split(":");
  const spinbuttons = group.getByRole("spinbutton");
  await spinbuttons.nth(0).fill(hours);
  await spinbuttons.nth(1).fill(minutes);
  await spinbuttons.nth(1).press("Tab");
};

const openDay = async (page: Page, date: string) => {
  await page.getByTestId(`mobile-calendar-day-${date}`).click();
  const dayCard = page.getByTestId(`work-day-card-${date}`);
  await expect(dayCard).toBeVisible();
  return dayCard;
};

test(`fills and calculates the ${SCENARIO} work table on mobile (he)`, async ({ page }) => {
  await prepareApp(page, { holidays: input.holidays });
  await page.goto("he/daily");

  await selectMonthInDialog(page, input.year, input.month);

  const standardHoursInput = page.locator('input[name="standardHours"]');
  const baseRateInput = page.locator('input[name="baseRate"]');
  await standardHoursInput.fill(String(input.standardHours));
  await standardHoursInput.press("Tab");
  await baseRateInput.fill(String(input.baseRate));
  await baseRateInput.press("Tab");

  for (const { date, status } of input.statuses) {
    if (status === "normal") continue;
    const dayCard = await openDay(page, date);
    const checkbox = dayCard.getByRole("checkbox", { name: STATUS_LABELS[status] });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }

  for (const shift of input.shifts) {
    const dayCard = await openDay(page, shift.date);
    await dayCard.getByTestId(`work-day-add-shift-${shift.date}`).click();

    const startTime = formatTime(shift.start_time, input.timeZone);
    const endTime = formatTime(shift.end_time, input.timeZone);
    await fillTimeGroup(dayCard.getByRole("group", { name: "כניסה" }).last(), startTime);
    await fillTimeGroup(dayCard.getByRole("group", { name: "יציאה" }).last(), endTime);

    if (isCrossDay(shift)) {
      const crossDayToggle = dayCard
        .getByTestId("shift-cross-day-toggle")
        .last()
        .getByRole("checkbox");
      await crossDayToggle.check();
      await expect(crossDayToggle).toBeChecked();
    }

    if (shift.is_duty) {
      await dayCard.getByTestId("shift-duty-toggle").last().click();
    }

    await expect(
      dayCard.getByTestId("mobile-shift-start-time").last().locator("input"),
    ).toHaveValue(startTime);
    await expect(
      dayCard.getByTestId("mobile-shift-end-time").last().locator("input"),
    ).toHaveValue(endTime);
  }

  for (const [date, { breakdown, salary }] of Object.entries(expected.daily)) {
    const dayCard = await openDay(page, date);
    const prefix = `work-day-${date}`;
    await expect(dayCard.getByTestId(`${prefix}-actual-hours`)).toHaveText(
      formatHours(breakdown.actualHours),
    );
    await expect(dayCard.getByTestId(`${prefix}-total-hours`)).toHaveText(
      formatHours(breakdown.totalHours),
    );
    await expect(dayCard.getByTestId(`${prefix}-regular-hours`)).toHaveText(
      formatHours(breakdown.regular.hours100.hours),
    );
    await expect(dayCard.getByTestId(`${prefix}-extra-hours`)).toHaveText(
      formatHours(breakdown.regular.hours125.hours + breakdown.regular.hours150.hours),
    );
    await expect(dayCard.getByTestId(`${prefix}-salary`)).toHaveText(formatTileSalary(salary));
  }

  const monthly = expected.monthly.breakdown;
  await expect(page.getByTestId("work-table-month-total-actual-hours")).toHaveText(
    formatHours(monthly.actualHours),
  );
  await expect(page.getByTestId("work-table-month-total-total-hours")).toHaveText(
    formatHours(monthly.totalHours),
  );
  await expect(page.getByTestId("work-table-month-total-regular-hours")).toHaveText(
    formatHours(monthly.regular.hours100.hours),
  );
  await expect(page.getByTestId("work-table-month-total-extra-hours")).toHaveText(
    formatHours(monthly.regular.hours125.hours + monthly.regular.hours150.hours),
  );
  await expect(page.getByTestId("work-table-month-total-salary")).toHaveText(
    formatTileSalary(expected.monthly.salary),
  );
  await expect(page.getByTestId("monthly-salary-total")).toHaveText(
    formatTableSalary(expected.monthly.salary),
  );
});
