import { parseArgs } from "node:util";
import { z } from "zod";
import { adminRepository } from "./admin-repository.ts";
import {
  israelDate,
  planElectionRecord,
} from "./reference-data/election-record.ts";
import { storeCandidates } from "./reference-data/store-candidates.ts";
import { HttpDocumentFetcher } from "./research/http-document-fetcher.ts";

/**
 * Records one Knesset election from a source an administrator names.
 * Without --store it is a dry run: it fetches the source and prints the
 * candidate, writing nothing. With --store the candidate is kept as pending
 * review; activating it is a separate command (election:activate).
 *
 *   bun run election:record -- --knesset 26 --date 2026-10-27 \
 *     --status occurred --source-url <url> --quote "<passage>" [--store]
 *   ... --manual --note "<why>"   when the source cannot verify the record
 */
const USAGE =
  "usage: election:record --knesset <n> --date <YYYY-MM-DD> --status <planned|confirmed|occurred|cancelled> --source-url <url> [--quote <passage>] [--manual --note <why>] [--store]";

const Args = z
  .object({
    knesset: z.coerce.number().int().positive(),
    date: z.iso.date(),
    status: z.enum(["planned", "confirmed", "occurred", "cancelled"]),
    "source-url": z.url({ protocol: /^https$/ }),
    quote: z.string().trim().min(1).optional(),
    manual: z.boolean().default(false),
    note: z.string().trim().min(1).optional(),
    store: z.boolean().default(false),
  })
  .refine((args) => args.manual === (args.note !== undefined), {
    message: "--manual and --note go together",
  });

const { values } = parseArgs({
  options: {
    knesset: { type: "string" },
    date: { type: "string" },
    status: { type: "string" },
    "source-url": { type: "string" },
    quote: { type: "string" },
    manual: { type: "boolean" },
    note: { type: "string" },
    store: { type: "boolean" },
  },
  strict: true,
});

const parsed = Args.safeParse(values);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`${issue.path.join(".") || "arguments"}: ${issue.message}`);
  }
  console.error(USAGE);
  process.exit(2);
}
const args = parsed.data;

const repository = adminRepository();
const plan = await planElectionRecord(
  {
    knessetNumber: args.knesset,
    date: args.date,
    status: args.status,
    sourceUrl: args["source-url"],
    quote: args.quote ?? null,
    manualNote: args.manual ? (args.note ?? null) : null,
  },
  {
    fetcher: new HttpDocumentFetcher(),
    administration: repository,
    today: israelDate(new Date()),
  },
);
console.log(JSON.stringify(plan, null, 2));

if (plan.status === "rejected") process.exit(1);
if (plan.status === "unchanged") {
  console.log("The active revision already says this; nothing to store.");
} else if (!args.store) {
  console.log(
    "Dry run: nothing was stored. Add --store to keep it for review.",
  );
} else {
  const outcome = await storeCandidates(repository, [plan.candidate]);
  console.log(JSON.stringify(outcome, null, 2));
  if (outcome.status !== "stored") process.exit(1);
  const [stored] = outcome.revisions;
  console.log(
    `Pending review. To activate it: bun run election:activate -- --revision ${stored.id} --reviewer "<name>"`,
  );
}
