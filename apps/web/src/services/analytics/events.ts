export type SalaryFeedback = "found_issue" | "all_ok" | "not_sure";

export type AnalyticsEvent =
  | {
      name: "salary_calculation_feedback";
      params: {
        feedback: SalaryFeedback;
        month?: number;
        year?: number;
        calculationType?: "monthly" | "daily";
      };
    }
  | {
      name: "exception";
      params: {
        description: string;
        fatal: boolean;
        error_type: string;
        error_context?: string;
      };
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
      name: "shift_deleted";
      params: { month: number; year: number };
    }
  | {
      name: "work_table_pdf_exported";
      params: { month: number; year: number };
    }
  | {
      name: "salary_section_edit_started";
      params: { section_id: string; month: number; year: number };
    }
  | {
      name: "info_dialog_opened";
      params: { dialog: "about" | "disclaimer" | "privacy" };
    }
  | {
      name: "footer_link_clicked";
      params: { target: "github" | "email" };
    }
  | {
      name: "calculation_rules_accordion_expanded";
      params: {
        section: string;
        open_method?: "manual" | "deep_link";
      };
    }
  | {
      name: "calculation_example_link_clicked";
      params: { source: "daily" | "monthly" };
    }
  | {
      name: "calculation_demo_link_clicked";
      params: { source: "daily" | "monthly" };
    }
  | {
      name: "account_deleted";
      params: { provider?: string; account_age_days?: number };
    }
  | {
      name: "profile_history_viewed";
      params: { access: "unlocked" | "locked"; has_records?: boolean };
    }
  | {
      name: "guest_draft_import_resolved";
      params: {
        outcome: "imported" | "replaced" | "kept" | "discarded_after_error";
        shift_count: number;
      };
    };
