import { expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import "@/i18n";

expect.extend(matchers);

// Tests never reach a real API: a local .env must not change the calendar
// source. Tests that exercise the API stub their own base URL.
beforeEach(() => {
  vi.stubEnv("VITE_API_URL", "");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
