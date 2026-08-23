import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAsync } from "@/hooks/useAsync";

describe("useAsync", () => {
  it("runs the request initially and when a dependency changes", async () => {
    const onResult = vi.fn();
    const request = vi.fn((value: number) => Promise.resolve(value));

    const { rerender } = renderHook(
      ({ dependency }) =>
        useAsync(
          () => request(dependency),
          [dependency],
          onResult,
        ),
      { initialProps: { dependency: 1 } },
    );

    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(1));

    rerender({ dependency: 2 });

    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(2));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("uses the latest result callback without repeating the request", async () => {
    let resolveRequest: (value: string) => void = () => undefined;
    const request = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const firstOnResult = vi.fn();
    const latestOnResult = vi.fn();

    const { rerender } = renderHook(
      ({ onResult }) => useAsync(request, [], onResult),
      { initialProps: { onResult: firstOnResult } },
    );

    rerender({ onResult: latestOnResult });

    await act(async () => resolveRequest("calendar"));

    expect(firstOnResult).not.toHaveBeenCalled();
    expect(latestOnResult).toHaveBeenCalledWith("calendar");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("ignores pending results and runs cleanup after unmount", async () => {
    let resolveRequest: (value: string) => void = () => undefined;
    const request = () =>
      new Promise<string>((resolve) => {
        resolveRequest = resolve;
      });
    const onResult = vi.fn();
    const cleanup = vi.fn();

    const { unmount } = renderHook(() =>
      useAsync(request, [], onResult, cleanup),
    );

    unmount();
    await act(async () => resolveRequest("late result"));

    expect(cleanup).toHaveBeenCalledOnce();
    expect(onResult).not.toHaveBeenCalled();
  });
});
