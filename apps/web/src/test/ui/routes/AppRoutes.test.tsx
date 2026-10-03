import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "@/app/routes/AppRoutes";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  initializationError: null as string | null,
}));

vi.mock("@/i18n", () => ({
  default: { changeLanguage: vi.fn() },
}));

vi.mock("@/hooks", () => ({
  useDomain: () => ({}),
  useDirection: () => ({ direction: "rtl", setDirection: vi.fn() }),
  usePageTracking: () => {},
  useAuth: () => auth,
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
vi.mock("@/pages/ProfilePage", () => ({
  ProfilePage: () => <div>Profile Page</div>,
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
  beforeEach(() => {
    auth.user = null;
    auth.isLoading = false;
    auth.initializationError = null;
  });

  describe("Protected profile", () => {
    it("redirects a guest direct URL to calculation rules in the same language", async () => {
      renderAtPath("/en/profile?utm_source=test");
      await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/en/calculation-rules?utm_source=test"));
      expect(screen.queryByText("Profile Page")).not.toBeInTheDocument();
    });

    it("waits for authentication before redirecting or mounting the profile", () => {
      auth.isLoading = true;
      renderAtPath("/he/profile");
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByTestId("location")).toHaveTextContent("/he/profile");
      expect(screen.queryByText("Profile Page")).not.toBeInTheDocument();
    });

    it("does not mount the profile when authentication initialization fails", () => {
      auth.initializationError = "Session failed";
      renderAtPath("/he/profile");
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("Profile Page")).not.toBeInTheDocument();
    });

    it("renders the profile for an authenticated user", async () => {
      auth.user = { id: "user-1" };
      renderAtPath("/en/profile");
      expect(await screen.findByText("Profile Page")).toBeInTheDocument();
    });

    it("preserves search parameters and section hashes on the public rules route", async () => {
      renderAtPath("/he/calculation-rules?utm_source=test#interactive-example");
      expect(await screen.findByText("Calculation Rules Page")).toBeInTheDocument();
      expect(screen.getByTestId("location")).toHaveTextContent("/he/calculation-rules?utm_source=test#interactive-example");
    });

    it("removes profile content on logout", async () => {
      auth.user = { id: "user-1" };
      const view = renderAtPath("/he/profile");
      expect(await screen.findByText("Profile Page")).toBeInTheDocument();
      auth.user = null;
      view.rerender(<MemoryRouter initialEntries={["/he/profile"]}><AppRoutes /><LocationTracker /></MemoryRouter>);
      expect(await screen.findByText("Calculation Rules Page")).toBeInTheDocument();
      expect(screen.queryByText("Profile Page")).not.toBeInTheDocument();
    });
  });
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

    it("redirects the removed account and rules route to daily", async () => {
      renderAtPath("/he/account-and-rules");
      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/he/daily");
      });
    });

    it("renders CalculationRulesPage at /he/calculation-rules", async () => {
      renderAtPath("/he/calculation-rules");
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
