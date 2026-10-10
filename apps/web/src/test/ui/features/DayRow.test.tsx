import { beforeEach, describe, expect, it, vi } from "vitest";
import { Table, TableBody } from "@mui/material";
import { WorkDayStatus, WorkDayType } from "@shiftly/domain";
import type { Shift } from "@shiftly/domain";

import type { DomainContextType } from "@/app";
import type { WorkDayInfo } from "@/app/types";
import { headersTable } from "@/app/constants";
import { DayRow } from "@/features/work-table/components/day/DayRow";
import { countTableColumns } from "@/features/work-table/helpers";
import { fireEvent, renderWithTheme, screen, within } from "@/test/ui/utils";

const DATE = "2026-09-15";
const BASE_RATE = 50;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? ["Sun", "Mon", "Tue"] : key,
  }),
}));

const shift = (id: string): { shift: Shift } => ({
  shift: {
    id,
    start: { date: new Date(`${DATE}T08:00:00`) },
    end: { date: new Date(`${DATE}T16:00:00`) },
    isDuty: false,
  } as Shift,
});

const controller = vi.hoisted(() => ({
  status: "normal" as string,
  isEditable: true,
  specialFullDay: false,
  shifts: [] as { shift: Shift }[],
  adjacentShifts: [] as Shift[],
  updateShift: vi.fn(),
  removeShift: vi.fn(),
  handleStatusChanged: vi.fn(),
  handleAddShift: vi.fn(),
  expandedBreakdown: {},
  compactBreakdown: {
    totalHours: 8,
    actualHours: 8,
    regularHours: 8,
    extraHours: 0,
    dailySalary: 400,
  },
  standardHours: 8,
  baseRate: 50,
}));

vi.mock("@/features/work-table/hooks/day/useDayController", () => ({
  useDayController: () => controller,
}));

const shiftRowSpy = vi.hoisted(() => vi.fn());

// ShiftRow renders the same three cells as the real one so column alignment
// stays observable without driving the time pickers.
vi.mock("@/features/work-table/components/shift/ShiftRow", () => ({
  ShiftRow: (props: { shift: Shift; otherShifts: Shift[] }) => {
    shiftRowSpy(props);
    return (
      <>
        <td data-testid="shift-row">{props.shift.id}</td>
        <td />
        <td />
      </>
    );
  },
}));

vi.mock("@/features/work-table/components/day/DayDetails", () => ({
  DayDetails: ({ id }: { id: string }) => (
    <div id={id} data-testid="day-details" />
  ),
}));

const domainStub = {
  services: { dateService: { getWeekday: () => 1 } },
  resolvers: {
    dayInfoResolver: {
      formatWorkDayLabel: (_: WorkDayInfo, weekday: string) => `${weekday} 15`,
    },
  },
} as unknown as DomainContextType;

const workDay = (holidayKey?: string): WorkDayInfo =>
  ({
    meta: {
      date: DATE,
      typeDay: WorkDayType.Regular,
      crossDayContinuation: false,
      ...(holidayKey && { holidayKey }),
    },
  }) as WorkDayInfo;

const renderDayRow = (day: WorkDayInfo = workDay()) =>
  renderWithTheme(
    <Table>
      <TableBody>
        <DayRow domain={domainStub} workDay={day} shabbatCreditHours={0} />
      </TableBody>
    </Table>,
  );

const firstRowCellCount = () =>
  screen.getAllByTestId(`work-day-row-${DATE}`)[0].querySelectorAll("td")
    .length;

describe("DayRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.status = WorkDayStatus.normal;
    controller.isEditable = true;
    controller.specialFullDay = false;
    controller.shifts = [];
  });

  describe("status checkboxes", () => {
    it.each([
      ["sick", WorkDayStatus.sick, "headers.sick — Mon 15"],
      ["vacation", WorkDayStatus.vacation, "headers.vacation — Mon 15"],
    ])("checks %s and reports the new status", (name, status, label) => {
      renderDayRow();

      const checkbox = within(
        screen.getByTestId(`work-day-${name}-${DATE}`),
      ).getByRole("checkbox", { name: label });
      fireEvent.click(checkbox);

      expect(controller.handleStatusChanged).toHaveBeenCalledExactlyOnceWith(
        status,
      );
    });

    it("returns to normal when the active status is unchecked", () => {
      controller.status = WorkDayStatus.vacation;
      renderDayRow();

      const checkbox = screen.getByRole("checkbox", {
        name: "headers.vacation — Mon 15",
      });
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);

      expect(controller.handleStatusChanged).toHaveBeenCalledExactlyOnceWith(
        WorkDayStatus.normal,
      );
    });
  });

  describe("shift rows", () => {
    it("keeps the first row aligned with the table columns without shifts", () => {
      renderDayRow();

      expect(screen.getAllByTestId(`work-day-row-${DATE}`)).toHaveLength(1);
      expect(screen.queryByTestId("shift-row")).not.toBeInTheDocument();
      expect(firstRowCellCount()).toBe(
        countTableColumns(headersTable, "compact", BASE_RATE),
      );
    });

    it("renders a row per shift, excluding each shift from its own overlap set", () => {
      controller.shifts = [shift("a"), shift("b")];
      renderDayRow();

      expect(screen.getAllByTestId(`work-day-row-${DATE}`)).toHaveLength(2);
      expect(firstRowCellCount()).toBe(
        countTableColumns(headersTable, "compact", BASE_RATE),
      );
      const otherIds = shiftRowSpy.mock.calls.map(([props]) =>
        props.otherShifts.map((other: Shift) => other.id),
      );
      expect(otherIds).toEqual([["b"], ["a"]]);
    });

    it("hides the add-shift button when the day is not editable", () => {
      controller.isEditable = false;
      renderDayRow();

      expect(
        screen.queryByTestId(`work-day-add-shift-${DATE}`),
      ).not.toBeInTheDocument();
    });
  });

  it("toggles the details panel with matching accessible state", () => {
    renderDayRow();

    const toggle = screen.getByRole("button", { name: "day_details.show" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", `day-details-${DATE}`);
    expect(screen.queryByTestId("day-details")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "day_details.hide" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("day-details")).toBeInTheDocument();
  });

  it("shows the holiday chip when the day has a holiday", () => {
    renderDayRow(workDay("rosh_hashana"));

    expect(screen.getByText("holidays.rosh_hashana")).toBeInTheDocument();
  });
});
