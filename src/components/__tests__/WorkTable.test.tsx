import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkTable } from "../WorkTable";
import { WorkDayPayMap } from "@/domain";

vi.mock("../WorkDayRow", () => ({
  WorkDayRow: () => <tr data-testid="WorkDayRow" />,
}));
vi.mock("../PayBreakdownRow", () => ({
  PayBreakdownRow: () => (
    <tfoot>
      <tr data-testid="PayBreakdownRow" />
    </tfoot>
  ),
}));
vi.mock("@/utils/dateUtils", () => ({
  DateUtils: { getMonth: (month: number) => `חודש ${month}` },
}));

type ConfigValues = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
};

type WorkMonthTableProps = {
  values: ConfigValues;
  eventMap: Record<string, string[]>;
  globalBreakdown: WorkDayPayMap;
  addToGlobalBreakdown: (breakdown: WorkDayPayMap) => void;
  subtractFromGlobalBreakdown: (breakdown: WorkDayPayMap) => void;
};

const baseProps: WorkMonthTableProps = {
  values: {
    year: 2025,
    month: 6,
    baseRate: 50,
    standardHours: 6.67,
  },
  eventMap: {},
  globalBreakdown: {
    baseRate: 50,
    totalHours: 0,
    getTotalPay: () => 0,
    regular: {
      hours100: { hours: 0, percent: 1, rate: 0, total: 0 },
      hours125: { hours: 0, percent: 1.25, rate: 0, total: 0 },
      hours150: { hours: 0, percent: 1.5, rate: 0, total: 0 },
    },
    extra: {
      hours20: { hours: 0, percent: 0.2, rate: 0, total: 0 },
      hours50: { hours: 0, percent: 0.5, rate: 0, total: 0 },
    },
    special: {
      shabbat150: { hours: 0, percent: 1.5, rate: 0, total: 0 },
      shabbat200: { hours: 0, percent: 2, rate: 0, total: 0 },
    },
    hours100Sick: { hours: 0, percent: 1, rate: 0, total: 0 },
    hours100Vacation: { hours: 0, percent: 1, rate: 0, total: 0 },
    extra100Shabbat: { hours: 0, percent: 1, rate: 0, total: 0 },
  },
  addToGlobalBreakdown: vi.fn(),
  subtractFromGlobalBreakdown: vi.fn(),
};

const setup = (partial: Partial<WorkMonthTableProps> = {}) => {
  const props = Object.assign({}, baseProps, partial, {
    values: { ...baseProps.values, ...partial.values },
    globalBreakdown: {
      ...baseProps.globalBreakdown,
      ...partial.globalBreakdown,
    },
  });

  return render(<WorkTable {...props} />);
};
describe("WorkTable", () => {
  it("renders then title with month and year", () => {
    setup();

    expect(screen.getByText("שעות חודש יוני - 2025")).toBeInTheDocument();
  });

  it("renders PayBreakdownRow", () => {
    setup();
    expect(screen.getByTestId("PayBreakdownRow")).toBeInTheDocument();
  });

  it("renders the שכר יומי column if baseRate > 0", () => {
    setup();
    expect(screen.getByText("שכר יומי")).toBeInTheDocument();
  });

  it("does not render שכר יומי column if baseRate = 0", () => {
    const copy = { ...baseProps };
    copy.globalBreakdown.baseRate = 0;
    setup({
      values: { year: 2025, month: 6, standardHours: 6.67, baseRate: 0 },
      globalBreakdown: copy.globalBreakdown,
    });
    expect(screen.queryByText("שכר יומי")).not.toBeInTheDocument();
  });

  it("renders WorkDayRow for each work day", () => {
    vi.mock("@/hooks/useWorkDays", () => ({
      useWorkDays: () => ({
        workDays: [
          {
            meta: {
              date: "2025-06-01",
              typeDay: "Regular",
              crossDayContinuation: false,
            },
            hebrewDay: "א",
          },
          {
            meta: {
              date: "2025-06-02",
              typeDay: "Regular",
              crossDayContinuation: false,
            },
            hebrewDay: "ב",
          },
        ],
      }),
    }));

    setup();

    expect(screen.getAllByTestId("WorkDayRow")).toHaveLength(2);
  });
});
