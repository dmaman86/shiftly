import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173/shiftly/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.PLAYWRIGHT_VIDEO === "on" ? "on" : "off",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /work-table-august-2026-mobile-he\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /work-table-august-2026-mobile-he\.spec\.ts/,
      use: { ...devices["Pixel 10"] },
    },
  ],
  webServer: {
    command: "bun run dev -- --host=127.0.0.1 --port=4173 --strictPort",
    url: "http://127.0.0.1:4173/shiftly/",
    timeout: 180_000,
    env: {
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
    reuseExistingServer: !process.env.CI,
  },
});
