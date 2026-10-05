import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import type { ReactNode } from "react";
import { StrictMode } from "react";

const authMock = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  initializationError: null as string | null,
}));
const snackbarMock = vi.hoisted(() => ({ error: vi.fn() }));
const serviceMock = vi.hoisted(() => ({ fetch: vi.fn(), upsert: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/useAppSnackbar", () => ({
  useAppSnackbar: () => snackbarMock,
}));
vi.mock("@/services", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services")>()),
  monthlyConfigService: () => serviceMock,
}));

import i18n from "@/i18n";
import { domain } from "@/app/domain/domain.instance";
import type { ApiResponse } from "@/app/types/api.types";
import type { MonthlyConfigRecord } from "@/services/monthlyConfig/monthlyConfig.service";
import { useGlobalState } from "@/hooks/useGlobalState";
import { initialGlobalState, useGlobalStore } from "@/store/globalStore";
import { MonthlyDataProvider } from "@/features/monthly-data/MonthlyDataProvider";
import { useMonthlyConfigStatus } from "@/features/monthly-data/monthlyConfigStatusContext";
import { GuestDraftImportContext } from "@/features/guest-draft/guestDraftImportContext";
import { ConfigPanel } from "@/features/config/ConfigPanel";

const record = (rate = 60, month = 8): MonthlyConfigRecord => ({
  year: 2026,
  month,
  standard_hours: 7.5,
  base_rate: rate,
  unused_shabbat_credit_hours: 0,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const Probe = () => {
  const { year, month, standardHours, baseRate } = useGlobalState();
  const { ready } = useMonthlyConfigStatus();
  if (!ready) return null;
  return (
    <output data-testid="config">
      {JSON.stringify({ year, month, standardHours, baseRate })}
    </output>
  );
};
const session = (ready = true, showEditor = true) => (
  <GuestDraftImportContext.Provider
    value={{ ready, restoreDraft: null, markRestored: () => {} }}
  >
    <MonthlyDataProvider>
      <button type="button">Persistent navigation</button>
      <Probe />
      {showEditor && <ConfigPanel domain={domain} />}
    </MonthlyDataProvider>
  </GuestDraftImportContext.Provider>
);
const clients: QueryClient[] = [];
const renderSession = (ready = true) => {
  const client = new QueryClient();
  clients.push(client);
  const result = render(session(ready), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {children}
        </LocalizationProvider>
      </QueryClientProvider>
    ),
  });
  return { ...result, client };
};
const waitForReady = () => screen.findByTestId("config");
const editRate = (rate: string) =>
  fireEvent.change(screen.getByLabelText("שכר שעתי"), {
    target: { value: rate },
  });
const useMobileViewport = () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
};

describe("MonthlyDataProvider with the real store and ConfigPanel", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("he");
    authMock.user = { id: "user-1" };
    authMock.isLoading = false;
    authMock.initializationError = null;
    serviceMock.fetch
      .mockReset()
      .mockReturnValue({ call: async () => ({ data: record() }) });
    serviceMock.upsert
      .mockReset()
      .mockReturnValue({ call: async () => ({ data: null }) });
    snackbarMock.error.mockReset();
    useGlobalStore.setState({
      ...initialGlobalState,
      monthlyConfigContextKey: null,
      config: { year: 2026, month: 8, standardHours: 8, baseRate: 75 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    clients.splice(0).forEach((client) => client.clear());
  });

  it("does not initialize defaults or mount consumers while authenticated loading is pending", async () => {
    const load = deferred<ApiResponse<MonthlyConfigRecord | null>>();
    serviceMock.fetch.mockReturnValue({ call: () => load.promise });
    const observed: number[] = [];
    const unsubscribe = useGlobalStore.subscribe((state) =>
      observed.push(state.config.baseRate),
    );
    try {
      renderSession();
      expect(screen.queryByTestId("config")).not.toBeInTheDocument();
      expect(useGlobalStore.getState().config.baseRate).toBe(75);
      expect(observed).toEqual([]);
      await act(async () => {
        load.resolve({ data: record() });
      });
      await waitForReady();
      expect(observed).toEqual([60]);
      expect(useGlobalStore.getState().config).toEqual({
        year: 2026,
        month: 8,
        standardHours: 7.5,
        baseRate: 60,
      });
      expect(serviceMock.upsert).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it("preserves the shell and focused date field while another month loads", async () => {
    const next = deferred<ApiResponse<MonthlyConfigRecord | null>>();
    renderSession();
    await waitForReady();
    const navigation = screen.getByRole("button", {
      name: "Persistent navigation",
    });
    const dateField = screen.getByRole("spinbutton", { name: "Month" });
    act(() => dateField.focus());
    serviceMock.fetch.mockReturnValueOnce({ call: () => next.promise });
    act(() => useGlobalStore.getState().selectMonth(2026, 9));
    expect(screen.getByRole("button", { name: "Persistent navigation" })).toBe(
      navigation,
    );
    expect(screen.getByRole("spinbutton", { name: "Month" })).toBe(dateField);
    expect(dateField).toHaveFocus();
    expect(screen.queryByTestId("config")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("שכר שעתי")).not.toBeInTheDocument();
    await act(async () => {
      next.resolve({ data: record(90, 9) });
    });
    await waitForReady();
    expect(screen.getByRole("spinbutton", { name: "Month" })).toBe(dateField);
    expect(dateField).toHaveFocus();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("resets guest values on month changes without rebuilding the selector", async () => {
    authMock.user = null;
    renderSession();
    await waitForReady();
    const dateField = screen.getByRole("spinbutton", { name: "Month" });
    editRate("45");
    await waitFor(() =>
      expect(useGlobalStore.getState().config.baseRate).toBe(45),
    );
    act(() => useGlobalStore.getState().selectMonth(2026, 9));
    await waitForReady();
    expect(useGlobalStore.getState().config.baseRate).toBe(0);
    expect(screen.getByRole("spinbutton", { name: "Month" })).toBe(dateField);
    expect(serviceMock.fetch).not.toHaveBeenCalled();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("does not treat unresolved auth as guest initialization", async () => {
    authMock.user = null;
    authMock.isLoading = true;
    const { rerender } = renderSession();
    expect(useGlobalStore.getState().config.baseRate).toBe(75);
    expect(screen.queryByTestId("config")).not.toBeInTheDocument();
    authMock.isLoading = false;
    authMock.user = { id: "user-1" };
    rerender(session());
    await waitForReady();
    expect(useGlobalStore.getState().config.baseRate).toBe(60);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("initializes and edits guest defaults without remote requests", async () => {
    authMock.user = null;
    renderSession(false);
    await waitForReady();
    expect(useGlobalStore.getState().config.baseRate).toBe(0);
    editRate("45");
    await waitFor(() =>
      expect(useGlobalStore.getState().config.baseRate).toBe(45),
    );
    expect(serviceMock.fetch).not.toHaveBeenCalled();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("initializes a guest context once under StrictMode", async () => {
    authMock.user = null;
    const initialize = vi.spyOn(useGlobalStore.getState(), "initializeMonth");
    const client = new QueryClient();
    clients.push(client);
    try {
      render(
        <StrictMode>
          <QueryClientProvider client={client}>
            <MonthlyDataProvider>
              <Probe />
            </MonthlyDataProvider>
          </QueryClientProvider>
        </StrictMode>,
      );
      await waitForReady();
      expect(initialize).toHaveBeenCalledOnce();
      expect(serviceMock.fetch).not.toHaveBeenCalled();
    } finally {
      initialize.mockRestore();
    }
  });

  it("does not enable guest consumers after an authentication initialization error", async () => {
    authMock.user = null;
    authMock.initializationError = "session unavailable";
    renderSession();
    expect(screen.getByRole("alert")).toHaveTextContent(
      i18n.t("auth.initialization_error"),
    );
    expect(screen.queryByTestId("config")).not.toBeInTheDocument();
    expect(useGlobalStore.getState().config.baseRate).toBe(75);
    expect(serviceMock.fetch).not.toHaveBeenCalled();
  });

  it("waits for guest import before loading the final persisted config", async () => {
    const { rerender } = renderSession(false);
    expect(serviceMock.fetch).not.toHaveBeenCalled();
    expect(useGlobalStore.getState().config.baseRate).toBe(75);
    rerender(session(true));
    await waitForReady();
    expect(serviceMock.fetch).toHaveBeenCalledOnce();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("resolves a missing record to defaults without saving hydration", async () => {
    serviceMock.fetch.mockReturnValue({ call: async () => ({ data: null }) });
    renderSession();
    await waitForReady();
    expect(useGlobalStore.getState().config).toEqual({
      year: 2026,
      month: 8,
      standardHours: 6.67,
      baseRate: 0,
    });
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("keeps consumers blocked after a load error and supports explicit retry", async () => {
    serviceMock.fetch.mockReturnValueOnce({
      call: async () => ({ error: "connection lost" }),
    });
    renderSession();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      i18n.t("config.load_error"),
    );
    expect(useGlobalStore.getState().config.baseRate).toBe(75);
    expect(screen.queryByTestId("config")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("actions.try_again") }),
    );
    await waitForReady();
    expect(serviceMock.fetch).toHaveBeenCalledTimes(2);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("does not reset or refetch when the same user's object changes or the editor remounts", async () => {
    const { rerender, client } = renderSession();
    await waitForReady();
    editRate("65");
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledOnce());
    authMock.user = { id: "user-1" };
    rerender(session(true, false));
    rerender(session());
    await act(async () => {
      await client.invalidateQueries();
    });
    expect(useGlobalStore.getState().config.baseRate).toBe(65);
    expect(serviceMock.fetch).toHaveBeenCalledOnce();
    expect(serviceMock.upsert).toHaveBeenCalledOnce();
  });

  it("ignores a stale month response and never exposes the old rate under the new month", async () => {
    const old = deferred<ApiResponse<MonthlyConfigRecord | null>>();
    const next = deferred<ApiResponse<MonthlyConfigRecord | null>>();
    serviceMock.fetch
      .mockReturnValueOnce({ call: () => old.promise })
      .mockReturnValueOnce({ call: () => next.promise });
    renderSession();
    act(() => useGlobalStore.getState().selectMonth(2026, 9));
    expect(screen.queryByTestId("config")).not.toBeInTheDocument();
    await act(async () => {
      next.resolve({ data: record(90, 9) });
    });
    await waitForReady();
    await act(async () => {
      old.resolve({ data: record(10) });
    });
    expect(useGlobalStore.getState().config.baseRate).toBe(90);
    expect(useGlobalStore.getState().config.month).toBe(9);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("keeps the mobile picker mounted until its draft month is accepted", async () => {
    useMobileViewport();
    serviceMock.fetch.mockImplementation(
      (_user: string, _year: number, month: number) => ({
        call: async () => ({ data: record(month === 7 ? 70 : 60, month) }),
      }),
    );
    renderSession();
    await waitForReady();
    fireEvent.click(screen.getByRole("button", { name: /Choose date/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Jul", { exact: true }));
    expect(within(dialog).getByRole("button", { name: "OK" })).toBeVisible();
    expect(useGlobalStore.getState().config.month).toBe(8);
    expect(serviceMock.fetch).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));
    await waitFor(() => expect(useGlobalStore.getState().config.month).toBe(7));
    await waitForReady();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(useGlobalStore.getState().config.baseRate).toBe(70);
    expect(serviceMock.fetch).toHaveBeenLastCalledWith("user-1", 2026, 7);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("does not initialize another month when a mobile picker draft is cancelled", async () => {
    useMobileViewport();
    renderSession();
    await waitForReady();
    fireEvent.click(screen.getByRole("button", { name: /Choose date/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Jul", { exact: true }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("spinbutton", { name: "Month" })).toHaveTextContent(
      "August",
    );
    expect(useGlobalStore.getState().config.month).toBe(8);
    expect(useGlobalStore.getState().config.baseRate).toBe(60);
    expect(serviceMock.fetch).toHaveBeenCalledOnce();
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("ignores an old account response after switching accounts", async () => {
    const old = deferred<ApiResponse<MonthlyConfigRecord | null>>();
    serviceMock.fetch.mockReturnValueOnce({ call: () => old.promise });
    const { rerender } = renderSession();
    authMock.user = { id: "user-2" };
    rerender(session());
    await waitForReady();
    await act(async () => {
      old.resolve({ data: record(10) });
    });
    expect(useGlobalStore.getState().config.baseRate).toBe(60);
    expect(serviceMock.fetch).toHaveBeenLastCalledWith("user-2", 2026, 8);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("clears account configuration on logout without saving guest defaults", async () => {
    const { rerender } = renderSession();
    await waitForReady();
    authMock.user = null;
    rerender(session());
    await waitForReady();
    expect(useGlobalStore.getState().config.baseRate).toBe(0);
    expect(useGlobalStore.getState().config.standardHours).toBe(6.67);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("saves only validated debounced user edits with a complete current snapshot", async () => {
    renderSession();
    await waitForReady();
    editRate("6");
    editRate("65");
    expect(serviceMock.upsert).not.toHaveBeenCalled();
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledOnce());
    expect(serviceMock.upsert).toHaveBeenLastCalledWith("user-1", {
      year: 2026,
      month: 8,
      standard_hours: 7.5,
      base_rate: 65,
    });
    fireEvent.change(screen.getByLabelText("שעות תקן"), {
      target: { value: "8" },
    });
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledTimes(2));
    expect(serviceMock.upsert).toHaveBeenLastCalledWith("user-1", {
      year: 2026,
      month: 8,
      standard_hours: 8,
      base_rate: 65,
    });
  });

  it("preserves deliberate clear-to-zero behavior without replaying hydration", async () => {
    renderSession();
    await waitForReady();
    editRate("");
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledOnce());
    expect(serviceMock.upsert).toHaveBeenLastCalledWith(
      "user-1",
      expect.objectContaining({ base_rate: 0 }),
    );
  });

  it("serializes rapid accepted saves and preserves their original month", async () => {
    const first = deferred<ApiResponse<null>>();
    serviceMock.upsert.mockReturnValueOnce({ call: () => first.promise });
    renderSession();
    await waitForReady();
    editRate("65");
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledOnce());
    editRate("70");
    await waitFor(() =>
      expect(useGlobalStore.getState().config.baseRate).toBe(70),
    );
    expect(serviceMock.upsert).toHaveBeenCalledOnce();
    act(() => useGlobalStore.getState().selectMonth(2026, 9));
    await waitForReady();
    await act(async () => {
      first.resolve({ data: null });
    });
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledTimes(2));
    expect(serviceMock.upsert).toHaveBeenLastCalledWith(
      "user-1",
      expect.objectContaining({ month: 8, base_rate: 70 }),
    );
  });

  it("waits for pending saves before reloading a month during A to B to A navigation", async () => {
    const save = deferred<ApiResponse<null>>();
    serviceMock.upsert.mockReturnValueOnce({ call: () => save.promise });
    serviceMock.fetch.mockImplementation(
      (_user: string, _year: number, month: number) => ({
        call: async () => ({
          data: record(
            month === 8 && serviceMock.upsert.mock.calls.length > 0 ? 65 : 60,
            month,
          ),
        }),
      }),
    );
    renderSession();
    await waitForReady();
    editRate("65");
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledOnce());
    act(() => useGlobalStore.getState().selectMonth(2026, 9));
    await waitForReady();
    act(() => useGlobalStore.getState().selectMonth(2026, 8));
    expect(screen.queryByTestId("config")).not.toBeInTheDocument();
    expect(serviceMock.fetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      save.resolve({ data: null });
    });
    await waitForReady();
    expect(serviceMock.fetch).toHaveBeenCalledTimes(3);
    expect(useGlobalStore.getState().config.baseRate).toBe(65);
  });

  it("discards an uncommitted input draft when navigating to an equal-valued month", async () => {
    renderSession();
    await waitForReady();
    editRate("0");
    act(() => useGlobalStore.getState().selectMonth(2026, 9));
    await waitForReady();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(useGlobalStore.getState().config.baseRate).toBe(60);
    expect(serviceMock.upsert).not.toHaveBeenCalled();
  });

  it("shows failed saves and retries the captured snapshot", async () => {
    serviceMock.upsert.mockReturnValueOnce({
      call: async () => ({ error: "write failed" }),
    });
    renderSession();
    await waitForReady();
    editRate("65");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      i18n.t("config.save_error", { month: 8, year: 2026 }),
    );
    expect(snackbarMock.error).toHaveBeenCalledWith("write failed");
    expect(useGlobalStore.getState().config.baseRate).toBe(65);
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("actions.try_again") }),
    );
    await waitFor(() => expect(serviceMock.upsert).toHaveBeenCalledTimes(2));
    expect(serviceMock.upsert.mock.calls[1]).toEqual(
      serviceMock.upsert.mock.calls[0],
    );
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
