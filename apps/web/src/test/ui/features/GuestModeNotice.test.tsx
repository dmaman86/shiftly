import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n";

const authMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
  authState: {
    user: null as { email?: string } | null,
    isLoading: false,
  },
  snackbar: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: { auth: authMocks },
}));

vi.mock("@/hooks", () => ({
  useAuth: () => hookMocks.authState,
  useAppSnackbar: () => hookMocks.snackbar,
  useFetch: () => ({
    loading: false,
    callEndPoint: (endpoint: { call: () => Promise<unknown> }) =>
      endpoint.call(),
    cancelEndPoint: vi.fn(),
  }),
}));

import { GuestModeNotice } from "@/features/auth/GuestModeNotice";

const guestNoticeText =
  "Guest mode: calculations run in real time, but your data is not saved. Sign in for free to keep your shifts in the cloud.";

describe("GuestModeNotice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    hookMocks.authState.user = null;
    hookMocks.authState.isLoading = false;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("tells guests their data is not saved", () => {
    render(<GuestModeNotice />);

    expect(screen.getByText(guestNoticeText)).toBeInTheDocument();
  });

  it("starts Google sign-in from the notice", async () => {
    authMocks.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();

    render(<GuestModeNotice />);
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    // Without this mark the guest's month would be discarded after the redirect.
    expect(
      sessionStorage.getItem("shiftly:guest-draft:pending-import"),
    ).not.toBeNull();
  });

  it("renders nothing for signed-in users", () => {
    hookMocks.authState.user = { email: "user@example.com" };

    const { container } = render(<GuestModeNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while the session is loading", () => {
    hookMocks.authState.isLoading = true;

    const { container } = render(<GuestModeNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
