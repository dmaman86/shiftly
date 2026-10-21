import { parseArgs } from "node:util";
import { z } from "zod";
import { adminRepository } from "./admin-repository.ts";
import { checkTimelineActivation } from "./reference-data/timeline-activation.ts";

/**
 * Activates one pending timeline revision (a value with a period and no
 * subject, such as a rate) after review. Active revisions it overlaps are
 * closed or superseded in the same transaction (activate_reference_revision).
 *
 *   bun run reference:activate -- --revision <id> --reviewer "<name>"
 */
const USAGE = 'usage: reference:activate --revision <uuid> --reviewer "<name>"';

const Args = z.object({
  revision: z.uuid(),
  reviewer: z.string().trim().min(1),
});

function readArgs(): Record<string, unknown> {
  try {
    return parseArgs({
      options: {
        revision: { type: "string" },
        reviewer: { type: "string" },
      },
      strict: true,
    }).values;
  } catch (error) {
    // Unknown options, or an option without its value.
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    process.exit(2);
  }
}

const parsed = Args.safeParse(readArgs());
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`${issue.path.join(".") || "arguments"}: ${issue.message}`);
  }
  console.error(USAGE);
  process.exit(2);
}
const { revision: id, reviewer } = parsed.data;

const repository = adminRepository();
const check = checkTimelineActivation(id, await repository.findRevision(id));
if (!check.ok) {
  console.error(check.problem);
  process.exit(1);
}
const { kind, validFrom, validTo, value, trust } = check.revision;

const activeOnStart = await repository.findActive(kind, validFrom);
console.log(
  JSON.stringify(
    {
      activating: { id, kind, validFrom, validTo, value, trust },
      activeOnValidFrom: activeOnStart,
    },
    null,
    2,
  ),
);

await repository.activate(id, reviewer);
const after = await repository.findRevision(id);
if (after?.status !== "active") {
  console.error(
    `Activation did not take effect: revision ${id} is ${after?.status ?? "missing"}`,
  );
  process.exit(1);
}
console.log(`Activated ${kind} from ${validFrom}.`);
