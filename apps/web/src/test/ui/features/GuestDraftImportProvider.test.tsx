import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n";
import { WorkDayStatus } from "@shiftly/domain";
import type { GuestDraft } from "@/services/guestDraft";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as { id: string } | null,
    isLoading: false,
  },
  selectMonth: vi.fn(),
  snackbar: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  track: vi.fn(),
  importMonth: vi.fn(),
  fetchShifts: vi.fn(),
  fetchDays: vi.fn(),
}));

vi.mock("@/services/supabase/supabase.client", () => ({ supabase: {} }));

vi.mock("@/hooks", () => ({
  useAuth: () => mocks.authState,
  useAppSnackbar: () => mocks.snackbar,
  useGlobalState: () => ({ selectMonth: mocks.selectMonth }),
  useDomain: () => ({
    services: {
      dateService: {
        getDatesRange: () => ({ startDate: "2026-08-01", endDate: "2026-09-01" }),
      },
    },
  }),
  useFetch: () => ({
    loading: false,
    callEndPoint: (endpoint: { call: () => Promise<unknown> }) => endpoint.call(),
    cancelEndPoint: vi.fn(),
  }),
}));

vi.mock("@/services", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services")>()),
  analyticsService: { track: mocks.track },
  guestDraftService: () => ({ importMonth: () => ({ call: mocks.importMonth }) }),
  shiftService: () => ({ fetchForMonth: () => ({ call: mocks.fetchShifts }) }),
  workDayService: () => ({ fetchForMonth: () => ({ call: mocks.fetchDays }) }),
}));

import { GuestDraftImportProvider } from "@/features/guest-draft/GuestDraftImportProvider";
import { useGuestDraftImportGate } from "@/features/guest-draft/guestDraftImportContext";

const DRAFT_KEY = "shiftly:guest-draft";
const PENDING_IMPORT_KEY = "shiftly:guest-draft:pending-import";

const draft: GuestDraft = {
  version: 1,
  savedAt: new Date().toISOString(),
  year: 2026,
  month: 8,
  config: { standardHours: 6.67, baseRate: 45.5 },
  days: [{ date: "2026-08-10", status: WorkDayStatus.vacation }],
  shifts: [
    {
      id: "guest-shift",
      date: "2026-08-03",
      start_time: "2026-08-03T05:00:00.000Z",
      end_time: "2026-08-03T14:00:00.000Z",
      is_duty: false,
    },
  ],
};

const GateProbe = () => {
  const { ready } = useGuestDraftImportGate();
  return <div data-testid="gate">{ready ? "ready" : "blocked"}</div>;
};

const renderProvider = (initialDraft: GuestDraft | null = draft) =>
  render(
    <GuestDraftImportProvider initialDraft={initialDraft}>
      <GateProbe />
    </GuestDraftImportProvider>,
  );

const savedMonth = (shiftCount: number) => {
  mocks.fetchShifts.mockResolvedValue({
    data: Array.from({ length: shiftCount }, (_, index) => ({ id: `saved-${index}` })),
  });
  mocks.fetchDays.mockResolvedValue({ data: [] });
};

describe("GuestDraftImportProvider", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    sessionStorage.clear();
    vi.clearAllMocks();
    mocks.authState.user = { id: "user-1" };
    mocks.authState.isLoading = false;
    mocks.importMonth.mockResolvedValue({ data: null });
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("opens the gate immediately when there is no pending draft", () => {
    renderProvider(null);

    expect(screen.getByTestId("gate")).toHaveTextContent("ready");
    expect(mocks.fetchShifts).not.toHaveBeenCalled();
  });

  it("keeps hydration blocked while auth is loading", () => {
    mocks.authState.isLoading = true;

    renderProvider();

    expect(screen.getByTestId("gate")).toHaveTextContent("blocked");
    expect(mocks.fetchShifts).not.toHaveBeenCalled();
  });

  it("ignores the draft when the sign-in did not complete", () => {
    mocks.authState.user = null;

    renderProvider();

    expect(screen.getByTestId("gate")).toHaveTextContent("ready");
    expect(mocks.selectMonth).not.toHaveBeenCalled();
    expect(mocks.importMonth).not.toHaveBeenCalled();
  });

  it("imports into an empty month without asking", async () => {
    savedMonth(0);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("gate")).toHaveTextContent("ready"));
    expect(mocks.selectMonth).toHaveBeenCalledWith(2026, 8);
    expect(mocks.importMonth).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.snackbar.success).toHaveBeenCalled();
    expect(mocks.track).toHaveBeenCalledWith({
      name: "guest_draft_import_resolved",
      params: { outcome: "imported", shift_count: 1 },
    });
  });

  it("asks before replacing saved data and keeps it when chosen", async () => {
    savedMonth(3);
    const user = userEvent.setup();

    renderProvider();

    expect(
      await screen.findByText("You already have saved data for August 2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Saved: 3 shifts · Entered as guest: 1 shifts/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("gate")).toHaveTextContent("blocked");

    await user.click(screen.getByRole("button", { name: "Keep saved data" }));

    expect(mocks.importMonth).not.toHaveBeenCalled();
    expect(screen.getByTestId("gate")).toHaveTextContent("ready");
    expect(mocks.track).toHaveBeenCalledWith({
      name: "guest_draft_import_resolved",
      params: { outcome: "kept", shift_count: 1 },
    });
  });

  it("replaces saved data when chosen", async () => {
    savedMonth(3);
    const user = userEvent.setup();

    renderProvider();
    await user.click(
      await screen.findByRole("button", { name: "Replace with guest data" }),
    );

    await waitFor(() => expect(screen.getByTestId("gate")).toHaveTextContent("ready"));
    expect(mocks.importMonth).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledWith({
      name: "guest_draft_import_resolved",
      params: { outcome: "replaced", shift_count: 1 },
    });
  });

  it("keeps the draft after a failed import and lets the user retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    savedMonth(0);
    mocks.importMonth.mockResolvedValueOnce({ error: "network down" });
    const user = userEvent.setup();

    renderProvider();

    expect(
      await screen.findByText("Your guest shifts were not saved"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("gate")).toHaveTextContent("blocked");
    // Put back so a reload retries instead of losing the guest's work.
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(PENDING_IMPORT_KEY)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(screen.getByTestId("gate")).toHaveTextContent("ready"));
    expect(mocks.importMonth).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("discards the draft after a failure when the user gives up", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetchShifts.mockResolvedValue({ error: "network down" });
    mocks.fetchDays.mockResolvedValue({ data: [] });
    const user = userEvent.setup();

    renderProvider();
    await user.click(
      await screen.findByRole("button", { name: "Discard guest shifts" }),
    );

    expect(screen.getByTestId("gate")).toHaveTextContent("ready");
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(mocks.importMonth).not.toHaveBeenCalled();
  });
});
