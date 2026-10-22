import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { adminRepository } from "./admin-repository.ts";
import { storeCandidates } from "./reference-data/store-candidates.ts";
import { HttpDocumentFetcher } from "./research/http-document-fetcher.ts";
import { WaybackArchiveIndex } from "./research/web-archive.ts";
import { FileDebugArtifactStore } from "./shared/debug-artifacts.ts";
import {
  researchEmployeeContributions,
  type ContributionsResearchReport,
} from "./social-security/contributions-research.ts";
import { CONTRIBUTION_PARAMETERS } from "./social-security/employee-contributions.ts";
import { KolZchutSocialSecuritySource } from "./social-security/kolzchut-source.ts";

/**
 * Researches the employee National Insurance and health insurance parameters
 * from November 2015 to today and prints the coverage of each one. Without
 * --store it is a dry run that writes nothing to the store; with --store the
 * candidates are kept as pending review. Activating them is a separate,
 * human step (reference:activate).
 *
 *   bun run --cwd apps/api reference:research:contributions [--store]
 */
const { values } = parseArgs({
  options: { store: { type: "boolean", default: false } },
  strict: true,
});

const artifactsDir =
  process.env.ARTIFACTS_DIR ??
  fileURLToPath(new URL("../.artifacts", import.meta.url));
const report = await researchEmployeeContributions({
  fetcher: new HttpDocumentFetcher(),
  archive: new WaybackArchiveIndex(),
  kolZchut: new KolZchutSocialSecuritySource(),
  artifacts: new FileDebugArtifactStore(
    join(artifactsDir, "employee-contributions"),
  ),
});

const reportDir = join(artifactsDir, "employee-contributions");
await mkdir(reportDir, { recursive: true });
const reportFile = join(
  reportDir,
  `report-${report.researchedAt.replace(/:/g, "-")}.json`,
);
await writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");
console.log(formatReport(report));
console.log(`\nFull report: ${reportFile}`);

if (!values.store) {
  console.log(
    `Dry run: nothing was stored. Add --store to keep the ${report.candidates.length} candidates for review.`,
  );
} else {
  const outcome = await storeCandidates(adminRepository(), report.candidates);
  console.log(JSON.stringify(outcome, null, 2));
  if (outcome.status === "failed") process.exit(1);
}

function formatReport(report: ContributionsResearchReport): string {
  const lines: string[] = [
    `Window: ${report.timelines.window.from} → ${report.timelines.window.until} (exclusive)`,
    `Archive index: ${report.archive.status === "read" ? `${report.archive.captures} captures` : `unavailable (${report.archive.problem})`}`,
    `Years without an official reading: ${report.yearsWithoutOfficialReading.join(", ") || "none"}`,
    `Secondary source: ${report.secondary}`,
    "",
    "Readings:",
  ];
  report.observations.forEach((observation, index) => {
    const { sources, supportingSource } = observation.provenance;
    lines.push(
      `  #${index} ${observation.observedOn} ${observation.trust}${observation.live ? " (live)" : ""} ${sources[supportingSource].finalUrl}`,
    );
  });
  for (const run of report.runs) {
    for (const attempt of run.result.attempts) {
      if (attempt.outcome === "validated") continue;
      lines.push(
        `  not used (${run.purpose} ${run.year}${run.asOf ? ` as of ${run.asOf}` : ""}): ${attempt.outcome} ${attempt.requestedUrl} ${attempt.problems.join("; ")}`.trimEnd(),
      );
    }
  }
  for (const parameter of CONTRIBUTION_PARAMETERS) {
    lines.push("", parameter);
    const rows = [
      ...report.timelines.periods
        .filter((period) => period.parameter === parameter)
        .map((period) => ({
          from: period.validFrom,
          text: `${period.validFrom} → ${period.validTo ?? "open"}  ${period.trust.padEnd(18)} ${period.value}  readings ${period.observations.map((index) => `#${index}`).join(" ")}`,
        })),
      ...report.timelines.missing
        .filter((gap) => gap.parameter === parameter)
        .map((gap) => ({
          from: gap.validFrom,
          text: `${gap.validFrom} → ${gap.validTo}  missing (${gap.reason})`,
        })),
    ].sort((a, b) => a.from.localeCompare(b.from));
    for (const row of rows) lines.push(`  ${row.text}`);
  }
  if (report.timelines.conflicts.length > 0) {
    lines.push("", "Conflicts:");
    for (const conflict of report.timelines.conflicts) {
      lines.push(
        `  ${conflict.parameter} ${conflict.validFrom} → ${conflict.validTo} ${conflict.between}: ${conflict.values.join(" vs ")}`,
      );
    }
  }
  return lines.join("\n");
}
