export type SalaryFeedback = "found_issue" | "all_ok" | "not_sure";

export const sendSalaryFeedback = (feedback: SalaryFeedback): void => {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", "salary_calculation_feedback", {
      feedback,
    });
  }
};
