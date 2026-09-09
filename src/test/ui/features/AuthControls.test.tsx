import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n";

const authMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));

const functionsMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
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
    functions: functionsMocks,
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

  it("deletes the authenticated account after explicit confirmation", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { email: "worker@example.com" };
    functionsMocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    authMocks.signOut.mockResolvedValue({ error: null });

    render(<AuthControls display="account" />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const confirmButton = screen.getByRole("button", { name: "Delete my account" });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(confirmButton);

    expect(functionsMocks.invoke).toHaveBeenCalledWith("delete-account", {
      method: "DELETE",
    });
    expect(authMocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(hookMocks.snackbar.success).toHaveBeenCalledWith("Your account was deleted.");
  });

  it("does not clear the local session when account deletion fails", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { email: "worker@example.com" };
    functionsMocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "Authentication is required" },
    });

    render(<AuthControls display="account" />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(authMocks.signOut).not.toHaveBeenCalled();
    expect(hookMocks.snackbar.error).toHaveBeenCalledWith("Authentication is required");
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
