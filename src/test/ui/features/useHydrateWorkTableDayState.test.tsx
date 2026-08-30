import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ user: null as { id: string } | null }));

const globalStateMock = vi.hoisted(() => ({
  year: 2026,
  month: 8,
  standardHours: 6.67,
}));

const snackbarMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

const workDayServiceMock = vi.hoisted(() => ({ fetchForMonth: vi.fn() }));
const shiftServiceMock = vi.hoisted(() => ({ fetchForMonth: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/useGlobalState", () => ({ useGlobalState: () => globalStateMock }));
vi.mock("@/hooks/useAppSnackbar", () => ({ useAppSnackbar: () => snackbarMock }));
vi.mock("@/services", () => ({
  workDayService: () => workDayServiceMock,
  shiftService: () => shiftServiceMock,
}));

import type { DomainContextType } from "@/app";
import { WorkDayStatus, WorkDayType } from "@/constants";
import type { WorkDayInfo } from "@/domain";
import { WorkTableDayStateHydrator } from "@/features/work-table/components/WorkTableDayStateHydrator";
import { WorkTableDayStateProvider } from "@/features/work-table/components/WorkTableDayStateProvider";
import { useWorkTableDayState } from "@/features/work-table/hooks/useWorkTableDayState";
import { renderPure, screen } from "@/test/ui/utils";

const domainStub = {
  services: {
    dateService: {
      getDatesRange: () => ({ startDate: "2026-08-01", endDate: "2026-09-01" }),
    },
  },
  payMap: {
    shiftMapBuilder: {
      build: vi.fn().mockReturnValue({ totalHours: 8 }),
    },
  },
} as unknown as DomainContextType;

const workDays: WorkDayInfo[] = [
  {
    meta: { date: "2026-08-10", typeDay: WorkDayType.Regular, crossDayContinuation: false },
    hebrewDay: "",
  },
];

const DayProbe = ({ dateKey }: { dateKey: string }) => {
  const { status, shiftEntries } = useWorkTableDayState(dateKey);
  return <span>{`${dateKey}:${status}:${Object.keys(shiftEntries).length}`}</span>;
};

describe("useHydrateWorkTableDayState", () => {
  beforeEach(() => {
    authMock.user = null;
    globalStateMock.standardHours = 6.67;
    workDayServiceMock.fetchForMonth.mockReset();
    shiftServiceMock.fetchForMonth.mockReset();
  });

  it("does nothing in guest mode", async () => {
    renderPure(
      <WorkTableDayStateProvider>
        <WorkTableDayStateHydrator domain={domainStub} workDays={workDays} />
        <DayProbe dateKey="2026-08-10" />
      </WorkTableDayStateProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("2026-08-10:normal:0")).toBeInTheDocument();
    expect(workDayServiceMock.fetchForMonth).not.toHaveBeenCalled();
  });

  it("hydrates persisted status and shifts for an authenticated user", async () => {
    authMock.user = { id: "user-1" };
    workDayServiceMock.fetchForMonth.mockReturnValue({
      call: () =>
        Promise.resolve({ data: [{ date: "2026-08-10", status: WorkDayStatus.sick }] }),
    });
    shiftServiceMock.fetchForMonth.mockReturnValue({
      call: () =>
        Promise.resolve({
          data: [
            {
              id: "shift-1",
              date: "2026-08-10",
              start_time: "2026-08-10T08:00:00.000Z",
              end_time: "2026-08-10T16:00:00.000Z",
              is_duty: false,
            },
          ],
        }),
    });

    renderPure(
      <WorkTableDayStateProvider>
        <WorkTableDayStateHydrator domain={domainStub} workDays={workDays} />
        <DayProbe dateKey="2026-08-10" />
      </WorkTableDayStateProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledWith(
      "user-1",
      "2026-08-01",
      "2026-09-01",
    );
    expect(screen.getByText("2026-08-10:sick:1")).toBeInTheDocument();
  });

  it("does not re-fetch and clobber local edits when standardHours changes after mount", async () => {
    // Regression test: useMonthlyConfigSync hydrates standardHours shortly
    // after mount. That must not re-trigger this hydration and overwrite a
    // status the user just set locally with a stale full-state dispatch.
    authMock.user = { id: "user-1" };
    workDayServiceMock.fetchForMonth.mockReturnValue({
      call: () => Promise.resolve({ data: [] }),
    });
    shiftServiceMock.fetchForMonth.mockReturnValue({
      call: () => Promise.resolve({ data: [] }),
    });

    const Harness = () => (
      <WorkTableDayStateProvider>
        <WorkTableDayStateHydrator domain={domainStub} workDays={workDays} />
        <DayProbe dateKey="2026-08-10" />
      </WorkTableDayStateProvider>
    );

    const { rerender } = renderPure(<Harness />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledTimes(1);

    globalStateMock.standardHours = 7.5;
    rerender(<Harness />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledTimes(1);
  });
});
