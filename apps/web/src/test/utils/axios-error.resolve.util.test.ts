import { afterEach, describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import i18n from "@/i18n";
import {
  resolveErrorCategory,
  resolveErrorMessage,
} from "@/utils/axios-error.resolve.util";

afterEach(async () => {
  await i18n.changeLanguage("he");
});

describe("localized request errors", () => {
  it.each(["en", "he"])(
    "resolves cancellation and network errors in %s",
    async (language) => {
      await i18n.changeLanguage(language);
      const cancelled = new AxiosError(
        "internal transport detail",
        "ERR_CANCELED",
      );
      expect(resolveErrorCategory(cancelled)).toBe("cancelled");
      expect(resolveErrorMessage(cancelled)).toBe(
        i18n.t("cancelled", { ns: "errors" }),
      );
      expect(
        resolveErrorMessage(new AxiosError("Network Error", "ERR_NETWORK")),
      ).toBe(i18n.t("network", { ns: "errors" }));
      expect(resolveErrorMessage(null)).toBe(
        i18n.t("unexpected", { ns: "errors" }),
      );
    },
  );
  it("does not render malformed server messages as objects", async () => {
    await i18n.changeLanguage("en");
    expect(
      resolveErrorMessage({
        isAxiosError: true,
        response: { status: 400, data: { message: {} } },
      }),
    ).toBe("Unexpected error");
    expect(
      resolveErrorMessage({
        isAxiosError: true,
        response: { status: 503, data: { message: "private server detail" } },
      }),
    ).toBe(i18n.t("server", { ns: "errors" }));
  });
  it("preserves actionable application errors", () => {
    expect(resolveErrorMessage(new Error("Unable to save the shift"))).toBe(
      "Unable to save the shift",
    );
  });
});
