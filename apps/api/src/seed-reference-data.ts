import { readFile } from "node:fs/promises";
import { z } from "zod";
import { adminRepository } from "./admin-repository.ts";
import {
  legacySeedCandidates,
  type KnessetElection,
} from "./reference-data/legacy-seed.ts";
import { storeCandidates } from "./reference-data/store-candidates.ts";

const ELECTIONS_FILE = new URL(
  "../../../scripts/data/knesset-elections.json",
  import.meta.url,
);

const ElectionsRegistry = z.object({
  elections: z.array(
    z.object({
      knessetNumber: z.number().int().positive(),
      date: z.iso.date(),
    }),
  ),
});

const repository = adminRepository();

const { elections }: { elections: KnessetElection[] } = ElectionsRegistry.parse(
  JSON.parse(await readFile(ELECTIONS_FILE, "utf8")),
);

// Stored as pending review; storing again returns the same revisions.
const outcome = await storeCandidates(
  repository,
  legacySeedCandidates(elections),
);
console.log(JSON.stringify(outcome, null, 2));
if (outcome.status === "failed") process.exit(1);
