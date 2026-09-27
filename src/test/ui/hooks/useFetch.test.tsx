import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildEventMap } from "@/adapters";
import { useFetch } from "@/hooks/useFetch";

describe("useFetch", () => {
  it("passes the complete unknown payload to the boundary adapter", async () => {
    const payload = { items: [] };
    const adapter = vi.fn(buildEventMap);
    const call = vi.fn().mockResolvedValue({ data: payload });
    const { result } = renderHook(() => useFetch());

    let response: Awaited<ReturnType<typeof result.current.callEndPoint>>;
    await act(async () => {
      response = await result.current.callEndPoint({ call }, adapter);
    });

    expect(adapter).toHaveBeenCalledWith(payload);
    expect(response!).toEqual({ data: {} });
  });

  it("returns a validation error when the adapter rejects the payload", async () => {
    const call = vi.fn().mockResolvedValue({ data: { invalid: true } });
    const { result } = renderHook(() => useFetch());

    let response: Awaited<ReturnType<typeof result.current.callEndPoint>>;
    await act(async () => {
      response = await result.current.callEndPoint({ call }, buildEventMap);
    });

    expect(response!).toEqual({
      error: "Invalid Hebcal response: items must be an array",
    });
  });

  it("keeps loading while concurrent requests are pending", async () => {
    let resolveFirst!: (value: { data: string }) => void;
    let resolveSecond!: (value: { data: string }) => void;
    const firstCall = new Promise<{ data: string }>((resolve) => {
      resolveFirst = resolve;
    });
    const secondCall = new Promise<{ data: string }>((resolve) => {
      resolveSecond = resolve;
    });
    const { result } = renderHook(() => useFetch());

    let firstResult!: Promise<unknown>;
    let secondResult!: Promise<unknown>;
    await act(async () => {
      firstResult = result.current.callEndPoint({ call: () => firstCall });
      secondResult = result.current.callEndPoint({ call: () => secondCall });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecond({ data: "second" });
      await secondResult;
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveFirst({ data: "first" });
      await firstResult;
    });

    expect(result.current.loading).toBe(false);
  });

  it("cancels every active controller", async () => {
    const firstController = new AbortController();
    const secondController = new AbortController();
    const firstCall = new Promise<{ data: string }>(() => undefined);
    const secondCall = new Promise<{ data: string }>(() => undefined);
    const { result } = renderHook(() => useFetch());

    await act(async () => {
      void result.current.callEndPoint({
        call: () => firstCall,
        controller: firstController,
      });
      void result.current.callEndPoint({
        call: () => secondCall,
        controller: secondController,
      });
    });

    act(() => result.current.cancelEndPoint());

    expect(firstController.signal.aborted).toBe(true);
    expect(secondController.signal.aborted).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
