import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ user: null as { id: string } | null }));

const globalStateMock = vi.hoisted(() => ({
  year: 2026,
  month: 8,
  standardHours: 6.67,
  baseRate: 0,
  updateStandardHours: vi.fn(),
  updateBaseRate: vi.fn(),
}));

const snackbarMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

const serviceMock = vi.hoisted(() => ({
  fetch: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/useGlobalState", () => ({ useGlobalState: () => globalStateMock }));
vi.mock("@/hooks/useAppSnackbar", () => ({ useAppSnackbar: () => snackbarMock }));
vi.mock("@/services", () => ({ monthlyConfigService: () => serviceMock }));

import { useMonthlyConfigSync } from "@/features/config/hooks/useMonthlyConfigSync";

describe("useMonthlyConfigSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authMock.user = null;
    globalStateMock.year = 2026;
    globalStateMock.month = 8;
    globalStateMock.standardHours = 6.67;
    globalStateMock.baseRate = 0;
    globalStateMock.updateStandardHours.mockReset();
    globalStateMock.updateBaseRate.mockReset();
    snackbarMock.error.mockReset();
    serviceMock.fetch.mockReset();
    serviceMock.upsert.mockReset();
    serviceMock.upsert.mockReturnValue({ call: () => Promise.resolve({ data: null }) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing in guest mode", async () => {
    renderHook(() => useMonthlyConfigSync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(serviceMock.fetch).not.toHaveBeenCalled();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("hydrates the global config from the persisted record on mount", async () => {
    authMock.user = { id: "user-1" };
    serviceMock.fetch.mockReturnValue({
      call: () =>
        Promise.resolve({
          data: { year: 2026, month: 8, standard_hours: 7.5, base_rate: 60 },
        }),
    });

    renderHook(() => useMonthlyConfigSync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(serviceMock.fetch).toHaveBeenCalledWith("user-1", 2026, 8);
    expect(globalStateMock.updateStandardHours).toHaveBeenCalledWith(7.5);
    expect(globalStateMock.updateBaseRate).toHaveBeenCalledWith(60);
  });

  it("leaves the in-memory defaults untouched when nothing was ever saved", async () => {
    authMock.user = { id: "user-1" };
    serviceMock.fetch.mockReturnValue({ call: () => Promise.resolve({ data: null }) });

    renderHook(() => useMonthlyConfigSync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(globalStateMock.updateStandardHours).not.toHaveBeenCalled();
    expect(globalStateMock.updateBaseRate).not.toHaveBeenCalled();
  });

  it("shows an error when hydration fails", async () => {
    authMock.user = { id: "user-1" };
    serviceMock.fetch.mockReturnValue({
      call: () => Promise.resolve({ error: "connection lost" }),
    });

    renderHook(() => useMonthlyConfigSync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(snackbarMock.error).toHaveBeenCalledWith("connection lost");
  });

  it("writes debounced local changes back to Supabase once hydrated", async () => {
    authMock.user = { id: "user-1" };
    serviceMock.fetch.mockReturnValue({ call: () => Promise.resolve({ data: null }) });

    const { rerender } = renderHook(() => useMonthlyConfigSync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    globalStateMock.standardHours = 7;
    globalStateMock.baseRate = 65;
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(serviceMock.upsert).toHaveBeenCalledWith("user-1", {
      year: 2026,
      month: 8,
      standard_hours: 7,
      base_rate: 65,
    });
  });

  it("does not write before hydration has resolved", async () => {
    authMock.user = { id: "user-1" };
    let resolveFetch: (value: { data: null }) => void = () => {};
    serviceMock.fetch.mockReturnValue({
      call: () => new Promise((resolve) => (resolveFetch = resolve)),
    });

    renderHook(() => useMonthlyConfigSync());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(serviceMock.upsert).not.toHaveBeenCalled();

    await act(async () => {
      resolveFetch({ data: null });
      await vi.advanceTimersByTimeAsync(0);
    });
  });
});
