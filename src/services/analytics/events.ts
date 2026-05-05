export type SalaryFeedback = "found_issue" | "all_ok" | "not_sure";

export type AnalyticsEvent =
  | {
      name: "salary_calculation_feedback";
      params: {
        feedback: SalaryFeedback;
        month?: number;
        year?: number;
        calculationType?: "monthly" | "daily";
        hasAllowances?: boolean;
      };
    }
  | {
      name: "exception";
      params: {
        description: string;
        fatal: boolean;
        error_type: string;
      };
    }
  | {
      name: "view_mode_toggled";
      params: { mode: "compact" | "expanded" };
    }
  | {
      name: "salary_summary_viewed";
      params: { month: number; year: number };
    }
  | {
      name: "language_toggled";
      params: { lang: "he" | "en" };
    }
  | {
      name: "page_view";
      params: { page_path: string; lang: "he" | "en" };
    }
  | {
      name: "shift_added";
      params: { month: number; year: number };
    }
  | {
      name: "shift_saved";
      params: { month: number; year: number };
    }
  | {
      name: "shift_deleted";
      params: { month: number; year: number };
    };
