import { readFile, writeFile } from "node:fs/promises";

export const REGISTRY_FILE = new URL(
  "./data/knesset-elections.json",
  import.meta.url,
);
export const CALENDAR_DIR = new URL(
  "../apps/web/public/calendar/",
  import.meta.url,
);
export const FIRST_YEAR = 2015;
export const LAST_YEAR = 2040;

export interface Election {
  knessetNumber: number;
  date: string;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseElection = (value: unknown): Election => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.knessetNumber) ||
    typeof value.knessetNumber !== "number" ||
    value.knessetNumber < 1 ||
    typeof value.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
  ) {
    throw new Error("Invalid Knesset election record");
  }
  const parsed = new Date(`${value.date}T00:00:00Z`);
  const year = Number(value.date.slice(0, 4));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value.date ||
    year < FIRST_YEAR ||
    year > LAST_YEAR
  ) {
    throw new Error("Invalid election date or calendar coverage exceeded");
  }
  return { knessetNumber: value.knessetNumber, date: value.date };
};

export const readRegistry = async () => {
  const payload: unknown = JSON.parse(await readFile(REGISTRY_FILE, "utf8"));
  if (
    !isRecord(payload) ||
    typeof payload.historicalSource !== "string" ||
    typeof payload.upcomingSource !== "string" ||
    !payload.upcomingSource.startsWith(
      "https://he.wikipedia.org/wiki/הבחירות_לכנסת_",
    ) ||
    !Array.isArray(payload.elections) ||
    payload.elections.length === 0
  ) {
    throw new Error("Invalid electoral registry");
  }
  const elections = payload.elections.map(parseElection);
  for (let i = 1; i < elections.length; i++) {
    if (
      elections[i].knessetNumber !== elections[i - 1].knessetNumber + 1 ||
      elections[i].date <= elections[i - 1].date
    ) {
      throw new Error(
        "Electoral registry must have consecutive numbers and increasing dates",
      );
    }
  }
  return {
    historicalSource: payload.historicalSource,
    upcomingSource: payload.upcomingSource,
    elections,
  };
};

export const electionItems = (elections: readonly Election[], year: number) =>
  elections
    .filter((election) => election.date.startsWith(`${year}-`))
    .map((election) => ({
      date: election.date,
      title: "Knesset Election Day",
      category: "election",
      subcat: "knesset",
      knessetNumber: election.knessetNumber,
    }));

export const mergeElectionItems = (
  items: unknown[],
  elections: readonly Election[],
  year: number,
) => {
  const retained = items
    .map((item) => {
      if (
        !isRecord(item) ||
        typeof item.date !== "string" ||
        !item.date.startsWith(`${year}-`)
      ) {
        throw new Error(`Invalid calendar item for ${year}`);
      }
      return item;
    })
    .filter(
      (item) => !(item.category === "election" && item.subcat === "knesset"),
    );
  return [...retained, ...electionItems(elections, year)].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
};

// Prepare every file before writing anything: malformed input must not cause partial updates.
export const prepareCalendars = async (elections: readonly Election[]) => {
  const changes: { file: URL; content: string }[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const file = new URL(`${year}.json`, CALENDAR_DIR);
    const original = await readFile(file, "utf8");
    const payload: unknown = JSON.parse(original);
    if (!isRecord(payload) || !Array.isArray(payload.items))
      throw new Error(`Invalid calendar ${year}`);
    const content = `${JSON.stringify({ ...payload, items: mergeElectionItems(payload.items, elections, year) }, null, 2)}\n`;
    if (content !== original) changes.push({ file, content });
  }
  return changes;
};

export const syncCalendars = async () => {
  const registry = await readRegistry();
  const changes = await prepareCalendars(registry.elections);
  for (const change of changes) await writeFile(change.file, change.content);
  console.log(`Updated ${changes.length} calendar files`);
};

export const reconcileElection = (
  known: readonly Election[],
  announced: Election,
  today: string,
): Election[] => {
  const latest = known.at(-1);
  if (!latest) throw new Error("Election registry is empty");
  const existing = known.find(
    (entry) => entry.knessetNumber === announced.knessetNumber,
  );
  if (existing?.date === announced.date) return [...known];
  if (
    announced.knessetNumber < latest.knessetNumber ||
    announced.knessetNumber > latest.knessetNumber + 1 ||
    announced.date <= today ||
    (existing && existing.date < today) ||
    (!existing && announced.date <= latest.date) ||
    known.some(
      (entry) =>
        entry.knessetNumber < announced.knessetNumber &&
        entry.date >= announced.date,
    )
  ) {
    throw new Error("Election change requires manual investigation");
  }
  return [
    ...known.filter((entry) => entry.knessetNumber !== announced.knessetNumber),
    announced,
  ];
};
