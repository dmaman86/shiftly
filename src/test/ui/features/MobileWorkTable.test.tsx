import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { format } from "date-fns";

import type { DomainContextType } from "@/app";
import { WorkDayType } from "@/constants";
import type { WorkDayInfo } from "@/domain";
import { MobileWorkTable } from "@/features/work-table/components/month/MobileWorkTable";
import { fireEvent, renderWithTheme, screen } from "@/test/ui/utils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("@/hooks", () => ({
  useGlobalState: () => ({
    year: 2026,
    month: 9,
    updateYear: vi.fn(),
    updateMonth: vi.fn(),
  }),
}));

// Real StaticDatePicker requires driving MUI's own calendar grid, which is
// unrelated to what this test verifies. Stand in a button per work day so the
// test can trigger `onChange` directly, the same way selecting a date would.
vi.mock("@mui/x-date-pickers/StaticDatePicker", () => ({
  StaticDatePicker: ({ onChange }: { onChange: (date: Date) => void }) => (
    <div>
      {["2026-09-15", "2026-09-16"].map((dateKey) => (
        <button key={dateKey} onClick={() => onChange(new Date(`${dateKey}T00:00:00`))}>
          select {dateKey}
        </button>
      ))}
    </div>
  ),
}));

// Regression guard for the data-loss bug: MobileWorkTable used to render a
// single DayCard instance and swap its `workDay` prop as the user picked a
// different date, without a `key`. React then reused the same DayCard
// instance across unrelated days, so the previous day's just-saved shifts
// looked "removed" to the new
// day and got deleted from Supabase. An effect with an empty dependency
// array only runs once per real mount (its closure keeps the date the
// instance was first created with), so it only records a second entry when
// React actually tears down and recreates the component - which requires
// `key` to change.
const mountedDates: string[] = [];

vi.mock("@/features/work-table/components/day/DayCard", () => ({
  DayCard: ({ workDay }: { workDay: WorkDayInfo }) => {
    useEffect(() => {
      mountedDates.push(workDay.meta.date);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="day-card">{workDay.meta.date}</div>;
  },
}));

const domainStub = {
  services: {
    dateService: {
      createDateWithTime: (dateKey: string) => new Date(`${dateKey}T00:00:00`),
      formatDate: (date: Date) => format(date, "yyyy-MM-dd"),
    },
  },
  resolvers: {
    monthResolver: {
      getCurrentYear: () => 2026,
      getAvailableMonths: () => [8],
      resolveDefaultMonth: () => 9,
    },
  },
} as unknown as DomainContextType;

const workDays: WorkDayInfo[] = [
  { meta: { date: "2026-09-15", typeDay: WorkDayType.Regular, crossDayContinuation: false } },
  { meta: { date: "2026-09-16", typeDay: WorkDayType.Regular, crossDayContinuation: false } },
];

describe("MobileWorkTable", () => {
  it("remounts DayCard when the selected day changes", () => {
    mountedDates.length = 0;

    renderWithTheme(
      <MobileWorkTable
        domain={domainStub}
        workDays={workDays}
        currentDate="2026-09-15"
        shabbatCreditHoursByDate={{}}
      />,
    );

    expect(screen.getByTestId("day-card")).toHaveTextContent("2026-09-15");
    expect(mountedDates).toEqual(["2026-09-15"]);

    fireEvent.click(screen.getByRole("button", { name: "select 2026-09-16" }));

    expect(screen.getByTestId("day-card")).toHaveTextContent("2026-09-16");
    expect(mountedDates).toEqual(["2026-09-15", "2026-09-16"]);
  });
});
