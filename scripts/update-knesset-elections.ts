import { writeFile } from "node:fs/promises";
import {
  REGISTRY_FILE,
  prepareCalendars,
  readRegistry,
  reconcileElection,
} from "./knesset-elections.ts";
import {
  articleUrl,
  electionFields,
  electionTitle,
  extractWikipediaElection,
  fetchElectionPage,
} from "./wikipedia-elections.ts";

const main = async () => {
  const registry = await readRegistry();
  const latest = registry.elections.at(-1)!;
  const page = await fetchElectionPage(latest.knessetNumber);
  if (!page) throw new Error("Registered election article is missing");
  const announced = extractWikipediaElection(
    page.wikitext,
    latest.knessetNumber,
  );
  if (!announced)
    throw new Error("Registered election no longer has an exact date");
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let elections = reconcileElection(registry.elections, announced, today);
  const evidence = [page];
  const nextLink = electionFields(page.wikitext).get("מערכת בחירות הבאה");
  if (nextLink) {
    const nextNumber = latest.knessetNumber + 1;
    const nextTitle = electionTitle(nextNumber);
    const links = [...nextLink.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)];
    if (
      links.length !== 1 ||
      links[0][1].replaceAll("_", " ").trim() !== nextTitle
    )
      throw new Error("Unexpected next-election article link");
    const nextPage = await fetchElectionPage(nextNumber);
    if (nextPage) {
      const nextElection = extractWikipediaElection(
        nextPage.wikitext,
        nextNumber,
      );
      if (nextElection) {
        elections = reconcileElection(elections, nextElection, today);
        evidence.push(nextPage);
      } else
        console.log(`Knesset ${nextNumber}: no exact election date published`);
    } else console.log(`Knesset ${nextNumber}: article does not exist yet`);
  }
  const changes = await prepareCalendars(elections);
  const changed =
    JSON.stringify(elections) !== JSON.stringify(registry.elections);
  if (changed)
    await writeFile(
      REGISTRY_FILE,
      `${JSON.stringify({ ...registry, upcomingSource: articleUrl(electionTitle(elections.at(-1)!.knessetNumber)), elections }, null, 2)}\n`,
    );
  for (const change of changes) await writeFile(change.file, change.content);
  console.log(
    changed
      ? `Updated electoral registry through Knesset ${elections.at(-1)!.knessetNumber}`
      : "No election changes detected",
  );
  for (const source of evidence)
    console.log(
      `Source: https://he.wikipedia.org/w/index.php?oldid=${source.revisionId} (${source.revisionTimestamp})`,
    );
};

main().catch((error: unknown) => {
  console.error(
    "Election update failed. No pull request should be created; inspect the workflow logs.",
  );
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
