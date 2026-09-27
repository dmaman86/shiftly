import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ user: null as { id: string } | null }));

const globalStateMock = vi.hoisted(() => ({
  year: 2026,
  month: 8,
  standardHours: 6.67,
  baseRate: 0,
  initializeMonth: vi.fn(),
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
vi.mock("@/services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services")>();
  return { ...actual, monthlyConfigService: () => serviceMock };
});

import { MonthlyDataProvider } from "@/features/monthly-data/MonthlyDataProvider";

const monthlyDataElement = () => (
  <MonthlyDataProvider>
    <div />
  </MonthlyDataProvider>
);

const renderMonthlyDataProvider = () => render(monthlyDataElement());

describe("MonthlyDataProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authMock.user = null;
    globalStateMock.year = 2026;
    globalStateMock.month = 8;
    globalStateMock.standardHours = 6.67;
    globalStateMock.baseRate = 0;
    globalStateMock.initializeMonth.mockReset();
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
    renderMonthlyDataProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(serviceMock.fetch).not.toHaveBeenCalled();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("initializes guest monthly state with defaults", () => {
    renderMonthlyDataProvider();

    expect(globalStateMock.initializeMonth).toHaveBeenCalledWith(2026, 8);
  });

  it("hydrates the global config from the persisted record on mount", async () => {
    authMock.user = { id: "user-1" };
    serviceMock.fetch.mockReturnValue({
      call: () =>
        Promise.resolve({
          data: { year: 2026, month: 8, standard_hours: 7.5, base_rate: 60 },
        }),
    });

    renderMonthlyDataProvider();
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

    renderMonthlyDataProvider();
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

    renderMonthlyDataProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(snackbarMock.error).toHaveBeenCalledWith("connection lost");
  });

  it("does not write before hydration has resolved", async () => {
    authMock.user = { id: "user-1" };
    let resolveFetch: (value: { data: null }) => void = () => {};
    serviceMock.fetch.mockReturnValue({
      call: () => new Promise((resolve) => (resolveFetch = resolve)),
    });

    renderMonthlyDataProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(serviceMock.upsert).not.toHaveBeenCalled();

    await act(async () => {
      resolveFetch({ data: null });
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  it("does not write the previous debounced value after hydration", async () => {
    authMock.user = { id: "user-1" };
    globalStateMock.baseRate = 48.47;
    serviceMock.fetch.mockReturnValue({
      call: () =>
        Promise.resolve({
          data: { year: 2026, month: 8, standard_hours: 6.67, base_rate: 47.48 },
        }),
    });

    const { rerender } = renderMonthlyDataProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    globalStateMock.baseRate = 47.48;
    rerender(monthlyDataElement());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(serviceMock.upsert).not.toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ base_rate: 48.47 }),
    );
  });

  it("ignores a stale response after navigating to another month", async () => {
    authMock.user = { id: "user-1" };
    let resolveFirstFetch: (value: { data: null }) => void = () => {};
    serviceMock.fetch
      .mockReturnValueOnce({
        call: () => new Promise((resolve) => (resolveFirstFetch = resolve)),
      })
      .mockReturnValueOnce({ call: () => Promise.resolve({ data: null }) });

    const { rerender } = renderMonthlyDataProvider();
    globalStateMock.month = 9;
    rerender(monthlyDataElement());

    await act(async () => {
      resolveFirstFetch({ data: null });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(globalStateMock.updateStandardHours).not.toHaveBeenCalled();
    expect(globalStateMock.updateBaseRate).not.toHaveBeenCalled();
    expect(serviceMock.fetch).toHaveBeenNthCalledWith(2, "user-1", 2026, 9);
  });
});
