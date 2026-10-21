import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileDebugArtifactStore } from "../../src/shared/debug-artifacts.ts";

describe("FileDebugArtifactStore", () => {
  it("writes each run of the same document to its own folder", async () => {
    const root = mkdtempSync(join(tmpdir(), "artifacts-test-"));
    const times = [
      new Date("2026-10-10T18:00:00.000Z"),
      new Date("2026-10-10T19:00:00.000Z"),
    ];
    const store = new FileDebugArtifactStore(root, () => times.shift()!);

    await (await store.forDocument(2026, "abc")).write("error.json", "{}");
    await (await store.forDocument(2026, "abc")).write("result.json", "{}");

    const documentDir = join(root, "2026", "abc");
    const runs = readdirSync(documentDir).sort();
    expect(runs).toEqual([
      "2026-10-10T18-00-00.000Z",
      "2026-10-10T19-00-00.000Z",
    ]);
    expect(readdirSync(join(documentDir, runs[0]))).toEqual(["error.json"]);
    expect(readdirSync(join(documentDir, runs[1]))).toEqual(["result.json"]);
    expect(
      readFileSync(join(documentDir, runs[1], "result.json"), "utf8"),
    ).toBe("{}");
  });
});
