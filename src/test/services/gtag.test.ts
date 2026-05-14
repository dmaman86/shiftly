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

  describe("initConsentMode", () => {
    it("does nothing on localhost", () => {
      gtagService.initConsentMode();
      expect(window.gtag).toBeUndefined();
      expect(window.dataLayer).toBeUndefined();
    });

    it("initializes dataLayer and gtag on non-localhost", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      gtagService.initConsentMode();
      expect(Array.isArray(window.dataLayer)).toBe(true);
      expect(typeof window.gtag).toBe("function");
    });

    it("sets consent default to denied", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      gtagService.initConsentMode();
      const [consentCall] = window.dataLayer as unknown[][];
      expect(consentCall[0]).toBe("consent");
      expect(consentCall[1]).toBe("default");
      expect(consentCall[2]).toMatchObject({
        analytics_storage: "denied",
        ads_storage: "denied",
      });
    });
  });

  describe("load", () => {
    it("does nothing on localhost", () => {
      const spy = vi.spyOn(document.head, "appendChild");
      gtagService.load();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
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
      gtagService.initConsentMode();
      window.dataLayer = [];
      gtagService.load();
      expect(window.dataLayer).toHaveLength(2);
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

  describe("grantConsent", () => {
    it("pushes consent update to dataLayer", () => {
      vi.stubGlobal("location", { hostname: "dmaman86.github.io" });
      gtagService.initConsentMode();
      window.dataLayer = [];
      gtagService.grantConsent();
      expect(window.dataLayer).toHaveLength(1);
      const [consentCall] = window.dataLayer as unknown[][];
      expect(consentCall[0]).toBe("consent");
      expect(consentCall[1]).toBe("update");
      expect(consentCall[2]).toMatchObject({ analytics_storage: "granted" });
    });

    it("does nothing if window.gtag is undefined", () => {
      expect(() => gtagService.grantConsent()).not.toThrow();
    });
  });
});
