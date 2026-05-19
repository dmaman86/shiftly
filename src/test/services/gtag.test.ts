import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { gtagService } from "@/services/analytics/gtag";

describe("gtagService", () => {
  beforeEach(() => {
    vi.stubGlobal("gtag", undefined);
    vi.stubGlobal("dataLayer", undefined);
    document.querySelectorAll('script[src*="googletagmanager"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.querySelectorAll('script[src*="googletagmanager"]').forEach((el) => el.remove());
  });

  describe("load", () => {
    it("does nothing on localhost", () => {
      const spy = vi.spyOn(document.head, "appendChild");
      gtagService.load();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("initializes dataLayer and gtag on non-localhost", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      gtagService.load();
      expect(Array.isArray(window.dataLayer)).toBe(true);
      expect(typeof window.gtag).toBe("function");
    });

    it("injects async GA script when not on localhost", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      const spy = vi.spyOn(document.head, "appendChild");
      gtagService.load();
      expect(spy).toHaveBeenCalledOnce();
      const script = spy.mock.calls[0][0] as HTMLScriptElement;
      expect(script.src).toContain("googletagmanager.com/gtag/js");
      expect(script.async).toBe(true);
      spy.mockRestore();
    });

    it("pushes js and config commands to dataLayer", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      gtagService.load();
      const [jsCall, configCall] = window.dataLayer as unknown[][];
      expect(jsCall[0]).toBe("js");
      expect(jsCall[1]).toBeInstanceOf(Date);
      expect(configCall[0]).toBe("config");
      expect(configCall[1]).toBe("G-G19J1209M6");
    });

    it("is idempotent: second call does nothing if script already loaded", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      const spy = vi.spyOn(document.head, "appendChild");
      gtagService.load();
      gtagService.load();
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });
});
