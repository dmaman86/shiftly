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
});
