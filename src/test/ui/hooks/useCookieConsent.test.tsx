import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/services", () => ({
  loadGtag: vi.fn(),
}));

import { loadGtag } from "@/services";
import { useCookieConsent } from "@/hooks/useCookieConsent";

describe("useCookieConsent", () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  it("returns null when no consent is stored", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBeNull();
  });

  it("returns true when consent was previously accepted", () => {
    store["cookie_consent"] = "true";
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBe(true);
  });

  it("returns false when consent was previously rejected", () => {
    store["cookie_consent"] = "false";
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBe(false);
  });

  it("accept() sets consent to true and persists to localStorage", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.accept());
    expect(result.current.consent).toBe(true);
    expect(store["cookie_consent"]).toBe("true");
  });

  it("reject() sets consent to false and persists to localStorage", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.reject());
    expect(result.current.consent).toBe(false);
    expect(store["cookie_consent"]).toBe("false");
  });

  it("calls loadGtag when user accepts", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.accept());
    expect(loadGtag).toHaveBeenCalledTimes(1);
  });

  it("does not call loadGtag when consent is null on mount", () => {
    renderHook(() => useCookieConsent());
    expect(loadGtag).not.toHaveBeenCalled();
  });

  it("does not call loadGtag when user rejects", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.reject());
    expect(loadGtag).not.toHaveBeenCalled();
  });

  it("calls loadGtag on mount when previously accepted", () => {
    store["cookie_consent"] = "true";
    renderHook(() => useCookieConsent());
    expect(loadGtag).toHaveBeenCalledTimes(1);
  });
});
