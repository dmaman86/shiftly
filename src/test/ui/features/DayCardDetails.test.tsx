import { afterAll, beforeAll, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { PayBreakdownViewModel } from "@/domain";
import { DayCardDetails } from "@/features/work-table/components/cards/DayCardDetails";
import { renderWithTheme, screen, userEvent } from "@/test/ui/utils";

const breakdown: PayBreakdownViewModel = {
  totalHours: 12,
  actualHours: 10,
  regular: {
    hours100: { hours: 6, percent: 1 },
    hours125: { hours: 2, percent: 1.25 },
    hours150: { hours: 1, percent: 1.5 },
  },
  extra: {
    hours20: { hours: 0.5, percent: 0.2 },
    hours50: { hours: 0.75, percent: 0.5 },
  },
  special: {
    shabbat150: { hours: 1.5, percent: 1.5 },
    shabbat200: { hours: 0.25, percent: 2 },
  },
  hours100Sick: { hours: 3, percent: 1 },
  hours100Vacation: { hours: 4, percent: 1 },
  appliedShabbatCredit: { hours: 5, percent: 1 },
  perDiemPoints: 7,
  perDiemAmount: 0,
  largePoints: 8,
  largeAmount: 0,
  smallPoints: 9,
  smallAmount: 0,
};

describe("DayCardDetails", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("renders each breakdown group as its own, independently collapsible section", async () => {
    renderWithTheme(<DayCardDetails breakdown={breakdown} />);

    const overtimeToggle = screen.getByRole("button", { name: "OT" });
    const shabbatToggle = screen.getByRole("button", { name: "Shabbat" });

    expect(overtimeToggle).toHaveAttribute("aria-expanded", "false");
    expect(shabbatToggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(overtimeToggle);

    expect(overtimeToggle).toHaveAttribute("aria-expanded", "true");
    expect(shabbatToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("hides the absence group for special full days", () => {
    renderWithTheme(<DayCardDetails breakdown={breakdown} showAbsence={false} />);

    expect(
      screen.queryByRole("button", { name: "Absence" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Meal Allow. / Per Diem" }),
    ).toBeInTheDocument();
  });
});
