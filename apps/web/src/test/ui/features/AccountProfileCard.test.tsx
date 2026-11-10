import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n";

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
  authState: {
    user: null as {
      id?: string;
      app_metadata?: Record<string, unknown>;
      created_at?: string;
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
  },
}));

vi.mock("@/services/api/client", () => ({
  apiClient: apiMocks,
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

vi.mock("@/services/analytics", () => ({
  analyticsService: { track: vi.fn() },
}));

import { AccountProfileCard } from "@/features/auth/AccountProfileCard";
import { analyticsService } from "@/services/analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

const confirmAccountDeletion = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getByRole("button", { name: "Account removal" }));
  await user.click(screen.getByRole("button", { name: "Delete account" }));
  await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
  await user.click(screen.getByRole("button", { name: "Delete my account" }));
};

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
      id: "user-1",
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
    hookMocks.authState.user = { id: "user-1", email: "worker@example.com" };
    apiMocks.request.mockResolvedValue({ data: null });
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

    expect(apiMocks.request).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/me/account",
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(authMocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(hookMocks.snackbar.success).toHaveBeenCalledWith(
      "Your account was deleted.",
    );
  });

  it("tracks the deletion with provider and account age, without identity", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = {
      id: "user-1",
      app_metadata: { provider: "google" },
      created_at: new Date(Date.now() - 10 * DAY_MS - 1000).toISOString(),
      email: "worker@example.com",
    };
    apiMocks.request.mockResolvedValue({ data: null });
    authMocks.signOut.mockResolvedValue({ error: null });

    render(<AccountProfileCard defaultExpanded />);
    await confirmAccountDeletion(user);

    expect(analyticsService.track).toHaveBeenCalledExactlyOnceWith({
      name: "account_deleted",
      params: { provider: "google", account_age_days: 10 },
    });
  });

  it("tracks the deletion even when the local sign-out fails afterwards", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { id: "user-1", email: "worker@example.com" };
    apiMocks.request.mockResolvedValue({ data: null });
    authMocks.signOut.mockResolvedValue({ error: { message: "offline" } });

    render(<AccountProfileCard defaultExpanded />);
    await confirmAccountDeletion(user);

    expect(hookMocks.snackbar.warning).toHaveBeenCalled();
    expect(analyticsService.track).toHaveBeenCalledExactlyOnceWith({
      name: "account_deleted",
      params: { provider: undefined, account_age_days: undefined },
    });
  });

  it("does not clear the local session when account deletion fails", async () => {
    const user = userEvent.setup();
    hookMocks.authState.user = { id: "user-1", email: "worker@example.com" };
    apiMocks.request.mockResolvedValue({ error: "unauthenticated" });

    render(<AccountProfileCard defaultExpanded />);

    await user.click(screen.getByRole("button", { name: "Account removal" }));
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(authMocks.signOut).not.toHaveBeenCalled();
    // The API's error code; translating these codes is left to the web cleanup.
    expect(hookMocks.snackbar.error).toHaveBeenCalledWith("unauthenticated");
    expect(analyticsService.track).not.toHaveBeenCalled();
  });
});
