// Reports where the rate timelines a deployed apps/api publishes differ from
// the app's embedded baseline, month by month. Diagnostic only: production may
// hold newer or corrected values, so a difference is not a failure.
//
//   node scripts/diff-reference-timelines.ts https://<api-host>
//
// Exits 1 only when the API cannot be read or its timelines are invalid.
import {
  BASELINE_REFERENCE_TIMELINES,
  createReferenceResolver,
  SYSTEM_START_DATE,
  type ReferenceKey,
  type ReferenceTimelines,
} from "@shiftly/domain";

type Published = {
  "per_diem.point_rate": {
    validFrom: string;
    validTo: string | null;
    value: { amount: number };
  }[];
  "meal_allowance.rates": {
    validFrom: string;
    validTo: string | null;
    value: { small: number; large: number };
  }[];
};

const baseUrl = process.argv[2]?.replace(/\/+$/, "");
if (!baseUrl) {
  console.error(
    "Usage: node scripts/diff-reference-timelines.ts <api-base-url>",
  );
  process.exit(2);
}

const response = await fetch(
  `${baseUrl}/reference/timelines?kinds=per_diem.point_rate,meal_allowance.rates`,
  { signal: AbortSignal.timeout(15_000) },
);
if (!response.ok) {
  console.error(`GET /reference/timelines: HTTP ${response.status}`);
  process.exit(1);
}
const { timelines } = (await response.json()) as { timelines: Published };

const publishedTimelines: ReferenceTimelines = {
  perDiemPointRate: timelines["per_diem.point_rate"].map((entry) => ({
    ...entry,
    value: entry.value.amount,
  })),
  mealAllowanceRates: timelines["meal_allowance.rates"],
};
const published = createReferenceResolver(publishedTimelines);
const baseline = createReferenceResolver(BASELINE_REFERENCE_TIMELINES);

const KEYS: ReferenceKey[] = ["perDiemPointRate", "mealAllowanceRates"];
const lastYear = new Date().getUTCFullYear() + 1;
const describe = (resolution: ReturnType<typeof published.resolve>) =>
  resolution.status === "resolved"
    ? JSON.stringify(resolution.value)
    : `unavailable (${resolution.reason})`;

let differences = 0;
let months = 0;
for (
  let year = Number(SYSTEM_START_DATE.slice(0, 4));
  year <= lastYear;
  year++
) {
  for (let month = 1; month <= 12; month++) {
    const on = `${year}-${String(month).padStart(2, "0")}-01`;
    if (on < SYSTEM_START_DATE) continue;
    months++;
    for (const key of KEYS) {
      const fromApi = describe(published.resolve(key, on));
      const fromBaseline = describe(baseline.resolve(key, on));
      if (fromApi !== fromBaseline) {
        differences++;
        console.log(
          `${on} ${key}: published ${fromApi}, baseline ${fromBaseline}`,
        );
      }
    }
  }
}

console.log(
  differences === 0
    ? `Published timelines match the baseline for ${months} months (${SYSTEM_START_DATE} to ${lastYear}-12).`
    : `${differences} difference(s) over ${months} months. Review them; they are not failures by themselves.`,
);
