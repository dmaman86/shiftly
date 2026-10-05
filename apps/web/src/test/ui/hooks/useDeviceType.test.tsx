import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeviceType } from "@/hooks/useDeviceType";

// MUI's default theme: sm = 600px, md = 900px. `down(bp)` matches widths below bp.
const stubViewportWidth = (width: number) =>
  vi.stubGlobal("matchMedia", vi.fn((query: string) => {
    const maxWidth = Number(/max-width:\s*([\d.]+)px/.exec(query)?.[1]);
    return {
      matches: width <= maxWidth,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }));

describe("useDeviceType", () => {
  beforeEach(() => stubViewportWidth(768));
  afterEach(() => vi.unstubAllGlobals());

  it("treats a tablet width as desktop with the default sm cutoff", () => {
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toEqual({ isMobile: false, isDesktop: true });
  });

  it("treats the same width as mobile with an md cutoff", () => {
    const { result } = renderHook(() => useDeviceType("md"));
    expect(result.current).toEqual({ isMobile: true, isDesktop: false });
  });
});
