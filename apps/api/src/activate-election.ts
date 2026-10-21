import { parseArgs } from "node:util";
import { z } from "zod";
import { adminRepository } from "./admin-repository.ts";
import { checkElectionActivation } from "./reference-data/election-activation.ts";

/**
 * Activates one pending Knesset election revision after review. The revision
 * it replaces (same subject) is superseded in the same transaction.
 *
 *   bun run election:activate -- --revision <id> --reviewer "<name>"
 */
const USAGE = 'usage: election:activate --revision <uuid> --reviewer "<name>"';

const Args = z.object({
  revision: z.uuid(),
  reviewer: z.string().trim().min(1),
});

const { values } = parseArgs({
  options: {
    revision: { type: "string" },
    reviewer: { type: "string" },
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
const { revision: id, reviewer } = parsed.data;

const repository = adminRepository();
const check = checkElectionActivation(id, await repository.findRevision(id));
if (!check.ok) {
  console.error(check.problem);
  process.exit(1);
}
const { revision } = check;

const replacing = await repository.findActiveSubject(
  revision.kind,
  revision.subjectKey,
);
console.log(JSON.stringify({ activating: revision, replacing }, null, 2));

await repository.activate(id, reviewer);
const active = await repository.findActiveSubject(
  revision.kind,
  revision.subjectKey,
);
if (active?.id !== id) {
  console.error(
    `Activation did not take effect: ${revision.subjectKey} is still ${active?.id ?? "inactive"}`,
  );
  process.exit(1);
}
console.log(
  `Activated ${revision.subjectKey}. GET /reference/elections serves it within 5 minutes (server cache).`,
);
