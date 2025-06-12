import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { MonthlySalarySummary } from "../MonthlySalarySummary";
import { breakdownService, WorkDayPayMap } from "@/domain";

const mockBreakdown: WorkDayPayMap = {
  regular: {
    hours100: { hours: 5, rate: 50, percent: 1, total: 250 },
    hours125: { hours: 2, rate: 62.5, percent: 1.25, total: 125 },
    hours150: { hours: 1, rate: 75, percent: 1.5, total: 75 },
  },
  extra: {
    hours20: { hours: 1, rate: 10, percent: 0.2, total: 10 },
    hours50: { hours: 2, rate: 25, percent: 0.5, total: 50 },
  },
  special: {
    shabbat150: { hours: 1, rate: 75, percent: 1.5, total: 75 },
    shabbat200: { hours: 1, rate: 100, percent: 2, total: 100 },
  },
  hours100Sick: { hours: 1, rate: 50, percent: 1, total: 50 },
  hours100Vacation: { hours: 1, rate: 50, percent: 1, total: 50 },
  extra100Shabbat: { hours: 0, rate: 0, percent: 1, total: 0 },
  totalHours: 14,
  baseRate: 50,
  getTotalPay: () => {
    return 250 + 125 + 75 + 10 + 50 + 75 + 100 + 50 + 50 + 0;
  },
};

const setup = (overrides = {}) => {
  return render(
    <MonthlySalarySummary globalBreakdown={mockBreakdown} {...overrides} />,
  );
};

describe("MonthlySalarySummary", () => {
  it("renders title and edit icon", () => {
    setup();
    expect(screen.getByText("סיכום שכר חודשי לפי שעות")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calculates the correct monthly salary", () => {
    setup();
    const totalText = screen.getByText(/סה״כ לתשלום/).nextSibling?.textContent;
    expect(totalText).toContain(mockBreakdown.getTotalPay().toString());
  });

  it("toggles edit mode", async () => {
    setup();
    const button = screen.getByRole("button");
    await userEvent.click(button);

    const doneIcon = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector('svg[data-testid="DoneIcon"]'));

    expect(doneIcon).toBeInTheDocument();
  });

  it("allows editing hours and updates total", async () => {
    setup();

    const toggleButton = screen.getByRole("button");
    await userEvent.click(toggleButton);

    const input = screen.getAllByRole("spinbutton")[0];
    await userEvent.clear(input);
    await userEvent.type(input, "10");

    const row = screen.getByText("100%").closest("tr");
    expect(row).not.toBeNull();

    expect(within(row!).getByText("₪500.00")).toBeInTheDocument();
  });

  it("renders empty totals if all hours are zero", () => {
    const emptyBreakdown: WorkDayPayMap = breakdownService().initBreakdown({});
    setup({ globalBreakdown: emptyBreakdown });

    const allTotalCells = screen.getAllByRole("cell");
    const filledTotals = allTotalCells.filter((cell) =>
      /^₪\s*\d/.test(cell.textContent || ""),
    );

    expect(filledTotals).toHaveLength(0);
  });
});
