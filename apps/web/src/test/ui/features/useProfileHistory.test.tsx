import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { domain } from "@/app/domain";
import { useProfileHistory } from "@/features/profile/hooks/useProfileHistory";
import { GuestDraftImportContext } from "@/features/guest-draft/guestDraftImportContext";
import type { ProfileMonthSnapshot } from "@/features/profile/helpers/profileHistory";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  auth: {
    user: null as { id: string } | null,
    isLoading: false,
    initializationError: null as string | null,
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/hooks/useDomain", () => ({ useDomain: () => domain }));
vi.mock("@/features/profile/services/profileHistory.service", () => ({
  loadProfileHistory: mocks.load,
}));

const month = { year: 2026, month: 8 };
const period = { from: { year: 2026, month: 3 }, to: month };
const snapshot: ProfileMonthSnapshot = {
  ...month,
  breakdown: null,
  baseRate: 0,
  usesDefaultConfig: false,
};
const harness = (ready = true) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <GuestDraftImportContext.Provider value={{ ready }}>
        {children}
      </GuestDraftImportContext.Provider>
    </QueryClientProvider>
  );
  return { client, wrapper };
};

describe("useProfileHistory", () => {
  beforeEach(() => {
    mocks.auth.user = { id: "user-1" };
    mocks.auth.isLoading = false;
    mocks.auth.initializationError = null;
    mocks.load.mockReset().mockResolvedValue([snapshot]);
  });

  it("does not load private history for guests or while authentication initializes", async () => {
    mocks.auth.user = null;
    const { result, rerender } = renderHook(
      () => useProfileHistory(period),
      harness(),
    );
    await act(async () => {});
    expect(mocks.load).not.toHaveBeenCalled();
    mocks.auth.user = { id: "user-1" };
    mocks.auth.isLoading = true;
    rerender();
    expect(mocks.load).not.toHaveBeenCalled();
    mocks.auth.isLoading = false;
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.load).toHaveBeenCalledWith(
      "user-1",
      period,
      domain,
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it("waits for guest data import", async () => {
    const { result } = renderHook(
      () => useProfileHistory(period),
      harness(false),
    );
    await act(async () => {});
    expect(result.current.waitingForWrites).toBe(true);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("waits for accepted editor writes before reading persisted data", async () => {
    const { client, wrapper } = harness();
    let finish!: () => void;
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });
    const pending = mutation.execute(undefined);
    await act(async () => {});
    const { result } = renderHook(() => useProfileHistory(period), { wrapper });
    expect(result.current.waitingForWrites).toBe(true);
    expect(mocks.load).not.toHaveBeenCalled();
    await act(async () => {
      finish();
      await pending;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("never exposes an old account's late response to a new account", async () => {
    let finishOld!: (value: ProfileMonthSnapshot[]) => void;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      () => useProfileHistory(period),
      harness(),
    );
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    mocks.auth.user = { id: "user-2" };
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      finishOld([{ ...snapshot, baseRate: 999 }]);
    });
    expect(result.current.data?.[0].baseRate).toBe(0);
    expect(mocks.load).toHaveBeenLastCalledWith(
      "user-2",
      period,
      domain,
      expect.any(Function),
      expect.any(AbortSignal),
    );
    mocks.auth.user = null;
    rerender();
    expect(result.current.data).toBeUndefined();
  });

  it("discards an in-flight snapshot if an editor write starts after the read", async () => {
    let finishOld!: (value: ProfileMonthSnapshot[]) => void;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    const { client, wrapper } = harness();
    const { result } = renderHook(() => useProfileHistory(period), { wrapper });
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    let finishWrite!: () => void;
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = mutation.execute(undefined);
    });
    await waitFor(() => expect(result.current.waitingForWrites).toBe(true));
    await act(async () => {
      finishWrite();
      await pending;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.load).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishOld([{ ...snapshot, baseRate: 999 }]);
    });
    expect(result.current.data?.[0].baseRate).toBe(0);
  });

  it("allows explicit retry after failure", async () => {
    mocks.load.mockRejectedValueOnce(new Error("History unavailable"));
    const { result } = renderHook(() => useProfileHistory(period), harness());
    await waitFor(() => expect(result.current.isError).toBe(true));
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual([snapshot]));
  });

  it("keys reads by both endpoints and aborts obsolete range requests", async () => {
    let finishOld!: (value: ProfileMonthSnapshot[]) => void;
    let oldSignal!: AbortSignal;
    mocks.load.mockImplementationOnce(
      (_user, _range, _domain, _calendar, signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise((resolve) => {
          finishOld = resolve;
        });
      },
    );
    const { result, rerender } = renderHook(
      (range) => useProfileHistory(range),
      {
        ...harness(),
        initialProps: period,
      },
    );
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    const next = {
      from: { year: 2026, month: 6 },
      to: { year: 2026, month: 7 },
    };
    rerender(next);
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(oldSignal.aborted).toBe(true);
    expect(mocks.load).toHaveBeenLastCalledWith(
      "user-1",
      next,
      domain,
      expect.any(Function),
      expect.any(AbortSignal),
    );
    await act(async () => {
      finishOld([{ ...snapshot, baseRate: 999 }]);
    });
    expect(result.current.data?.[0].baseRate).toBe(0);
  });
});
