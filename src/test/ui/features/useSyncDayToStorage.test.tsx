import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkDayStatus } from "@/constants";
import {
  WorkTableDayStateContext,
  type ShiftEntries,
} from "@/features/work-table/hooks/workTableDayStateContext";

const authMock = vi.hoisted(() => ({ user: null as { id: string } | null }));

const snackbarMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

const workDayServiceMock = vi.hoisted(() => ({
  setStatus: vi.fn(),
  fetchForMonth: vi.fn(),
}));

const shiftServiceMock = vi.hoisted(() => ({
  upsert: vi.fn(),
  remove: vi.fn(),
  fetchForMonth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/useAppSnackbar", () => ({ useAppSnackbar: () => snackbarMock }));
vi.mock("@/services", () => ({
  workDayService: () => workDayServiceMock,
  shiftService: () => shiftServiceMock,
}));

import { useSyncDayToStorage } from "@/features/work-table/hooks/useSyncDayToStorage";

const buildShiftEntry = (id: string, valid: boolean, endHour = 16) => ({
  shift: {
    id,
    start: { date: new Date("2026-08-10T08:00:00") },
    end: { date: new Date(`2026-08-10T${endHour}:00:00`) },
    isDuty: false,
  },
  payMap: valid ? ({ totalHours: 8 } as never) : null,
});

const hydratedWrapper =
  (hydrated: boolean) =>
  ({ children }: { children: ReactNode }) => (
    <WorkTableDayStateContext.Provider
      value={{ state: {}, dispatch: vi.fn(), hydrated, setHydrated: vi.fn() }}
    >
      {children}
    </WorkTableDayStateContext.Provider>
  );

describe("useSyncDayToStorage", () => {
  beforeEach(() => {
    authMock.user = null;
    snackbarMock.error.mockReset();
    workDayServiceMock.setStatus
      .mockReset()
      .mockReturnValue({ call: () => Promise.resolve({ data: null }) });
    shiftServiceMock.upsert
      .mockReset()
      .mockReturnValue({ call: () => Promise.resolve({ data: null }) });
    shiftServiceMock.remove
      .mockReset()
      .mockReturnValue({ call: () => Promise.resolve({ data: null }) });
  });

  it("does nothing in guest mode", async () => {
    const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
      wrapper: hydratedWrapper(true),
      initialProps: {
        dateKey: "2026-08-10",
        status: WorkDayStatus.normal,
        shiftEntries: {} as ShiftEntries,
      },
    });

    await act(async () => {
      rerender({ dateKey: "2026-08-10", status: WorkDayStatus.sick, shiftEntries: {} });
      await Promise.resolve();
    });

    expect(workDayServiceMock.setStatus).not.toHaveBeenCalled();
  });

  it("does not persist anything before hydration has resolved", async () => {
    // Regression test: status/shiftEntries are just the pre-hydration
    // placeholder here, not a real user change - writing it would race
    // against hydration's own sync and can wipe a persisted day.
    authMock.user = { id: "user-1" };
    const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
      wrapper: hydratedWrapper(false),
      initialProps: {
        dateKey: "2026-08-10",
        status: WorkDayStatus.normal,
        shiftEntries: {} as ShiftEntries,
      },
    });

    await act(async () => {
      rerender({
        dateKey: "2026-08-10",
        status: WorkDayStatus.sick,
        shiftEntries: { "shift-1": buildShiftEntry("shift-1", true) },
      });
      await Promise.resolve();
    });

    expect(workDayServiceMock.setStatus).not.toHaveBeenCalled();
    expect(shiftServiceMock.upsert).not.toHaveBeenCalled();
  });

  it("persists a status change once hydrated", async () => {
    authMock.user = { id: "user-1" };
    const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
      wrapper: hydratedWrapper(true),
      initialProps: {
        dateKey: "2026-08-10",
        status: WorkDayStatus.normal,
        shiftEntries: {} as ShiftEntries,
      },
    });

    await act(async () => {
      rerender({ dateKey: "2026-08-10", status: WorkDayStatus.sick, shiftEntries: {} });
      await Promise.resolve();
    });

    expect(workDayServiceMock.setStatus).toHaveBeenCalledWith(
      "user-1",
      "2026-08-10",
      WorkDayStatus.sick,
    );
  });

  it("debounces a valid shift upsert", async () => {
    vi.useFakeTimers();

    try {
      authMock.user = { id: "user-1" };
      const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
        wrapper: hydratedWrapper(true),
        initialProps: {
          dateKey: "2026-08-10",
          status: WorkDayStatus.normal,
          shiftEntries: {} as ShiftEntries,
        },
      });

      const validEntry = buildShiftEntry("shift-1", true);
      await act(async () => {
        rerender({
          dateKey: "2026-08-10",
          status: WorkDayStatus.normal,
          shiftEntries: { "shift-1": validEntry },
        });
      });

      expect(shiftServiceMock.upsert).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(shiftServiceMock.upsert).toHaveBeenCalledWith(
        "user-1",
        "2026-08-10",
        validEntry.shift,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("coalesces rapid valid changes into the latest upsert", async () => {
    vi.useFakeTimers();

    try {
      authMock.user = { id: "user-1" };
      const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
        wrapper: hydratedWrapper(true),
        initialProps: {
          dateKey: "2026-08-10",
          status: WorkDayStatus.normal,
          shiftEntries: {} as ShiftEntries,
        },
      });
      const firstEntry = buildShiftEntry("shift-1", true, 16);
      const latestEntry = buildShiftEntry("shift-1", true, 17);

      await act(async () => {
        rerender({
          dateKey: "2026-08-10",
          status: WorkDayStatus.normal,
          shiftEntries: { "shift-1": firstEntry },
        });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
        rerender({
          dateKey: "2026-08-10",
          status: WorkDayStatus.normal,
          shiftEntries: { "shift-1": latestEntry },
        });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(599);
      });

      expect(shiftServiceMock.upsert).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(shiftServiceMock.upsert).toHaveBeenCalledOnce();
      expect(shiftServiceMock.upsert).toHaveBeenCalledWith(
        "user-1",
        "2026-08-10",
        latestEntry.shift,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not persist a draft shift that hasn't been saved yet", async () => {
    authMock.user = { id: "user-1" };
    const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
      wrapper: hydratedWrapper(true),
      initialProps: {
        dateKey: "2026-08-10",
        status: WorkDayStatus.normal,
        shiftEntries: {} as ShiftEntries,
      },
    });

    await act(async () => {
      rerender({
        dateKey: "2026-08-10",
        status: WorkDayStatus.normal,
        shiftEntries: { "shift-1": buildShiftEntry("shift-1", false) },
      });
      await Promise.resolve();
    });

    expect(shiftServiceMock.upsert).not.toHaveBeenCalled();
  });

  it("removes a shift that was saved and then deleted", async () => {
    authMock.user = { id: "user-1" };
    const savedEntry = buildShiftEntry("shift-1", true);
    const { rerender } = renderHook((props) => useSyncDayToStorage(props), {
      wrapper: hydratedWrapper(true),
      initialProps: {
        dateKey: "2026-08-10",
        status: WorkDayStatus.normal,
        shiftEntries: { "shift-1": savedEntry } as ShiftEntries,
      },
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      rerender({ dateKey: "2026-08-10", status: WorkDayStatus.normal, shiftEntries: {} });
      await Promise.resolve();
    });

    expect(shiftServiceMock.remove).toHaveBeenCalledWith("user-1", "shift-1");
  });
});
