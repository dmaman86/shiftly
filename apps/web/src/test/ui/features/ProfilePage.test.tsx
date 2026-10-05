import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { domain } from "@/app/domain";
import { monthToPayBreakdownVM } from "@/adapters";
import i18n from "@/i18n";
import { ProfilePage } from "@/pages/ProfilePage";
import type { ProfileMonthSnapshot } from "@/features/profile/helpers/profileHistory";

const history = vi.hoisted(() => ({
  data: undefined as ProfileMonthSnapshot[] | undefined,
  isPending: false,
  isFetching: false,
  isError: false,
  waitingForWrites: false,
  refetch: vi.fn(),
  rangeSpy: vi.fn(),
}));
vi.mock("@/features/profile/hooks/useProfileHistory", () => ({
  useProfileHistory: (range: unknown) => {
    history.rangeSpy(range);
    return history;
  },
}));
const auth = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  isLoading: false,
  initializationError: null as string | null,
}));
vi.mock("@/hooks/useDomain", () => ({ useDomain: () => domain }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/features/auth", () => ({
  AccountProfileCard: ({ defaultExpanded }: { defaultExpanded: boolean }) => (
    <div>
      {defaultExpanded ? "Expanded profile card" : "Collapsed profile card"}
    </div>
  ),
  GuestProfileCard: () => <div>Guest profile card</div>,
}));
// Page tests isolate range application; real picker localization is covered separately.
vi.mock("@mui/x-date-pickers/DatePicker", () => ({
  DatePicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: Date | null;
    onChange: (value: Date | null) => void;
  }) => (
    <input
      aria-label={label}
      type="month"
      value={
        value && !Number.isNaN(value.getTime())
          ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`
          : ""
      }
      onChange={(event) =>
        onChange(
          event.target.value
            ? new Date(`${event.target.value}-01T12:00:00`)
            : null,
        )
      }
    />
  ),
}));

const snapshot = (month: number, baseRate = 40): ProfileMonthSnapshot => {
  const map = domain.payMap.monthPayMapCalculator.createEmpty();
  map.regular.hours100.hours = 80;
  map.regular.hours125.hours = 10;
  map.totalHours = 90;
  return {
    year: 2026,
    month,
    baseRate,
    usesDefaultConfig: false,
    breakdown: monthToPayBreakdownVM(map, 0),
  };
};

describe("ProfilePage", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T12:00:00+03:00"));
    await i18n.changeLanguage("en");
    history.data = [
      snapshot(7),
      snapshot(8, 0),
      { ...snapshot(9), breakdown: null },
    ];
    history.isPending = false;
    history.isFetching = false;
    history.isError = false;
    history.waitingForWrites = false;
    history.refetch.mockReset();
    history.rangeSpy.mockReset();
    auth.user = { id: "user-1" };
    auth.isLoading = false;
    auth.initializationError = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the last six months and shows the applied range for all charts", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("combobox", { name: "Date range" })).toHaveValue(
      "last6",
    );
    expect(history.rangeSpy).toHaveBeenLastCalledWith({
      from: { year: 2026, month: 5 },
      to: { year: 2026, month: 10 },
    });
    expect(
      screen.getByText("All charts: May 2026 – Oct 2026"),
    ).toBeInTheDocument();
  });

  it.each([
    ["last3", { year: 2026, month: 8 }],
    ["last12", { year: 2025, month: 11 }],
    ["year", { year: 2026, month: 1 }],
  ])("applies preset %s to the history query", (preset, from) => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Date range" }), {
      target: { value: preset },
    });
    expect(history.rangeSpy).toHaveBeenLastCalledWith({
      from,
      to: { year: 2026, month: 10 },
    });
    expect(screen.getAllByText("Show exact values")).toHaveLength(3);
  });

  it("keeps custom edits as drafts until Apply and uses both selected endpoints", () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Date range" }), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("From month"), {
      target: { value: "2025-12" },
    });
    fireEvent.change(screen.getByLabelText("To month"), {
      target: { value: "2026-08" },
    });
    expect(history.rangeSpy).toHaveBeenLastCalledWith({
      from: { year: 2026, month: 5 },
      to: { year: 2026, month: 10 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply range" }));
    expect(history.rangeSpy).toHaveBeenLastCalledWith({
      from: { year: 2025, month: 12 },
      to: { year: 2026, month: 8 },
    });
    expect(
      screen.getByText("All charts: Dec 2025 – Aug 2026"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /Aug 2026.*partial/ }),
    ).not.toBeInTheDocument();
  });

  it("rejects reversed, future, unsupported and empty custom month inputs without changing the applied query", () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Date range" }), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("From month"), {
      target: { value: "2026-10" },
    });
    fireEvent.change(screen.getByLabelText("To month"), {
      target: { value: "2026-08" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("must not be after");
    expect(screen.getByRole("button", { name: "Apply range" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("To month"), {
      target: { value: "2026-11" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "through the current month",
    );
    fireEvent.change(screen.getByLabelText("To month"), {
      target: { value: "2026-10" },
    });
    fireEvent.change(screen.getByLabelText("From month"), {
      target: { value: "2015-10" },
    });
    expect(screen.getByRole("button", { name: "Apply range" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("From month"), {
      target: { value: "" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select a valid start and end month",
    );
    expect(history.rangeSpy).toHaveBeenLastCalledWith({
      from: { year: 2026, month: 5 },
      to: { year: 2026, month: 10 },
    });
  });

  it("renders the expanded account card and all three charts with accessible exact values", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Expanded profile card")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Actual Hrs vs Payable Hrs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Base Hours vs Overtime Hours" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Total Payment Composition" }),
    ).toBeInTheDocument();
    const chart = screen.getByRole("region", {
      name: "Total Payment Composition",
    });
    fireEvent.click(within(chart).getByText("Show exact values"));
    // jsdom does not toggle details on click, so inspect its semantic table directly.
    const table = within(chart).getByRole("table", {
      name: "Total Payment Composition",
      hidden: true,
    });
    expect(table).toHaveTextContent("₪3,200.00");
    expect(table).toHaveTextContent("₪500.00");
    expect(table).toHaveTextContent("₪3,700.00");
    expect(table).toHaveTextContent("Hourly rate not set");
    expect(table).toHaveTextContent("No saved records");
  });

  it("does not show incomplete or stale charts while loading", () => {
    history.isFetching = true;
    render(<ProfilePage />);
    expect(
      screen.getByRole("progressbar", { name: "Loading your history..." }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Total Payment Composition" }),
    ).not.toBeInTheDocument();
  });

  it("offers retry on failure instead of displaying old totals", () => {
    history.isError = true;
    render(<ProfilePage />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your history could not be loaded",
    );
    expect(
      screen.queryByRole("heading", { name: "Total Payment Composition" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(history.refetch).toHaveBeenCalledOnce();
  });

  it("explains empty history and missing historical settings", () => {
    history.data = [{ ...snapshot(7), breakdown: null }];
    const view = render(<ProfilePage />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No saved records were found",
    );
    history.data = [{ ...snapshot(7, 0), usesDefaultConfig: true }];
    view.rerender(<ProfilePage />);
    expect(screen.getByRole("alert")).toHaveTextContent("no saved settings");
  });

  it("renders Hebrew chart labels and distinguishes zero values from missing records", async () => {
    history.data = [
      {
        ...snapshot(7),
        breakdown: monthToPayBreakdownVM(
          domain.payMap.monthPayMapCalculator.createEmpty(),
          0,
        ),
      },
    ];
    await act(async () => {
      await i18n.changeLanguage("he");
    });
    render(<ProfilePage />);
    expect(
      screen.getByRole("heading", { name: "שעות בפועל מול שעות לתשלום" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /שעות בפועל: 0$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("אין נתונים שמורים")).not.toBeInTheDocument();
  });

  describe("guest", () => {
    beforeEach(() => {
      auth.user = null;
    });

    it("shows the guest card, a disabled range and locked charts without querying history", () => {
      render(<ProfilePage />);
      expect(screen.getByText("Guest profile card")).toBeInTheDocument();
      expect(
        screen.queryByText("Expanded profile card"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: "Date range" }),
      ).toBeDisabled();
      for (const title of [
        "Actual Hrs vs Payable Hrs",
        "Base Hours vs Overtime Hours",
        "Total Payment Composition",
      ]) {
        expect(
          within(screen.getByRole("region", { name: title })).getByText(
            "Sign in with Google to see this chart.",
          ),
        ).toBeInTheDocument();
      }
      expect(screen.queryByText("Show exact values")).not.toBeInTheDocument();
      expect(history.rangeSpy).not.toHaveBeenCalled();
    });

    it("waits for authentication before choosing the guest or account view", () => {
      auth.isLoading = true;
      render(<ProfilePage />);
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.queryByText("Guest profile card")).not.toBeInTheDocument();
      expect(history.rangeSpy).not.toHaveBeenCalled();
    });

    it("shows the initialization error instead of a guest view", () => {
      auth.initializationError = "Session failed";
      render(<ProfilePage />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("Guest profile card")).not.toBeInTheDocument();
    });

    it("replaces account history with the locked view on sign-out", () => {
      auth.user = { id: "user-1" };
      const view = render(<ProfilePage />);
      expect(screen.getByText("Expanded profile card")).toBeInTheDocument();
      auth.user = null;
      view.rerender(<ProfilePage />);
      expect(screen.getByText("Guest profile card")).toBeInTheDocument();
      expect(screen.queryByText("Show exact values")).not.toBeInTheDocument();
    });
  });
});
