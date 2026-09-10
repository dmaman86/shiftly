import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n";

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

const functionsMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
  authState: {
    user: null as {
      app_metadata?: Record<string, unknown>;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } | null,
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
    callEndPoint: (endpoint: { call: () => Promise<unknown> }) =>
      endpoint.call(),
    cancelEndPoint: vi.fn(),
  }),
}));

import { AccountProfileCard } from "@/features/auth/AccountProfileCard";

describe("AccountProfileCard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    hookMocks.authState.user = null;
    hookMocks.authState.isLoading = false;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("does not render without an authenticated user", () => {
    render(<AccountProfileCard />);

    expect(screen.queryByText("👤 Profile")).not.toBeInTheDocument();
  });

  it("shows authenticated user profile data with account removal collapsed", () => {
    hookMocks.authState.user = {
      app_metadata: { provider: "google" },
      email: "worker@example.com",
      user_metadata: { full_name: "Shift Worker" },
    };

    render(<AccountProfileCard defaultExpanded />);

    expect(screen.getByText("👤 Profile")).toBeInTheDocument();
    expect(screen.getByText("Shift Worker")).toBeInTheDocument();
    expect(screen.getAllByText("worker@example.com")).toHaveLength(2);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Account removal")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete account" }),
    ).not.toBeInTheDocument();
  });

  it("deletes the authenticated account after explicit confirmation", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { email: "worker@example.com" };
    functionsMocks.invoke.mockResolvedValue({
      data: { deleted: true },
      error: null,
    });
    authMocks.signOut.mockResolvedValue({ error: null });

    render(<AccountProfileCard defaultExpanded />);

    await user.click(screen.getByRole("button", { name: "Account removal" }));
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const confirmButton = screen.getByRole("button", {
      name: "Delete my account",
    });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(confirmButton);

    expect(functionsMocks.invoke).toHaveBeenCalledWith("delete-account", {
      method: "DELETE",
    });
    expect(authMocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(hookMocks.snackbar.success).toHaveBeenCalledWith(
      "Your account was deleted.",
    );
  });

  it("does not clear the local session when account deletion fails", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { email: "worker@example.com" };
    functionsMocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "Authentication is required" },
    });

    render(<AccountProfileCard defaultExpanded />);

    await user.click(screen.getByRole("button", { name: "Account removal" }));
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(authMocks.signOut).not.toHaveBeenCalled();
    expect(hookMocks.snackbar.error).toHaveBeenCalledWith(
      "Authentication is required",
    );
  });
});
