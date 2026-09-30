import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    name: "domain",
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    sequence: { groupOrder: 0 },
  },
});
