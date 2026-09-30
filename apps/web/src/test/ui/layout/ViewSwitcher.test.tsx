import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ViewSwitcher } from "@/layout/ViewSwitcher";
import type { Direction } from "@/app/providers/direction/directionContext";

type MockDirection = { direction: Direction; setDirection: ReturnType<typeof vi.fn> };

const mockDirection: MockDirection = { direction: "rtl", setDirection: vi.fn() };
const mockAuthState = {
  user: null as { email?: string } | null,
  isLoading: false,
  initializationError: null,
};
const mockSnackbar = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/hooks", () => ({
  useDirection: () => mockDirection,
  useAuth: () => mockAuthState,
  useAppSnackbar: () => mockSnackbar,
  useFetch: () => ({
    loading: false,
    callEndPoint: (endpoint: { call: () => Promise<unknown> }) => endpoint.call(),
    cancelEndPoint: vi.fn(),
  }),
}));

const LocationTracker = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const renderAtPath = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ViewSwitcher />
      <LocationTracker />
    </MemoryRouter>
  );

describe("ViewSwitcher", () => {
  beforeEach(() => {
    mockDirection.direction = "rtl";
    mockAuthState.user = null;
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the app title", () => {
      renderAtPath("/he/daily");
      expect(screen.getByText("Shiftly – ניהול שעות עבודה ושכר")).toBeInTheDocument();
    });

    it("renders daily nav item", () => {
      renderAtPath("/he/daily");
      expect(screen.getAllByText("חישוב יומי").length).toBeGreaterThan(0);
    });

    it("renders monthly nav item", () => {
      renderAtPath("/he/daily");
      expect(screen.getAllByText("חישוב חודשי").length).toBeGreaterThan(0);
    });

    it("renders account and rules nav item", () => {
      renderAtPath("/he/daily");
      expect(screen.getAllByText("חשבון וכללי חישוב").length).toBeGreaterThan(0);
    });

    it("renders language toggle button", () => {
      renderAtPath("/he/daily");
      expect(screen.getByRole("button", { name: "Switch to English" })).toBeInTheDocument();
    });

    it("renders mobile menu button", () => {
      renderAtPath("/he/daily");
      expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    });

    it("renders sign out only when a user is authenticated", () => {
      mockAuthState.user = { email: "worker@example.com" };

      renderAtPath("/he/daily");

      expect(screen.getByRole("link", { name: "חשבון וכללי חישוב" })).toHaveAttribute(
        "href",
        "/he/account-and-rules#account-profile",
      );
      expect(screen.getByRole("button", { name: "התנתקות" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "התחברות" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "הרשמה" })).not.toBeInTheDocument();
    });

    it("links to account and rules without the profile hash when no user is authenticated", () => {
      renderAtPath("/he/daily");

      expect(
        screen.getByRole("link", { name: "חשבון וכללי חישוב" }),
      ).toHaveAttribute("href", "/he/account-and-rules");
    });
  });

  describe("Toggle button label", () => {
    it("shows 'Switch to English' aria-label when direction is rtl", () => {
      mockDirection.direction = "rtl";
      renderAtPath("/he/daily");
      expect(screen.getByRole("button", { name: "Switch to English" })).toBeInTheDocument();
    });

    it("shows hebrew aria-label when direction is ltr", () => {
      mockDirection.direction = "ltr";
      renderAtPath("/en/daily");
      expect(screen.getByRole("button", { name: "עבור לעברית" })).toBeInTheDocument();
    });
  });

  describe("Language toggle navigation", () => {
    it("navigates from /he/daily to /en/daily", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: "Switch to English" }));

      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/en/daily");
      });
    });

    it("navigates from /en/daily to /he/daily", async () => {
      const user = userEvent.setup();
      mockDirection.direction = "ltr";
      renderAtPath("/en/daily");

      await user.click(screen.getByRole("button", { name: "עבור לעברית" }));

      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/he/daily");
      });
    });

    it("preserves the page when toggling language", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/monthly");

      await user.click(screen.getByRole("button", { name: "Switch to English" }));

      await waitFor(() => {
        expect(screen.getByTestId("location").textContent).toBe("/en/monthly");
      });
    });
  });

  describe("Mobile menu", () => {
    it("mobile nav items are hidden initially", () => {
      renderAtPath("/he/daily");
      const menuButtons = screen.getAllByText("חישוב יומי");
      expect(menuButtons).toHaveLength(1);
    });

    it("opens mobile menu on menu button click", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: "Open navigation menu" }));

      await waitFor(() => {
        expect(screen.getAllByText("חישוב יומי")).toHaveLength(2);
      });
    });

    it("closes mobile menu when nav item is clicked", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
      await waitFor(() => expect(screen.getAllByText("חישוב יומי")).toHaveLength(2));

      const mobileLinks = screen.getAllByText("חישוב יומי");
      await user.click(mobileLinks[1]);

      await waitFor(() => {
        expect(screen.getAllByText("חישוב יומי")).toHaveLength(1);
      });
    });
  });
});
