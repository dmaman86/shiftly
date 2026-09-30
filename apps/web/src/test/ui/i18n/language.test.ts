import { describe, expect, it } from "vitest";
import { resolveLanguageFromPathname } from "@/i18n/language";

describe("resolveLanguageFromPathname", () => {
  it("resolves English after the production base path", () => {
    expect(
      resolveLanguageFromPathname("/shiftly/en/daily", "/shiftly/"),
    ).toBe("en");
  });

  it("resolves Hebrew after the production base path", () => {
    expect(
      resolveLanguageFromPathname("/shiftly/he/daily", "/shiftly/"),
    ).toBe("he");
  });

  it("resolves a language from a router-relative path", () => {
    expect(resolveLanguageFromPathname("/en/monthly", "/")).toBe("en");
  });

  it("uses Hebrew when the route language is unsupported", () => {
    expect(
      resolveLanguageFromPathname("/shiftly/fr/daily", "/shiftly/"),
    ).toBe("he");
  });
});
