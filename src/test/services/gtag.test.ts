import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadGtag } from "@/services/analytics/gtag";

describe("loadGtag", () => {
  beforeEach(() => {
    vi.stubGlobal("gtag", undefined);
    vi.stubGlobal("dataLayer", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing on localhost", () => {
    const spy = vi.spyOn(document.head, "appendChild");
    loadGtag();
    expect(spy).not.toHaveBeenCalled();
    expect(window.gtag).toBeUndefined();
    spy.mockRestore();
  });

  it("does nothing if gtag is already defined", () => {
    vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
    vi.stubGlobal("gtag", vi.fn());
    const spy = vi.spyOn(document.head, "appendChild");

    loadGtag();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("injects async GA script when not on localhost", () => {
    vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
    const spy = vi.spyOn(document.head, "appendChild");

    loadGtag();

    expect(spy).toHaveBeenCalledOnce();
    const script = spy.mock.calls[0][0] as HTMLScriptElement;
    expect(script.src).toContain("googletagmanager.com/gtag/js");
    expect(script.async).toBe(true);
    spy.mockRestore();
  });

  it("sets up window.gtag as a function and initializes dataLayer", () => {
    vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
    const spy = vi.spyOn(document.head, "appendChild").mockImplementation(() => document.head);

    loadGtag();

    expect(typeof window.gtag).toBe("function");
    expect(Array.isArray(window.dataLayer)).toBe(true);
    spy.mockRestore();
  });

  it("pushes js and config commands to dataLayer after loading", () => {
    vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
    const spy = vi.spyOn(document.head, "appendChild").mockImplementation(() => document.head);

    loadGtag();

    expect(window.dataLayer).toHaveLength(2);
    const [jsCall, configCall] = window.dataLayer as unknown[][];
    expect(jsCall[0]).toBe("js");
    expect(jsCall[1]).toBeInstanceOf(Date);
    expect(configCall[0]).toBe("config");
    expect(configCall[1]).toBe("G-G19J1209M6");
    spy.mockRestore();
  });

  it("is idempotent: second call does nothing if gtag already loaded", () => {
    vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
    const spy = vi.spyOn(document.head, "appendChild").mockImplementation(() => document.head);

    loadGtag();
    loadGtag();

    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
