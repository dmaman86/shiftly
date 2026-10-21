import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import {
  legacySeedCandidates,
  type KnessetElection,
} from "./reference-data/legacy-seed.ts";
import { storeCandidates } from "./reference-data/store-candidates.ts";
import { SupabaseRevisionRepository } from "./reference-data/supabase-revision-repository.ts";

// Same lookup as server.ts: the first file that defines a variable wins.
loadDotenv({
  path: [
    fileURLToPath(new URL("../.env", import.meta.url)),
    fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  ],
  quiet: true,
});

const ELECTIONS_FILE = new URL(
  "../../../scripts/data/knesset-elections.json",
  import.meta.url,
);

const SeedEnv = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const ElectionsRegistry = z.object({
  elections: z.array(
    z.object({
      knessetNumber: z.number().int().positive(),
      date: z.iso.date(),
    }),
  ),
});

const parsedEnv = SeedEnv.safeParse(process.env);
if (!parsedEnv.success) {
  // Names only: never print the values.
  const missing = parsedEnv.error.issues.map((issue) => issue.path.join("."));
  console.error(
    `Invalid or missing environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const { elections }: { elections: KnessetElection[] } = ElectionsRegistry.parse(
  JSON.parse(await readFile(ELECTIONS_FILE, "utf8")),
);

const repository = new SupabaseRevisionRepository({
  url: parsedEnv.data.SUPABASE_URL,
  secretKey: parsedEnv.data.SUPABASE_SECRET_KEY,
});

// Stored as pending review; storing again returns the same revisions.
const outcome = await storeCandidates(
  repository,
  legacySeedCandidates(elections),
);
console.log(JSON.stringify(outcome, null, 2));
if (outcome.status === "failed") process.exit(1);
