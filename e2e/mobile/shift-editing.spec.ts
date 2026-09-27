import { expect, test, type Locator } from "@playwright/test";

import { prepareApp } from "../support/app";

/**
 * Editing a single day on the mobile day card: add, edit, delete, and the
 * status toggle that clears shifts. Uses the frozen "today", a regular weekday
 * with no mocked holidays, so the expected hours follow directly from the
 * standard-hours threshold.
 */

// Calendar date of FIXED_NOW; the mobile table opens on it by default.
const TODAY = "2026-09-15";
const STANDARD_HOURS = "8";

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
  await page.goto("he/daily");

  const standardHoursInput = page.locator('input[name="standardHours"]');
  await standardHoursInput.fill(STANDARD_HOURS);
  await standardHoursInput.press("Tab");
});

const fillTime = async (group: Locator, time: string) => {
  const [hours, minutes] = time.split(":");
  const spinbuttons = group.getByRole("spinbutton");
  await spinbuttons.nth(0).fill(hours);
  await spinbuttons.nth(1).fill(minutes);
  await spinbuttons.nth(1).press("Tab");
};

test("adds, edits and deletes a shift on the day card", async ({ page }) => {
  const dayCard = page.getByTestId(`work-day-card-${TODAY}`);
  await expect(dayCard).toBeVisible();

  const shiftCards = dayCard.getByTestId(/^work-day-shift-card-/);
  const actualHours = dayCard.getByTestId(`work-day-${TODAY}-actual-hours`);
  const regularHours = dayCard.getByTestId(`work-day-${TODAY}-regular-hours`);
  const extraHours = dayCard.getByTestId(`work-day-${TODAY}-extra-hours`);

  await dayCard.getByTestId(`work-day-add-shift-${TODAY}`).click();
  await expect(shiftCards).toHaveCount(1);
  await fillTime(dayCard.getByRole("group", { name: "כניסה" }), "08:00");
  await fillTime(dayCard.getByRole("group", { name: "יציאה" }), "16:00");

  await expect(actualHours).toHaveText("8.00");
  await expect(regularHours).toHaveText("8.00");
  await expect(extraHours).toHaveText("");

  await fillTime(dayCard.getByRole("group", { name: "יציאה" }), "18:00");
  await expect(actualHours).toHaveText("10.00");
  await expect(regularHours).toHaveText("8.00");
  await expect(extraHours).toHaveText("2.00");

  // Selecting another day and coming back must keep the edited shift.
  await page.getByTestId("mobile-calendar-day-2026-09-14").click();
  await expect(page.getByTestId("work-day-card-2026-09-14")).toBeVisible();
  await page.getByTestId(`mobile-calendar-day-${TODAY}`).click();
  await expect(actualHours).toHaveText("10.00");

  await shiftCards.getByRole("button", { name: "מחק" }).click();
  await expect(shiftCards).toHaveCount(0);
  await expect(actualHours).toHaveText("");
});

test("marking a day as sick clears its shifts and locks editing", async ({ page }) => {
  const dayCard = page.getByTestId(`work-day-card-${TODAY}`);
  const addShift = dayCard.getByTestId(`work-day-add-shift-${TODAY}`);

  await addShift.click();
  await fillTime(dayCard.getByRole("group", { name: "כניסה" }), "08:00");
  await fillTime(dayCard.getByRole("group", { name: "יציאה" }), "12:00");
  await expect(dayCard.getByTestId(`work-day-${TODAY}-actual-hours`)).toHaveText("4.00");

  const sick = dayCard.getByRole("checkbox", { name: "מחלה" });
  await sick.check();

  await expect(sick).toBeChecked();
  await expect(dayCard.getByTestId(/^work-day-shift-card-/)).toHaveCount(0);
  await expect(addShift).toBeHidden();
  await expect(dayCard.getByTestId(`work-day-${TODAY}-actual-hours`)).toHaveText("");

  await sick.uncheck();
  await expect(addShift).toBeVisible();
});
