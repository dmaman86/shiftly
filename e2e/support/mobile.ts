import { expect, type Page } from "@playwright/test";

/**
 * Picks a month through the modal date picker that touch devices get, and
 * waits for the Hebrew work table heading of that month.
 */
export const selectMonthInDialog = async (page: Page, year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  const longLabel = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(date);
  const shortLabel = new Intl.DateTimeFormat("he-IL", { month: "short" }).format(date);

  await page.getByRole("button", { name: /בחירת תאריך|בחר תאריך/i }).click();
  const datePickerDialog = page.getByRole("dialog");
  await datePickerDialog.getByText(shortLabel, { exact: true }).click();
  await datePickerDialog.getByRole("button", { name: "אישור" }).click();

  await expect(datePickerDialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: `שעות חודש ${longLabel} ${year}` }),
  ).toBeVisible();
};
