import { Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ReferenceIssue } from "@/app";

/**
 * Explains why a month is not calculated: a rate it needs is unavailable.
 * Shown instead of the calculation, never alongside a zero.
 */
export const ReferenceIssueNotice = ({
  issues,
}: {
  issues: readonly ReferenceIssue[];
}) => {
  const { t } = useTranslation("work-table");
  if (issues.length === 0) return null;

  const reasons = new Set(issues.map((issue) => issue.reason));
  return (
    <Alert severity="warning" data-testid="reference-issue">
      {t("reference_issue.message", {
        rates: issues
          .map((issue) => t(`reference_issue.keys.${issue.key}`))
          .join(", "),
      })}{" "}
      {reasons.has("out_of_range")
        ? t("reference_issue.out_of_range")
        : t("reference_issue.not_covered")}
    </Alert>
  );
};
