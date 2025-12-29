import { SalaryFeedback, sendSalaryFeedback } from "@/adapters";

export const useSalaryFeedback = () => {
  const submitFeedback = (feedback: SalaryFeedback) => {
    sendSalaryFeedback(feedback);
  };

  return { submitFeedback };
};
