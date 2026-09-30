import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "@/app/routes/AppRoutes";

vi.mock("@/i18n", () => ({
  default: { changeLanguage: vi.fn() },
}));

vi.mock("@/hooks", () => ({
  useDomain: () => ({}),
  useDirection: () => ({ direction: "rtl", setDirection: vi.fn() }),
  usePageTracking: () => {},
}));

vi.mock("@/app/routes/LanguageLayout", async () => {
  const { Outlet } = await import("react-router-dom");
  return { LanguageLayout: () => <Outlet /> };
});

vi.mock("@/pages/DailyPage", () => ({
  DailyPage: () => <div>Daily Page</div>,
}));
vi.mock("@/pages/MonthlySummaryPage", () => ({
  MonthlySummaryPage: () => <div>Monthly Page</div>,
}));
vi.mock("@/pages/CalculationRulesPage", () => ({
  CalculationRulesPage: () => <div>Calculation Rules Page</div>,
}));

const LocationTracker = () => {
  const { hash, pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search + hash}</div>;
};

const renderAtPath = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationTracker />
    </MemoryRouter>
  );

describe("AppRoutes", () => {
  describe("Redirects", () => {
    it("redirects root / to /he/daily", async () => {
      renderAtPath("/");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/he/daily");
      });
    });

    it("preserves query parameters and hash when redirecting root", async () => {
      renderAtPath("/?utm_source=github&utm_medium=readme#demo");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe(
          "/he/daily?utm_source=github&utm_medium=readme#demo",
        );
      });
    });

    it("redirects unknown page within /he to /he/daily", async () => {
      renderAtPath("/he/unknown-page");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/he/daily");
      });
    });

    it("redirects unknown page within /en to /en/daily", async () => {
      renderAtPath("/en/unknown-page");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/en/daily");
      });
    });

    it("preserves query parameters when redirecting an unknown page", async () => {
      renderAtPath("/en/unknown-page?utm_source=cv&utm_medium=pdf");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe(
          "/en/daily?utm_source=cv&utm_medium=pdf",
        );
      });
    });
  });

  describe("Valid routes", () => {
    it("renders DailyPage at /he/daily", async () => {
      renderAtPath("/he/daily");
      await waitFor(() => {
        expect(screen.getByText("Daily Page")).toBeInTheDocument();
      });
    });

    it("renders MonthlySummaryPage at /he/monthly", async () => {
      renderAtPath("/he/monthly");
      await waitFor(() => {
        expect(screen.getByText("Monthly Page")).toBeInTheDocument();
      });
    });

    it("redirects legacy calculation rules route to daily", async () => {
      renderAtPath("/he/calculation-rules");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/he/daily");
      });
    });

    it("renders CalculationRulesPage at /he/account-and-rules", async () => {
      renderAtPath("/he/account-and-rules");
      await waitFor(() => {
        expect(screen.getByText("Calculation Rules Page")).toBeInTheDocument();
      });
    });

    it("renders DailyPage at /en/daily", async () => {
      renderAtPath("/en/daily");
      await waitFor(() => {
        expect(screen.getByText("Daily Page")).toBeInTheDocument();
      });
    });
  });
});
