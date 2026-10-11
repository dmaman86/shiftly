import {
  act,
  renderHook as renderHookBase,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
        month === 1
          ? { year: year - 1, month: 12 }
          : { year, month: month - 1 },
    },
  },
}));

const monthlyConfigServiceMock = vi.hoisted(() => ({
  fetch: vi.fn(),
  setUnusedShabbatCreditHours: vi.fn(),
}));

const globalStoreStateMock = vi.hoisted(() => ({
  global: {
    dailyPayMaps: {} as Record<string, unknown>,
    dailyPayMapsContextKey: null as string | null,
    config: { standardHours: 8 },
  },
}));

const workDaysMock = vi.hoisted(() => ({ workDays: [] as unknown[] }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/useGlobalState", () => ({
  useGlobalState: () => globalStateMock,
}));
vi.mock("@/hooks/useAppSnackbar", () => ({
  useAppSnackbar: () => snackbarMock,
}));
vi.mock("@/hooks/useDomain", () => ({ useDomain: () => domainMock }));
vi.mock("@/hooks/useWorkDays", () => ({ useWorkDays: () => workDaysMock }));
vi.mock("@/services", () => ({
  monthlyConfigService: () => monthlyConfigServiceMock,
}));
vi.mock("@/store/globalStore", () => ({
  useGlobalStore: (
    selector: (state: typeof globalStoreStateMock.global) => unknown,
  ) => selector(globalStoreStateMock.global),
}));

import { useShabbatCreditAllocation } from "@/features/monthly-pay/hooks/useShabbatCreditAllocation";
import { monthCalculationKey } from "@/store/monthCalculationKey";

const renderHook = (
  callback: () => ReturnType<typeof useShabbatCreditAllocation>,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  return renderHookBase(callback, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

describe("useShabbatCreditAllocation", () => {
  it("can retry a failed carry-over load and then persist a confirmed zero balance", async () => {
    authMock.user = { id: "user-1" };
    monthlyConfigServiceMock.fetch
      .mockReturnValueOnce({
        call: () => Promise.resolve({ error: "load failed" }),
      })
      .mockReturnValue({ call: () => Promise.resolve({ data: null }) });
    const { result } = renderHook(() => useShabbatCreditAllocation());
    await waitFor(() =>
      expect(result.current.error?.message).toBe("load failed"),
    );
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).not.toHaveBeenCalled();
    act(() => result.current.retry());
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledWith("user-1", 2026, 9, 0),
    );
    expect(result.current.ready).toBe(true);
  });

  it.each([-1, Number.NaN])(
    "does not propagate an invalid saved balance (%s)",
    async (hours) => {
      authMock.user = { id: "user-1" };
      monthlyConfigServiceMock.fetch.mockReturnValue({
        call: () =>
          Promise.resolve({ data: { unused_shabbat_credit_hours: hours } }),
      });
      const { result } = renderHook(() => useShabbatCreditAllocation());
      await waitFor(() =>
        expect(result.current.error?.message).toBe(
          "The saved Shabbat credit balance is invalid",
        ),
      );
      expect(result.current.ready).toBe(false);
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).not.toHaveBeenCalled();
    },
  );

  it("blocks the next month's carry-over after a failed previous-month write and retries its original identity", async () => {
    authMock.user = { id: "user-1" };
    globalStoreStateMock.global.dailyPayMaps = {
      "2026-09-01": {
        totalHours: 0,
        earnedShabbatCredit: { percent: 1, hours: 4 },
      },
    };
    monthlyConfigServiceMock.fetch.mockImplementation(
      (_user: string, _year: number, month: number) => ({
        call: () =>
          Promise.resolve({
            data: month === 9 ? { unused_shabbat_credit_hours: 4 } : null,
          }),
      }),
    );
    monthlyConfigServiceMock.setUnusedShabbatCreditHours.mockReturnValueOnce({
      call: () => Promise.resolve({ error: "previous write failed" }),
    });
    const { result, rerender } = renderHook(() => useShabbatCreditAllocation());
    await waitFor(() =>
      expect(result.current.error?.message).toBe("previous write failed"),
    );
    globalStateMock.month = 10;
    globalStoreStateMock.global.dailyPayMaps = {};
    globalStoreStateMock.global.dailyPayMapsContextKey = monthCalculationKey(
      "user-1",
      2026,
      10,
      8,
    );
    rerender();
    await waitFor(() => expect(result.current.ready).toBe(false));
    expect(monthlyConfigServiceMock.fetch).not.toHaveBeenCalledWith(
      "user-1",
      2026,
      9,
    );
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).toHaveBeenCalledTimes(1);
    act(() => result.current.retry());
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledWith("user-1", 2026, 10, 4),
    );
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours.mock.calls[1],
    ).toEqual(["user-1", 2026, 9, 4]);
  });

  it("waits for an accepted previous-month write before fetching its balance", async () => {
    authMock.user = { id: "user-1" };
    globalStoreStateMock.global.dailyPayMaps = {
      "2026-09-01": {
        totalHours: 0,
        earnedShabbatCredit: { percent: 1, hours: 4 },
      },
    };
    let resolveWrite: (value: { data: null }) => void = () => {};
    monthlyConfigServiceMock.fetch.mockImplementation(
      (_user: string, _year: number, month: number) => ({
        call: () =>
          Promise.resolve({
            data: month === 9 ? { unused_shabbat_credit_hours: 4 } : null,
          }),
      }),
    );
    monthlyConfigServiceMock.setUnusedShabbatCreditHours.mockReturnValueOnce({
      call: () =>
        new Promise((resolve) => {
          resolveWrite = resolve;
        }),
    });
    const { result, rerender } = renderHook(() => useShabbatCreditAllocation());
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledTimes(1),
    );
    globalStateMock.month = 10;
    globalStoreStateMock.global.dailyPayMaps = {};
    globalStoreStateMock.global.dailyPayMapsContextKey = monthCalculationKey(
      "user-1",
      2026,
      10,
      8,
    );
    rerender();
    expect(result.current.ready).toBe(false);
    expect(monthlyConfigServiceMock.fetch).not.toHaveBeenCalledWith(
      "user-1",
      2026,
      9,
    );
    await act(async () => {
      resolveWrite({ data: null });
    });
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledWith("user-1", 2026, 10, 4),
    );
  });

  beforeEach(() => {
    authMock.user = null;
    globalStateMock.year = 2026;
    globalStateMock.month = 9;
    workDaysMock.workDays = [];
    globalStoreStateMock.global.dailyPayMaps = {};
    globalStoreStateMock.global.dailyPayMapsContextKey = monthCalculationKey(
      "user-1",
      2026,
      9,
      8,
    );
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

    expect(monthlyConfigServiceMock.fetch).toHaveBeenCalledWith(
      "user-1",
      2026,
      8,
    );
    await waitFor(() => expect(result.current.carriedOverHours).toBe(3.5));
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

    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).not.toHaveBeenCalled();

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
    globalStoreStateMock.global.dailyPayMaps = {
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

    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledWith("user-1", 2026, 9, 4),
    );
  });

  it("does not persist a balance when the carry-over fetch fails", async () => {
    authMock.user = { id: "user-1" };
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () => Promise.resolve({ error: "connection lost" }),
    });

    const { result } = renderHook(() => useShabbatCreditAllocation());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(snackbarMock.error).toHaveBeenCalledWith("connection lost"),
    );
    expect(result.current.carriedOverHours).toBe(0);
    expect(result.current.ready).toBe(false);
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).not.toHaveBeenCalled();
  });

  it("waits for an identity-matched hydrated projection, including an empty month", async () => {
    authMock.user = { id: "user-1" };
    globalStoreStateMock.global.dailyPayMapsContextKey = null;
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () => Promise.resolve({ data: null }),
    });
    const { result, rerender } = renderHook(() => useShabbatCreditAllocation());
    await waitFor(() =>
      expect(monthlyConfigServiceMock.fetch).toHaveBeenCalled(),
    );
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).not.toHaveBeenCalled();
    globalStoreStateMock.global.dailyPayMapsContextKey = monthCalculationKey(
      "other-user",
      2026,
      9,
      8,
    );
    rerender();
    expect(result.current.ready).toBe(false);
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).not.toHaveBeenCalled();
    globalStoreStateMock.global.dailyPayMapsContextKey = monthCalculationKey(
      "user-1",
      2026,
      9,
      8,
    );
    rerender();
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledWith("user-1", 2026, 9, 0),
    );
  });

  it("allows retrying an unchanged balance after a write fails", async () => {
    authMock.user = { id: "user-1" };
    monthlyConfigServiceMock.fetch.mockReturnValue({
      call: () => Promise.resolve({ data: null }),
    });
    monthlyConfigServiceMock.setUnusedShabbatCreditHours.mockReturnValueOnce({
      call: () => Promise.resolve({ error: "write failed" }),
    });
    const { result } = renderHook(() => useShabbatCreditAllocation());
    await waitFor(() =>
      expect(result.current.error?.message).toBe("write failed"),
    );
    act(() => result.current.retry());
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledTimes(2),
    );
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it("does not write the new month using an old projection or a late old fetch", async () => {
    authMock.user = { id: "user-1" };
    let resolveOld: (value: {
      data: { unused_shabbat_credit_hours: number };
    }) => void = () => {};
    monthlyConfigServiceMock.fetch
      .mockReturnValueOnce({
        call: () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      })
      .mockReturnValue({ call: () => Promise.resolve({ data: null }) });
    const { result, rerender } = renderHook(() => useShabbatCreditAllocation());
    globalStateMock.month = 10;
    rerender();
    await act(async () => {
      resolveOld({ data: { unused_shabbat_credit_hours: 12 } });
    });
    await waitFor(() =>
      expect(monthlyConfigServiceMock.fetch).toHaveBeenCalledWith(
        "user-1",
        2026,
        9,
      ),
    );
    expect(result.current.ready).toBe(false);
    expect(
      monthlyConfigServiceMock.setUnusedShabbatCreditHours,
    ).not.toHaveBeenCalled();
    globalStoreStateMock.global.dailyPayMapsContextKey = monthCalculationKey(
      "user-1",
      2026,
      10,
      8,
    );
    rerender();
    await waitFor(() =>
      expect(
        monthlyConfigServiceMock.setUnusedShabbatCreditHours,
      ).toHaveBeenCalledWith("user-1", 2026, 10, 0),
    );
    expect(result.current.carriedOverHours).toBe(0);
  });
});
