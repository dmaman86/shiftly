export type SalaryFeedback = "found_issue" | "all_ok" | "not_sure";

export const sendSalaryFeedback = (
  feedback: SalaryFeedback,
  metadata?: {
    month?: number;
    year?: number;
    calculationType?: "monthly" | "daily";
    hasAllowances?: boolean;
  },
): void => {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", "salary_calculation_feedback", {
      feedback,
      event_category: "user_feedback",
      event_label: `${metadata?.calculationType || "unknown"}_calculation`,
      ...metadata,
    });
  }
};
