import type { SourceDocument } from "../shared/source.ts";

export interface SocialSecuritySourceProvider {
  /**
   * The text listing what is deducted from an employee's salary for National
   * Insurance and health insurance, as it read on `at`, with every figure
   * resolved to the value in effect on that date.
   */
  employeeContributionsAt(at: Date): Promise<SourceDocument>;
}
