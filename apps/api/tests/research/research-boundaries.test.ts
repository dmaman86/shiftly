import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const srcDir = join(import.meta.dirname, "../../src");
const offlineDir = join(import.meta.dirname, "offline");
const filesIn = (directory: string) =>
  readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .sort();

const inspect = (path: string) => {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports: string[] = [];
  let callsFetch = false;
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node)) {
      const target = node.expression;
      if (
        (target.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(target) && target.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        imports.push(node.arguments[0].text);
      if (
        (ts.isIdentifier(target) && target.text === "fetch") ||
        (ts.isPropertyAccessExpression(target) && target.name.text === "fetch")
      )
        callsFetch = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { imports, callsFetch };
};

describe("research dependency boundaries", () => {
  it("keeps production imports independent of test-only historical validators", () => {
    for (const file of filesIn(srcDir)) {
      for (const reference of inspect(join(srcDir, file)).imports) {
        if (!reference.startsWith(".")) continue;
        const target = resolve(dirname(join(srcDir, file)), reference);
        expect(target, `${file}: ${reference}`).not.toMatch(
          /\/(?:tests|offline)\//,
        );
      }
    }
  });
  it("has exactly one production model adapter and no legacy extraction/discovery pipeline", () => {
    const sources = filesIn(srcDir);
    const sdkConsumers = sources.filter((file) =>
      inspect(join(srcDir, file)).imports.includes("@google/genai"),
    );
    expect(sdkConsumers).toEqual([
      "research/google-grounded-research-provider.ts",
    ]);
    for (const retired of [
      "research/research-pipeline.ts",
      "research/shared/gemma-extractor.ts",
      "research/shared/mediawiki-client.ts",
      "research/web-archive.ts",
      "research/candidate-provenance.ts",
    ])
      expect(sources).not.toContain(retired);
  });
  it("preserves the manual-election document and quote-verification dependencies", () => {
    const sources = filesIn(srcDir);
    expect(inspect(join(srcDir, "cli/record-election.ts")).imports).toContain(
      "../research/http-document-fetcher.ts",
    );
    for (const needed of [
      "research/http-document-fetcher.ts",
      "research/document-text.ts",
      "research/evidence.ts",
    ])
      expect(sources).toContain(needed);
  });
  it("keeps historical regression helpers offline without model or network transports", () => {
    const fixtures = filesIn(offlineDir);
    expect(fixtures.length).toBeGreaterThan(0);
    for (const file of fixtures) {
      const inspected = inspect(join(offlineDir, file));
      expect(inspected.callsFetch, file).toBe(false);
      for (const reference of inspected.imports)
        expect(reference, file).not.toMatch(
          /@google|axios|undici|node:(?:http|https|net|child_process)/,
        );
    }
  });
});
