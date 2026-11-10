import { afterAll, beforeAll, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { resolveApiErrorMessage, resolveErrorMessage } from "@/utils";

describe("resolveApiErrorMessage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it.each([
    ["unauthenticated", "Your session has expired. Please sign in again."],
    [
      "session_changed",
      "You are now signed in with a different account. Reload the page to continue.",
    ],
    [
      "data_unavailable",
      "Your data is temporarily unavailable. Please try again in a moment.",
    ],
    ["not_found", "This item no longer exists. Reload the page and try again."],
    ["network", "Could not connect. Please try again."],
    ["aborted", "The request was cancelled."],
    [
      "internal_error",
      "The server could not complete the request. Please try again.",
    ],
    [
      "http_502",
      "The server could not complete the request. Please try again.",
    ],
  ])("shows %s as a message", (code, message) => {
    expect(resolveApiErrorMessage(code)).toBe(message);
  });

  it.each(["Unable to save the shift", "constructor", "toString", "http_5"])(
    "keeps %s, which is not an API code, as is",
    (text) => {
      expect(resolveApiErrorMessage(text)).toBe(text);
    },
  );

  it("is what hooks show when they rethrow an API error", () => {
    expect(resolveErrorMessage(new Error("data_unavailable"))).toBe(
      "Your data is temporarily unavailable. Please try again in a moment.",
    );
  });

  it("shows the message in Hebrew when the app is in Hebrew", async () => {
    await i18n.changeLanguage("he");
    expect(resolveApiErrorMessage("session_changed")).toBe(
      "אתה מחובר כעת לחשבון אחר. רענן את הדף כדי להמשיך.",
    );
    await i18n.changeLanguage("en");
  });
});
