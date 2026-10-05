import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ViewSwitcher } from "@/layout/view-switcher";
import { NAV_MENU_INTRO_KEY } from "@/layout/view-switcher/helpers";
import type { Direction } from "@/app/providers/direction/directionContext";

type MockDirection = {
  direction: Direction;
  setDirection: ReturnType<typeof vi.fn>;
};

const mockDirection: MockDirection = {
  direction: "rtl",
  setDirection: vi.fn(),
};
const mockAuthState = {
  user: null as { email?: string } | null,
  isLoading: false,
  initializationError: null as string | null,
};
const mockDevice = { isMobile: false, breakpointSpy: vi.fn() };
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
  useDeviceType: (mobileBelow: string) => {
    mockDevice.breakpointSpy(mobileBelow);
    return { isMobile: mockDevice.isMobile, isDesktop: !mockDevice.isMobile };
  },
  useAppSnackbar: () => mockSnackbar,
  useFetch: () => ({
    loading: false,
    callEndPoint: (endpoint: { call: () => Promise<unknown> }) =>
      endpoint.call(),
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
    </MemoryRouter>,
  );

const openMenuLabel = "פתיחת תפריט הניווט";
const closeMenuLabel = "סגירת תפריט הניווט";

describe("ViewSwitcher", () => {
  beforeEach(() => {
    mockDirection.direction = "rtl";
    mockAuthState.user = null;
    mockAuthState.isLoading = false;
    mockAuthState.initializationError = null;
    mockDevice.isMobile = false;
    vi.clearAllMocks();
  });

  it("collapses the header below the md breakpoint", () => {
    renderAtPath("/he/daily");
    expect(mockDevice.breakpointSpy).toHaveBeenCalledWith("md");
  });

  describe("Desktop", () => {
    it("renders the title, every page link inside the main navigation and the language toggle", () => {
      renderAtPath("/he/daily");
      expect(
        screen.getByText("Shiftly – ניהול שעות עבודה ושכר"),
      ).toBeInTheDocument();
      const nav = screen.getByRole("navigation", { name: "ניווט ראשי" });
      expect(
        within(nav).getByRole("link", { name: "חישוב יומי" }),
      ).toHaveAttribute("href", "/he/daily");
      expect(
        within(nav).getByRole("link", { name: "חישוב חודשי" }),
      ).toHaveAttribute("href", "/he/monthly");
      expect(
        within(nav).getByRole("link", { name: "כללי חישוב" }),
      ).toHaveAttribute("href", "/he/calculation-rules");
      expect(
        screen.getByRole("button", { name: "Switch to English" }),
      ).toBeInTheDocument();
    });

    it("does not mount the mobile menu", () => {
      renderAtPath("/he/daily");
      expect(
        screen.queryByRole("button", { name: openMenuLabel }),
      ).not.toBeInTheDocument();
    });

    it("renders sign out only when a user is authenticated", () => {
      mockAuthState.user = { email: "worker@example.com" };

      renderAtPath("/he/daily");

      expect(screen.getByRole("link", { name: "הפרופיל שלי" })).toHaveAttribute(
        "href",
        "/he/profile",
      );
      expect(
        screen.getByRole("button", { name: "התנתקות" }),
      ).toBeInTheDocument();
    });

    it("links guests to the public profile", () => {
      renderAtPath("/he/daily");
      expect(screen.getByRole("link", { name: "הפרופיל שלי" })).toHaveAttribute(
        "href",
        "/he/profile",
      );
      expect(
        screen.queryByRole("button", { name: "התנתקות" }),
      ).not.toBeInTheDocument();
    });

    it("does not expose profile navigation while authentication is initializing", () => {
      mockAuthState.user = { email: "worker@example.com" };
      mockAuthState.isLoading = true;
      renderAtPath("/he/daily");
      expect(
        screen.queryByRole("link", { name: "הפרופיל שלי" }),
      ).not.toBeInTheDocument();
    });

    it("does not expose profile navigation when authentication initialization fails", () => {
      mockAuthState.initializationError = "Session failed";
      renderAtPath("/he/daily");
      expect(
        screen.queryByRole("link", { name: "הפרופיל שלי" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Language toggle", () => {
    it("labels the toggle in the target language", () => {
      mockDirection.direction = "ltr";
      renderAtPath("/en/daily");
      expect(
        screen.getByRole("button", { name: "עבור לעברית" }),
      ).toBeInTheDocument();
    });

    it.each([
      ["rtl", "/he/daily", "Switch to English", "/en/daily"],
      ["ltr", "/en/daily", "עבור לעברית", "/he/daily"],
      ["rtl", "/he/monthly", "Switch to English", "/en/monthly"],
    ] as const)(
      "keeps the page when toggling from %s at %s",
      async (direction, from, label, to) => {
        mockDirection.direction = direction;
        const user = userEvent.setup();
        renderAtPath(from);

        await user.click(screen.getByRole("button", { name: label }));

        await waitFor(() =>
          expect(screen.getByTestId("location").textContent).toBe(to),
        );
      },
    );
  });

  describe("Mobile first visit", () => {
    beforeEach(() => {
      mockDevice.isMobile = true;
      localStorage.removeItem(NAV_MENU_INTRO_KEY);
    });

    it("starts expanded so new visitors discover the other pages, then remembers it was seen", () => {
      const view = renderAtPath("/he/daily");
      expect(
        screen.getByRole("button", { name: closeMenuLabel }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(
        within(
          screen.getByRole("navigation", { name: "ניווט ראשי" }),
        ).getAllByRole("link"),
      ).toHaveLength(4);
      expect(localStorage.getItem(NAV_MENU_INTRO_KEY)).not.toBeNull();

      view.unmount();
      renderAtPath("/he/daily");
      expect(
        screen.getByRole("button", { name: openMenuLabel }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    it("starts collapsed when storage is unavailable", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const getItem = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("blocked");
        });
      try {
        renderAtPath("/he/daily");
        expect(
          screen.getByRole("button", { name: openMenuLabel }),
        ).toHaveAttribute("aria-expanded", "false");
      } finally {
        getItem.mockRestore();
        warn.mockRestore();
      }
    });
  });

  describe("Mobile", () => {
    beforeEach(() => {
      mockDevice.isMobile = true;
      localStorage.setItem(NAV_MENU_INTRO_KEY, "1");
    });

    it("starts collapsed with the menu state exposed to assistive technology", () => {
      renderAtPath("/he/daily");
      const menuButton = screen.getByRole("button", { name: openMenuLabel });
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
      expect(menuButton).not.toHaveAttribute("aria-controls");
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "חישוב יומי" }),
      ).not.toBeInTheDocument();
    });

    it("opens a labelled navigation controlled by the menu button", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: openMenuLabel }));

      const menuButton = screen.getByRole("button", { name: closeMenuLabel });
      expect(menuButton).toHaveAttribute("aria-expanded", "true");
      const nav = screen.getByRole("navigation", { name: "ניווט ראשי" });
      expect(menuButton).toHaveAttribute("aria-controls", nav.id);
      expect(within(nav).getAllByRole("link")).toHaveLength(4);
    });

    it("closes from the same button", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: openMenuLabel }));
      await user.click(screen.getByRole("button", { name: closeMenuLabel }));

      await waitFor(() =>
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: openMenuLabel }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    it("closes after navigating to a page", async () => {
      mockAuthState.user = { email: "worker@example.com" };
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: openMenuLabel }));
      await user.click(screen.getByRole("link", { name: "הפרופיל שלי" }));

      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent("/he/profile"),
      );
      await waitFor(() =>
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument(),
      );
    });

    it("closes when the language changes", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/daily");

      await user.click(screen.getByRole("button", { name: openMenuLabel }));
      await user.click(
        screen.getByRole("button", { name: "Switch to English" }),
      );

      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent("/en/daily"),
      );
      await waitFor(() =>
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument(),
      );
    });

    it("closes when returning home through the title", async () => {
      const user = userEvent.setup();
      renderAtPath("/he/monthly");

      await user.click(screen.getByRole("button", { name: openMenuLabel }));
      await user.click(
        screen.getByRole("link", { name: "Shiftly – ניהול שעות עבודה ושכר" }),
      );

      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent("/he/daily"),
      );
      await waitFor(() =>
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument(),
      );
    });
  });
});
