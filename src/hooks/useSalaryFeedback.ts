import { SalaryFeedback, sendSalaryFeedback } from "@/services";

export const useSalaryFeedback = () => {
  const submitFeedback = (
    feedback: SalaryFeedback,
    metadata?: {
      month?: number;
      year?: number;
      calculationType?: "monthly" | "daily";
      hasAllowances?: boolean;
    },
  ) => {
    sendSalaryFeedback(feedback, metadata);
  };

  return { submitFeedback };
};
