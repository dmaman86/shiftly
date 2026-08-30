import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ user: null as { id: string } | null }));

const globalStateMock = vi.hoisted(() => ({
  year: 2026,
  month: 9,
  standardHours: 8,
}));

const snackbarMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

const domainMock = vi.hoisted(() => ({
  services: {
    dateService: {
      getPreviousMonth: (year: number, month: number) =>
        month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
    },
  },
}));

const monthlyConfigServiceMock = vi.hoisted(() => ({
  fetch: vi.fn(),
  setUnusedShabbatCreditHours: vi.fn(),
}));

const reduxStateMock = vi.hoisted(() => ({
  workDays: { workDays: [] as unknown[] },
  global: {
    dailyPayMaps: {} as Record<string, unknown>,
    config: { standardHours: 8 },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/useGlobalState", () => ({ useGlobalState: () => globalStateMock }));
vi.mock("@/hooks/useAppSnackbar", () => ({ useAppSnackbar: () => snackbarMock }));
vi.mock("@/hooks/useDomain", () => ({ useDomain: () => domainMock }));
vi.mock("@/services", () => ({ monthlyConfigService: () => monthlyConfigServiceMock }));
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: typeof reduxStateMock) => unknown) =>
    selector(reduxStateMock),
}));

import { useShabbatCreditAllocation } from "@/features/salary-summary/hooks/useShabbatCreditAllocation";

describe("useShabbatCreditAllocation", () => {
  beforeEach(() => {
    authMock.user = null;
    globalStateMock.year = 2026;
    globalStateMock.month = 9;
    reduxStateMock.workDays.workDays = [];
    reduxStateMock.global.dailyPayMaps = {};
    snackbarMock.error.mockReset();
    monthlyConfigServiceMock.fetch.mockReset();
    monthlyConfigServiceMock.setUnusedShabbatCreditHours
      .mockReset()
      .mockReturnValue({ call: () => Promise.resolve({ data: null }) });
  });

  it("carries no hours in guest mode", async () => {
    const { result } = renderHook(() => useShabbatCreditAllocation());
    await act(async () => {
      await Promise.resolve();
    });

    expect(monthlyConfigServiceMock.fetch).not.toHaveBeenCalled();
    expect(result.current.carriedOverHours).toBe(0);
  });

  it("fetches last month's unused balance and folds it into the total available hours", async () => {
    authMock.user = { id: "user-1" };
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () =>
        Promise.resolve({
          data: {
            year: 2026,
            month: 8,
            standard_hours: 8,
            base_rate: 0,
            unused_shabbat_credit_hours: 3.5,
          },
        }),
    });

    const { result } = renderHook(() => useShabbatCreditAllocation());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(monthlyConfigServiceMock.fetch).toHaveBeenCalledWith("user-1", 2026, 8);
    expect(result.current.carriedOverHours).toBe(3.5);
    expect(result.current.totalAvailableHours).toBe(3.5);
  });

  it("does not write back before the carry-over fetch has resolved", async () => {
    authMock.user = { id: "user-1" };
    let resolveFetch: (value: { data: null }) => void = () => {};
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () => new Promise((resolve) => (resolveFetch = resolve)),
    });

    renderHook(() => useShabbatCreditAllocation());

    await act(async () => {
      await Promise.resolve();
    });

    expect(monthlyConfigServiceMock.setUnusedShabbatCreditHours).not.toHaveBeenCalled();

    await act(async () => {
      resolveFetch({ data: null });
      await Promise.resolve();
    });
  });

  it("writes this month's own unused balance back once resolved", async () => {
    authMock.user = { id: "user-1" };
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () => Promise.resolve({ data: null }),
    });
    reduxStateMock.global.dailyPayMaps = {
      "2026-09-01": {
        totalHours: 0,
        earnedShabbatCredit: { percent: 1, hours: 4 },
      },
    };

    renderHook(() => useShabbatCreditAllocation());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(monthlyConfigServiceMock.setUnusedShabbatCreditHours).toHaveBeenCalledWith(
      "user-1",
      2026,
      9,
      4,
    );
  });

  it("shows an error and treats the carry-over as zero when the fetch fails", async () => {
    authMock.user = { id: "user-1" };
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () => Promise.resolve({ error: "connection lost" }),
    });

    const { result } = renderHook(() => useShabbatCreditAllocation());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(snackbarMock.error).toHaveBeenCalledWith("connection lost");
    expect(result.current.carriedOverHours).toBe(0);
  });
});
