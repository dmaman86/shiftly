import { readdirSync, readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Production runs the sources with Node's type stripping, which rejects
 * TypeScript that needs a transform (parameter properties, enums, namespaces).
 * Vitest and tsc accept that syntax, so this test applies Node's own rules.
 */
const srcDir = join(import.meta.dirname, "../src");
const sources = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts"))
  .sort();

describe("runtime syntax", () => {
  it("finds the sources", () => {
    expect(sources).toContain("server.ts");
  });

  it.each(sources)("%s runs under Node type stripping", (file) => {
    const code = readFileSync(join(srcDir, file), "utf8");
    expect(() => stripTypeScriptTypes(code, { mode: "strip" })).not.toThrow();
  });
});
