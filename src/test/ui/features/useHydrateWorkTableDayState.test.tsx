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
import { WorkTableDayStateProvider } from "@/features/work-table/context/workTableDayState/WorkTableDayStateProvider";
import { useWorkTableDayState } from "@/features/work-table/hooks/useWorkTableDayState";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

const renderPure = (ui: ReactElement) => {
  const client = new QueryClient();
  return render(ui, { wrapper: ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider> });
};

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

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
  const { status, shiftEntries, setStatus } = useWorkTableDayState(dateKey);
  return <>
    <span>{`${dateKey}:${status}:${Object.keys(shiftEntries).length}`}</span>
    <button onClick={() => setStatus(WorkDayStatus.vacation)}>Edit day</button>
  </>;
};

const SessionHarness = () => (
  <WorkTableDayStateProvider ownerKey={authMock.user?.id ?? "guest"}>
    <WorkTableDayStateHydrator domain={domainStub} workDays={workDays}>
      <DayProbe dateKey="2026-08-10" />
    </WorkTableDayStateHydrator>
  </WorkTableDayStateProvider>
);

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
    expect(await screen.findByText("2026-08-10:sick:1")).toBeInTheDocument();
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

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledTimes(1);

    globalStateMock.standardHours = 7.5;
    rerender(<Harness />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledTimes(1);
  });

  it("blocks editing while loading and ignores refreshes of the same user", async () => {
    authMock.user = { id: "user-1" };
    let resolveDays!: (value: { data: [] }) => void;
    workDayServiceMock.fetchForMonth.mockReturnValue({ call: () => new Promise((resolve) => { resolveDays = resolve; }) });
    shiftServiceMock.fetchForMonth.mockReturnValue({ call: async () => ({ data: [] }) });
    const { rerender } = renderPure(<SessionHarness />);
    expect(screen.queryByRole("button", { name: "Edit day" })).not.toBeInTheDocument();
    await act(async () => { resolveDays({ data: [] }); });
    fireEvent.click(await screen.findByRole("button", { name: "Edit day" }));
    authMock.user = { id: "user-1" };
    globalStateMock.standardHours = 7.5;
    rerender(<SessionHarness />);
    expect(screen.getByText("2026-08-10:vacation:0")).toBeInTheDocument();
    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledOnce();
  });

  it("offers a retry after loading fails and enables editing after recovery", async () => {
    authMock.user = { id: "user-1" };
    workDayServiceMock.fetchForMonth.mockReturnValueOnce({ call: async () => ({ error: "Request failed" }) })
      .mockReturnValue({ call: async () => ({ data: [] }) });
    shiftServiceMock.fetchForMonth.mockReturnValue({ call: async () => ({ data: [] }) });
    renderPure(<SessionHarness />);
    expect(await screen.findByRole("alert")).toHaveTextContent("storage.load_error");
    expect(screen.queryByRole("button", { name: "Edit day" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "storage.retry" }));
    expect(await screen.findByRole("button", { name: "Edit day" })).toBeInTheDocument();
    expect(workDayServiceMock.fetchForMonth).toHaveBeenCalledTimes(2);
  });

  it("clears account state on logout and reloads for a different account", async () => {
    authMock.user = { id: "user-1" };
    workDayServiceMock.fetchForMonth.mockImplementation((userId: string) => ({ call: async () => ({
      data: userId === "user-1" ? [{ date: "2026-08-10", status: WorkDayStatus.sick }] : [],
    }) }));
    shiftServiceMock.fetchForMonth.mockReturnValue({ call: async () => ({ data: [] }) });
    const { rerender } = renderPure(<SessionHarness />);
    expect(await screen.findByText("2026-08-10:sick:0")).toBeInTheDocument();
    authMock.user = null;
    rerender(<SessionHarness />);
    expect(screen.getByText("2026-08-10:normal:0")).toBeInTheDocument();
    authMock.user = { id: "user-2" };
    rerender(<SessionHarness />);
    expect(screen.queryByRole("button", { name: "Edit day" })).not.toBeInTheDocument();
    expect(await screen.findByText("2026-08-10:normal:0")).toBeInTheDocument();
    expect(workDayServiceMock.fetchForMonth).toHaveBeenLastCalledWith("user-2", "2026-08-01", "2026-09-01");
  });

  it("ignores an old account response that completes after switching accounts", async () => {
    authMock.user = { id: "user-1" };
    let resolveOld!: (value: { data: { date: string; status: WorkDayStatus }[] }) => void;
    workDayServiceMock.fetchForMonth.mockReturnValueOnce({ call: () => new Promise((resolve) => { resolveOld = resolve; }) })
      .mockReturnValue({ call: async () => ({ data: [] }) });
    shiftServiceMock.fetchForMonth.mockReturnValue({ call: async () => ({ data: [] }) });
    const { rerender } = renderPure(<SessionHarness />);
    authMock.user = { id: "user-2" };
    rerender(<SessionHarness />);
    expect(await screen.findByText("2026-08-10:normal:0")).toBeInTheDocument();
    await act(async () => { resolveOld({ data: [{ date: "2026-08-10", status: WorkDayStatus.sick }] }); });
    expect(screen.getByText("2026-08-10:normal:0")).toBeInTheDocument();
  });
});
