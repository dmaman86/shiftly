import type { ResearchSpec } from "../../src/research/research-pipeline.ts";
import { incomeTaxResearchTask } from "../../src/research/income-tax/research-task.ts";
import {
  validateIncomeTaxResearch,
  type IncomeTaxResearchValues,
} from "../../src/research/income-tax/research-validation.ts";

/** Regression fixture for the document pipeline still used by NI/Health, not an executable tax path. */
export const INCOME_TAX_RESEARCH: ResearchSpec<IncomeTaxResearchValues> = {
  knownSources: (year) =>
    year >= 2022
      ? [
          `https://www.gov.il/BlobFolder/generalpage/income-tax-monthly-deductions-booklet/he/generalInformation_income-tax-monthly-deductions-booklet_monthly-deductions-booklet-${year}.pdf`,
        ]
      : [],
  discoverySubject:
    "the Israel Tax Authority monthly income tax deductions booklet (לוח ניכויים חודשי / לוח עזר לחישוב מס הכנסה ממשכורת), which states the monthly income tax brackets and the monthly credit point value (נקודת זיכוי)",
  pageKeywords: ["מדרגות", "נקודת זיכוי"],
  task: incomeTaxResearchTask,
  validate: validateIncomeTaxResearch,
};
