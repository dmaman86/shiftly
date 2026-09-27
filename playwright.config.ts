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
  // Desktop specs run once; mobile specs run on one Android (Chromium) and one
  // iPhone (WebKit) profile to catch engine-specific touch/picker/layout issues.
  // The full-month entry flow runs on Android only: headless WebKit on Linux CI
  // needs several minutes for it, and the month results do not depend on the
  // engine. WebKit still covers the same controls through the smaller specs.
  projects: [
    {
      name: "desktop",
      testDir: "./e2e/desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "android",
      testDir: "./e2e/mobile",
      use: { ...devices["Pixel 10"] },
    },
    {
      name: "iphone",
      testDir: "./e2e/mobile",
      testIgnore: /work-table-month\.spec\.ts/,
      use: { ...devices["iPhone 15"] },
    },
  ],
  webServer: {
    // CI tests the prebuilt ./dist (the deployed artifact); locally the dev server avoids a rebuild.
    command: process.env.CI
      ? "bun run preview -- --host=127.0.0.1 --port=4173 --strictPort"
      : "bun run dev -- --host=127.0.0.1 --port=4173 --strictPort",
    url: "http://127.0.0.1:4173/shiftly/",
    timeout: 180_000,
    env: {
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
    reuseExistingServer: !process.env.CI,
  },
});
