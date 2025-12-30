import { SalaryFeedback, sendSalaryFeedback } from "@/services";

export const useSalaryFeedback = () => {
  const submitFeedback = (feedback: SalaryFeedback) => {
    sendSalaryFeedback(feedback);
  };

  return { submitFeedback };
};
