import { afterAll, beforeAll, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { PayBreakdownViewModel } from "@/domain";
import { DayDetails } from "@/features/work-table/components/DayDetails";
import { renderWithTheme, screen } from "@/test/ui/utils";

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

describe("DayDetails", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("renders the complete day breakdown in an accessible region", () => {
    renderWithTheme(
      <DayDetails breakdown={breakdown} id="day-details" showShabbatCreditUsed />,
    );

    expect(
      screen.getByRole("region", { name: "Day pay breakdown" }),
    ).toHaveAttribute("id", "day-details");
    expect(
      screen.getByRole("columnheader", { name: "OT" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Shabbat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Meal Allow." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Per Diem" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shabbat Credit")).toBeInTheDocument();
    expect(screen.getByText("Hours used")).toBeInTheDocument();
    expect(screen.getByText("5.00")).toBeInTheDocument();
    expect(screen.getByText("0.75")).toBeInTheDocument();
    expect(screen.getByText("9.00")).toBeInTheDocument();
  });

  it("keeps the Shabbat table to just the rate tiers when credit usage isn't shown", () => {
    renderWithTheme(<DayDetails breakdown={breakdown} id="day-details-no-credit" />);

    expect(
      screen.getByRole("columnheader", { name: "Shabbat" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hours used")).not.toBeInTheDocument();
  });

  it("hides absence details for special full days", () => {
    renderWithTheme(
      <DayDetails
        breakdown={breakdown}
        id="special-day-details"
        showAbsence={false}
      />,
    );

    expect(
      screen.queryByRole("columnheader", { name: "Absence" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Meal Allow." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Per Diem" }),
    ).toBeInTheDocument();
  });
});
