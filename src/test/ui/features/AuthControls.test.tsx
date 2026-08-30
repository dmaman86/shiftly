import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n";

const authMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
  authState: {
    user: null as { email?: string } | null,
    isLoading: false,
    initializationError: null as string | null,
  },
  snackbar: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: {
    auth: authMocks,
  },
}));

vi.mock("@/hooks", () => ({
  useAuth: () => hookMocks.authState,
  useAppSnackbar: () => hookMocks.snackbar,
  useFetch: () => ({
    loading: false,
    callEndPoint: (endpoint: { call: () => Promise<unknown> }) => endpoint.call(),
    cancelEndPoint: vi.fn(),
  }),
}));

import { AuthControls } from "@/features/auth/AuthControls";

describe("AuthControls", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    hookMocks.authState.user = null;
    hookMocks.authState.isLoading = false;
    hookMocks.authState.initializationError = null;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("starts the Google OAuth flow", async () => {
    const user = userEvent.setup();
    authMocks.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/o/oauth2/..." },
      error: null,
    });

    render(<AuthControls />);

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    expect(hookMocks.snackbar.error).not.toHaveBeenCalled();
  });

  it("shows an error when the OAuth flow fails to start", async () => {
    const user = userEvent.setup();
    authMocks.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: null },
      error: { message: "Provider is not enabled" },
    });

    render(<AuthControls />);

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(hookMocks.snackbar.error).toHaveBeenCalledWith("Provider is not enabled");
  });

  it("shows the current user and signs out", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { email: "worker@example.com" };
    authMocks.signOut.mockResolvedValue({ error: null });

    render(<AuthControls display="account" />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(authMocks.signOut).toHaveBeenCalledOnce();
    expect(hookMocks.snackbar.success).toHaveBeenCalledWith("You are signed out.");
  });

  it("hides page authentication controls from signed-in users", () => {
    hookMocks.authState.user = { email: "worker@example.com" };

    render(<AuthControls />);

    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });
});
