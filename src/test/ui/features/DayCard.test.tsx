import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DomainContextType } from "@/app";
import { WorkDayStatus, WorkDayType } from "@/constants";
import type { WorkDayInfo } from "@/domain";
import { DayCard } from "@/features/work-table/components/cards/DayCard";
import { renderWithTheme } from "@/test/ui/utils";

const useDayControllerMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/work-table", () => ({
  useDayController: useDayControllerMock,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === "days"
        ? [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ]
        : key,
  }),
}));

const domainStub = {
  services: {
    dateService: {
      getWeekday: () => 3,
    },
  },
  resolvers: {
    dayInfoResolver: {
      formatWorkDayLabel: () => "Wednesday 9",
    },
  },
} as unknown as DomainContextType;

const workDay: WorkDayInfo = {
  meta: {
    date: "2026-09-09",
    typeDay: WorkDayType.Regular,
    crossDayContinuation: false,
  },
};

describe("DayCard", () => {
  const scrollIntoViewMock = vi.fn();

  beforeEach(() => {
    scrollIntoViewMock.mockClear();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
    useDayControllerMock.mockReturnValue({
      status: WorkDayStatus.normal,
      isEditable: true,
      specialFullDay: false,
      shifts: [],
      updateShift: vi.fn(),
      removeShift: vi.fn(),
      handleStatusChanged: vi.fn(),
      handleAddShift: vi.fn(),
      expandedBreakdown: {},
      compactBreakdown: {
        actualHours: 0,
        totalHours: 0,
        regularHours: 0,
        extraHours: 0,
      },
      standardHours: 8,
    });
  });

  it("scrolls the current day card into view when it mounts", () => {
    const { container } = renderWithTheme(
      <DayCard
        domain={domainStub}
        workDay={workDay}
        isCurrentDay
        shabbatCreditHours={0}
      />,
    );

    expect(container.querySelector('[aria-current="date"]')).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledOnce();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("does not scroll a card that is not the current day", () => {
    const { container } = renderWithTheme(
      <DayCard
        domain={domainStub}
        workDay={workDay}
        shabbatCreditHours={0}
      />,
    );

    expect(container.querySelector('[aria-current="date"]')).not.toBeInTheDocument();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
