import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    name: "api",
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Exercise the current domain source without requiring a domain build.
    alias: {
      "@shiftly/domain": fileURLToPath(
        new URL("../../packages/domain/src/index.ts", import.meta.url),
      ),
    },
  },
});
