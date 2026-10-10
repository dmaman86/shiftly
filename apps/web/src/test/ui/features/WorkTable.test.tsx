import { describe, expect, it, vi } from "vitest";
import type { ShabbatCreditAllocation } from "@shiftly/domain";
import { WorkDayType } from "@shiftly/domain";

import type { DomainContextType } from "@/app";
import type { CompactPayBreakdownVM, WorkDayInfo } from "@/app/types";
import { WorkTable } from "@/features/work-table/components/month/WorkTable";
import { renderWithTheme, screen, within } from "@/test/ui/utils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? [] : key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("@/hooks", () => ({
  useGlobalState: () => ({
    year: 2026,
    month: 9,
    baseRate: 50,
    standardHours: 8,
    reset: vi.fn(),
  }),
  useAuth: () => ({ user: null, isLoading: false, initializationError: null }),
  useAppSnackbar: () => ({ error: vi.fn(), success: vi.fn() }),
  useDeviceType: () => ({ isMobile: false }),
}));

vi.mock("@/features/auth", () => ({ GuestModeNotice: () => null }));

vi.mock("@/features/work-table/hooks/month/useWorkTableMonthSession", () => ({
  useWorkTableMonthSession: () => ({
    ready: true,
    error: null,
    retry: vi.fn(),
    isFetching: false,
  }),
}));

// Row editing and PDF layout have their own tests; these stand-ins keep this
// suite focused on how WorkTable composes the desktop table around them.
vi.mock("@/features/work-table/components/day/DayRow", () => ({
  DayRow: ({ workDay }: { workDay: WorkDayInfo }) => (
    <tr data-testid="day-row">
      <td>{workDay.meta.date}</td>
    </tr>
  ),
}));

vi.mock("@/features/work-table/components/month/WorkTablePrintView", () => ({
  WorkTablePrintView: () => null,
}));

const domainStub = {
  services: {
    dateService: { formatDate: () => "2026-09-15" },
  },
} as unknown as DomainContextType;

const workDay = (date: string): WorkDayInfo => ({
  meta: { date, typeDay: WorkDayType.Regular, crossDayContinuation: false },
});

const monthBreakdown: CompactPayBreakdownVM = {
  totalHours: 10.5,
  actualHours: 9,
  regularHours: 8,
  extraHours: 2.5,
  dailySalary: 600,
};

const noCredit: ShabbatCreditAllocation = {
  carriedOverHours: 0,
  earnedHours: 0,
  totalAvailableHours: 0,
  usedHours: 0,
  unusedHours: 0,
  appliedHoursByDate: {},
  usageByDate: {},
};

const renderWorkTable = (
  shabbatCreditAllocation: ShabbatCreditAllocation = noCredit,
) =>
  renderWithTheme(
    <WorkTable
      domain={domainStub}
      workDays={[workDay("2026-09-15"), workDay("2026-09-16")]}
      shabbatCreditAllocation={shabbatCreditAllocation}
      monthBreakdown={monthBreakdown}
      monthFullBreakdown={{} as never}
    />,
  );

describe("WorkTable (desktop)", () => {
  it("renders a row per work day and the month total in the footer", () => {
    renderWorkTable();

    expect(screen.getAllByTestId("day-row")).toHaveLength(2);
    const footer = screen.getByTestId("work-table-footer");
    expect(
      within(footer).getByTestId("work-table-month-total-total-hours"),
    ).toHaveTextContent("10.50");
    expect(
      within(footer).getByTestId("work-table-month-total-salary"),
    ).toHaveTextContent("600.00");
  });

  it("hides the Shabbat credit summary when no credit is available", () => {
    renderWorkTable();

    expect(
      screen.queryByText("table.shabbat_credit_summary"),
    ).not.toBeInTheDocument();
  });

  it("shows the Shabbat credit summary with carry-over and unused notes", () => {
    renderWorkTable({
      ...noCredit,
      carriedOverHours: 2,
      earnedHours: 4,
      totalAvailableHours: 6,
      usedHours: 3,
      unusedHours: 3,
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("table.shabbat_credit_summary");
    expect(alert).toHaveTextContent("table.shabbat_credit_carried_over");
    expect(alert).toHaveTextContent("table.shabbat_credit_unused_note");
  });

  it("shows every usage hint", () => {
    renderWorkTable();

    for (const hint of [
      "table.hint_add_shift",
      "table.hint_cross_midnight",
      "table.hint_duty_shift",
      "table.hint_auto_update",
    ]) {
      expect(screen.getByText(hint)).toBeInTheDocument();
    }
  });
});
