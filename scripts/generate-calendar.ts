/**
 * Generates apps/web/public/calendar/{year}.json from Hebcal so the app never depends
 * on Hebcal at runtime. Jewish holidays are deterministic, so the output only
 * needs regenerating when the year range is extended.
 *
 * Hebcal holiday items are merged with the verified Knesset election registry.
 * Classification stays in the app's adapter; regeneration preserves elections.
 *
 * Usage: bun run calendar:generate
 */
import { mkdir, writeFile } from "node:fs/promises";

import { buildHebcalUrl } from "../apps/web/src/services/hebcal/hebcal.request.ts";
import { mergeElectionItems, readRegistry } from "./knesset-elections.ts";

// Must stay aligned with SYSTEM_START_YEAR in apps/web/src/app/constants/ui.constant.ts.
const FIRST_YEAR = 2015;
const LAST_YEAR = 2040;
const OUTPUT_DIR = new URL("../apps/web/public/calendar/", import.meta.url);

interface CalendarItem {
  date: string;
  title: string;
  category: string;
  subcat?: string;
  yomtov?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toCalendarItem = (value: unknown): CalendarItem | undefined => {
  if (!isRecord(value) || value.category !== "holiday") return undefined;
  const { date, title, category, subcat, yomtov } = value;
  if (typeof date !== "string" || typeof title !== "string") {
    throw new Error(`Unexpected Hebcal item: ${JSON.stringify(value)}`);
  }
  return {
    date,
    title,
    category,
    ...(typeof subcat === "string" && { subcat }),
    ...(typeof yomtov === "boolean" && { yomtov }),
  };
};

const fetchYear = async (year: number): Promise<CalendarItem[]> => {
  const response = await fetch(
    buildHebcalUrl(`${year}-01-01`, `${year}-12-31`),
  );
  if (!response.ok) {
    throw new Error(
      `Hebcal request for ${year} failed with status ${response.status}`,
    );
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error(
      `Invalid Hebcal response for ${year}: items must be an array`,
    );
  }

  return payload.items
    .map(toCalendarItem)
    .filter((item): item is CalendarItem => item !== undefined);
};

const main = async () => {
  const { elections } = await readRegistry();
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const items = mergeElectionItems(await fetchYear(year), elections, year);
    const file = new URL(`${year}.json`, OUTPUT_DIR);
    await writeFile(file, `${JSON.stringify({ items }, null, 2)}\n`);
    console.log(`calendar ${year}: ${items.length} holiday items`);
  }
};

await main();
