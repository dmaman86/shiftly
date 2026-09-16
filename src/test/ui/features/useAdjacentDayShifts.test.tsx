import { useContext, useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { DomainContextType } from "@/app";
import { WorkDayStatus } from "@/constants";
import type { Shift } from "@/domain";
import { WorkTableDayStateProvider } from "@/features/work-table/context/workTableDayState/WorkTableDayStateProvider";
import { WorkTableDayStateContext } from "@/features/work-table/context/workTableDayState/workTableDayStateContext";
import { useAdjacentDayShifts } from "@/features/work-table/hooks/useAdjacentDayShifts";

const domainStub = {
  services: {
    dateService: {
      createDateWithTime: (dateKey: string) => new Date(`${dateKey}T00:00:00`),
      addDaysToDate: (date: Date, days: number) => {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
      },
      formatDate: (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      },
    },
  },
} as unknown as DomainContextType;

const makeShift = (id: string, startIso: string, endIso: string): Shift => ({
  id,
  start: { date: new Date(startIso) },
  end: { date: new Date(endIso) },
  isDuty: false,
});

const Probe = ({ dateKey }: { dateKey: string }) => {
  const shifts = useAdjacentDayShifts({ domain: domainStub, dateKey });
  return <div data-testid="result">{JSON.stringify(shifts.map((s) => s.id).sort())}</div>;
};

describe("useAdjacentDayShifts", () => {
  it("collects shifts from the previous and next day, excluding the current day", () => {
    const prevShift = makeShift("prev-1", "2026-09-14T22:00:00", "2026-09-15T06:00:00");
    const sameDayShift = makeShift("same-1", "2026-09-15T09:00:00", "2026-09-15T17:00:00");
    const nextShift = makeShift("next-1", "2026-09-16T05:00:00", "2026-09-16T13:00:00");

    const Harness = () => {
      const context = useContext(WorkTableDayStateContext);
      useEffect(() => {
        context?.dispatch({
          type: "hydrate",
          state: {
            "2026-09-14": {
              status: WorkDayStatus.normal,
              shiftEntries: { [prevShift.id]: { shift: prevShift, payMap: null } },
            },
            "2026-09-15": {
              status: WorkDayStatus.normal,
              shiftEntries: { [sameDayShift.id]: { shift: sameDayShift, payMap: null } },
            },
            "2026-09-16": {
              status: WorkDayStatus.normal,
              shiftEntries: { [nextShift.id]: { shift: nextShift, payMap: null } },
            },
          },
        });
        // Seed state once on mount; the dispatch is stable across renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <Probe dateKey="2026-09-15" />;
    };

    render(
      <WorkTableDayStateProvider>
        <Harness />
      </WorkTableDayStateProvider>,
    );

    const ids = JSON.parse(screen.getByTestId("result").textContent ?? "[]");
    expect(ids).toEqual(["next-1", "prev-1"]);
  });

  it("returns an empty list when neighboring days have no shifts", () => {
    render(
      <WorkTableDayStateProvider>
        <Probe dateKey="2026-09-15" />
      </WorkTableDayStateProvider>,
    );

    expect(screen.getByTestId("result")).toHaveTextContent("[]");
  });
});
