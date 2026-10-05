import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Match the payroll wall-clock contract and Playwright's browser timezone.
process.env.TZ = "Asia/Jerusalem";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    projects: [
      "./packages/domain/vitest.config.ts",
      "./apps/web/vite.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      include: ["packages/domain/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}"],
      exclude: ["**/tests/**", "**/test/**", "**/*.config.ts", "**/*.d.ts"],
    },
  },
});
