// Compares the election days a deployed apps/api publishes with the legacy
// static calendar (apps/web/public/calendar), year by year, before the static
// election source is removed.
//
//   node scripts/check-election-parity.ts https://<api-host>
//
// Compares date and Knesset number only: the legacy calendar has no status.
import { readFile } from "node:fs/promises";

type Identity = { date: string; knessetNumber: number };

const FIRST_YEAR = 2015;

const baseUrl = process.argv[2]?.replace(/\/+$/, "");
if (!baseUrl) {
  console.error("Usage: node scripts/check-election-parity.ts <api-base-url>");
  process.exit(2);
}

const key = ({ date, knessetNumber }: Identity) => `${date}#${knessetNumber}`;

const legacyElections = async (year: number): Promise<Identity[]> => {
  const file = new URL(
    `../apps/web/public/calendar/${year}.json`,
    import.meta.url,
  );
  const calendar = JSON.parse(await readFile(file, "utf8")) as {
    items: (Identity & { category: string; subcat?: string })[];
  };
  return calendar.items
    .filter((item) => item.category === "election" && item.subcat === "knesset")
    .map(({ date, knessetNumber }) => ({ date, knessetNumber }));
};

const publishedElections = async (year: number): Promise<Identity[]> => {
  const response = await fetch(`${baseUrl}/reference/elections?year=${year}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${year}: HTTP ${response.status}`);
  const body = (await response.json()) as {
    year: number;
    elections: Identity[];
  };
  if (body.year !== year) throw new Error(`${year}: answered for ${body.year}`);
  return body.elections.map(({ date, knessetNumber }) => ({
    date,
    knessetNumber,
  }));
};

const lastYear = new Date().getUTCFullYear() + 1;
let mismatches = 0;

for (let year = FIRST_YEAR; year <= lastYear; year++) {
  const [legacy, published] = await Promise.all([
    legacyElections(year),
    publishedElections(year),
  ]);
  const legacyKeys = legacy.map(key).sort();
  const publishedKeys = published.map(key).sort();
  const same = JSON.stringify(legacyKeys) === JSON.stringify(publishedKeys);
  if (!same) mismatches++;
  console.log(
    `${same ? "ok  " : "DIFF"} ${year}  legacy=[${legacyKeys.join(", ")}]  api=[${publishedKeys.join(", ")}]`,
  );
}

console.log(
  mismatches === 0
    ? `PARITY OK: ${lastYear - FIRST_YEAR + 1} years`
    : `PARITY FAILED: ${mismatches} year(s) differ`,
);
process.exit(mismatches === 0 ? 0 : 1);
