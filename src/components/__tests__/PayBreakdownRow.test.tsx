import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PayBreakdownRow } from "../PayBreakdownRow";
import { WorkDayPayMap } from "@/domain";
import { TableFooter, TableRow } from "@mui/material";

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
    <table>
      <tbody>
        <tr>
          <PayBreakdownRow breakdown={mockBreakdown} {...overrides} />
        </tr>
      </tbody>
    </table>,
  );
};

describe("PayBreakdownRow", () => {
  it("renders correct values from breakdown", () => {
    setup();

    expect(screen.getByText("14.00")).toBeInTheDocument(); // Total hours
    expect(screen.getByText("5.00")).toBeInTheDocument(); // 100% hours
  });

  it("renders empty cells when breakdown is null", () => {
    setup({ breakdown: null });

    expect(screen.getAllByRole("cell").length).toBeGreaterThan(0);
  });

  it("shows salary cell only if baseRate > 0", () => {
    setup({ baseRate: 50 });

    expect(screen.getByText(/₪785/)).toBeInTheDocument(); // Total salary
  });

  it("does not show salary cell if baseRate is 0", () => {
    setup({ baseRate: 0 });

    expect(screen.queryByText(/₪/)).not.toBeInTheDocument(); // No salary cell
  });

  it("renders inside TableFooter if isFooter is true", () => {
    render(
      <table>
        <TableFooter>
          <TableRow data-testid="footer-row">
            <PayBreakdownRow breakdown={mockBreakdown} isFooter />
          </TableRow>
        </TableFooter>
      </table>,
    );

    const footerRow = screen.getByTestId("footer-row");
    expect(footerRow).toBeInTheDocument();
    expect(screen.getByText("14.00")).toBeInTheDocument();
  });

  it("renders empty start cells if emptyStartCells > 0", () => {
    setup({ emptyStartCells: 3 });

    const cells = screen.getAllByRole("cell");
    expect(cells[0].textContent).toBe(""); // First cell should be empty
    expect(cells[1].textContent).toBe(""); // Second cell should be empty
    expect(cells[2].textContent).toBe(""); // Third cell should be empty
  });

  it("matches snapshot", () => {
    const { container } = setup({ baseRate: 50 });

    expect(container).toMatchSnapshot();
  });
});
