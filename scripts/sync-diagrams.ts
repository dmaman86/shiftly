/**
 * Copies docs/architecture/generated/*.mmd into the reference READMEs, between
 * <!-- diagram:<name> --> and <!-- /diagram:<name> --> markers. The .mmd files
 * are the source of truth; the READMEs embed them because GitHub only renders
 * Mermaid inline.
 *
 * Usage: bun run docs:diagrams        rewrites the READMEs
 *        bun run docs:diagrams:check  fails when a README is out of date (CI)
 */
import { readFile, readdir, writeFile } from "node:fs/promises";

const DIAGRAMS_DIR = new URL(
  "../docs/architecture/generated/",
  import.meta.url,
);
const READMES = ["README.md", "README_HE.md"].map(
  (file) => new URL(`../docs/reference/${file}`, import.meta.url),
);
const checkOnly = process.argv.includes("--check");

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const embedDiagram = (
  document: string,
  name: string,
  diagram: string,
  readmePath: string,
) => {
  const start = `<!-- diagram:${name} -->`;
  const end = `<!-- /diagram:${name} -->`;
  const block = new RegExp(
    `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`,
  );

  if (!block.test(document)) {
    throw new Error(`${readmePath} is missing the ${start} ... ${end} markers`);
  }

  // A replacer function keeps "$" sequences in the diagram from being expanded.
  return document.replace(
    block,
    () => `${start}\n\n\`\`\`mermaid\n${diagram.trim()}\n\`\`\`\n\n${end}`,
  );
};

const diagrams = await Promise.all(
  (await readdir(DIAGRAMS_DIR))
    .filter((file) => file.endsWith(".mmd"))
    .sort()
    .map(async (file) => ({
      name: file.slice(0, -".mmd".length),
      content: await readFile(new URL(file, DIAGRAMS_DIR), "utf8"),
    })),
);

const staleReadmes: string[] = [];

for (const readme of READMES) {
  const current = await readFile(readme, "utf8");
  const synced = diagrams.reduce(
    (document, { name, content }) =>
      embedDiagram(document, name, content, readme.pathname),
    current,
  );

  if (synced === current) continue;
  if (checkOnly) staleReadmes.push(readme.pathname);
  else await writeFile(readme, synced);
}

if (staleReadmes.length > 0) {
  console.error(
    `Diagrams are out of sync in:\n${staleReadmes.join("\n")}\nRun: bun run docs:diagrams`,
  );
  process.exit(1);
}

console.log(
  checkOnly
    ? `Diagrams are in sync (${diagrams.length} diagrams).`
    : `Synced ${diagrams.length} diagrams into ${READMES.length} READMEs.`,
);
