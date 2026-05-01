import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

vi.mock("@/services", () => ({
  analyticsService: { track: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks", () => ({
  useGlobalState: () => ({
    globalBreakdown: {},
    baseRate: 100,
    year: 2025,
    month: 1,
  }),
}));

vi.mock("@/features/salary-summary", () => ({
  SummaryHeader: () => <div>SummaryHeader</div>,
  SalaryCardSection: () => <div>SalaryCardSection</div>,
  useMonthlySalarySummary: () => ({
    sections: [],
    updateSections: vi.fn(),
    getMonthLabel: () => "January 2025",
    handleTotalChange: vi.fn(),
    monthlyTotal: 5000,
  }),
}));

vi.mock("@/utils", () => ({
  formatValue: (v: number) => String(v),
}));

import { analyticsService } from "@/services";
import { MonthlySalarySummary } from "@/features/salary-summary/components/MonthlySalarySummary";

const mockDomain = {} as never;

describe("MonthlySalarySummary", () => {
  let observerCallback: (entries: { isIntersecting: boolean }[]) => void;
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "IntersectionObserver",
      function (callback: (entries: { isIntersecting: boolean }[]) => void) {
        observerCallback = callback;
        return { observe: mockObserve, disconnect: mockDisconnect };
      },
    );
  });

  it("tracks salary_summary_viewed when card becomes visible", async () => {
    render(<MonthlySalarySummary domain={mockDomain} />);

    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(analyticsService.track).toHaveBeenCalledWith({
        name: "salary_summary_viewed",
        params: { month: 1, year: 2025 },
      });
    });
  });

  it("does not track when card is not intersecting", async () => {
    render(<MonthlySalarySummary domain={mockDomain} />);

    observerCallback([{ isIntersecting: false }]);

    await waitFor(() => {
      expect(analyticsService.track).not.toHaveBeenCalled();
    });
  });

  it("disconnects observer after tracking", async () => {
    render(<MonthlySalarySummary domain={mockDomain} />);

    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
