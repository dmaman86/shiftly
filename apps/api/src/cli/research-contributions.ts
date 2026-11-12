import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { adminRepository } from "./admin-repository.ts";
import { loadArtifactsDir } from "../config/env.ts";
import { loadLocalEnvFiles } from "../config/local-env.ts";
import { storeCandidates } from "../services/store-candidates.ts";
import { HttpDocumentFetcher } from "../research/http-document-fetcher.ts";
import { WaybackArchiveIndex } from "../research/web-archive.ts";
import { FileDebugArtifactStore } from "../research/shared/debug-artifacts.ts";
import {
  researchEmployeeContributions,
  type ContributionsResearchReport,
} from "../research/social-security/contributions-research.ts";
import { CONTRIBUTION_PARAMETERS } from "../research/social-security/employee-contributions.ts";
import { KolZchutSocialSecuritySource } from "../research/social-security/kolzchut-source.ts";

const readingsOf = (
  report: ContributionsResearchReport,
  evidence: readonly number[],
): string => {
  const readings = new Set(
    evidence.flatMap((index) =>
      report.evidence[index].quotes.map(({ reading }) => reading),
    ),
  );
  return [...readings]
    .sort((a, b) => a - b)
    .map((reading) => `#${reading}`)
    .join(" ");
};

const formatReport = (report: ContributionsResearchReport): string => {
  const lines: string[] = [
    `Window: ${report.timelines.window.from} → ${report.timelines.window.until} (exclusive)`,
    `Archive index: ${report.archive.status === "read" ? `${report.archive.captures} captures` : `unavailable (${report.archive.problem})`}`,
    `Secondary source: ${report.secondary}`,
    "",
    "Readings:",
  ];
  report.readings.forEach((reading, index) => {
    const { sources, supportingSource } = reading.provenance;
    lines.push(
      `  #${index} ${reading.observedOn} ${reading.trust} ${reading.label} ${sources[supportingSource].finalUrl}`,
    );
  });
  for (const run of report.runs) {
    for (const attempt of run.result.attempts) {
      if (attempt.outcome === "validated") continue;
      lines.push(
        `  not used (${run.label}): ${attempt.outcome} ${attempt.requestedUrl} ${attempt.problems.join("; ")}`.trimEnd(),
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
          text: `${period.validFrom} → ${period.validTo ?? "open"}  ${period.trust.padEnd(18)} ${period.value}  readings ${readingsOf(report, period.evidence)}${period.trust === "official_derived" ? "  (not stored)" : ""}`,
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
};

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

// Before reading ARTIFACTS_DIR: the env files may set it.
loadLocalEnvFiles();
const artifactsDir = loadArtifactsDir();
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
