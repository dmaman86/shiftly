import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const authMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  startedFromOAuthCallback: false,
  callback: null as
    ((event: AuthChangeEvent, session: Session | null) => void) | null,
}));

vi.mock("@/services/supabase/supabase.client", () => ({
  get startedFromOAuthCallback() {
    return authMocks.startedFromOAuthCallback;
  },
  supabase: {
    auth: {
      initialize: authMocks.initialize,
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  },
}));

import { AuthProvider } from "@/app/providers/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";

const session = { user: { email: "worker@example.com" } } as Session;

const AuthStateProbe = () => {
  const { user, isLoading, initializationError, signInError } = useAuth();

  return (
    <>
      <div data-testid="user">
        {isLoading ? "loading" : (user?.email ?? "signed-out")}
      </div>
      <div data-testid="sign-in-error">{signInError ?? "none"}</div>
      <div data-testid="initialization-error">
        {initializationError ?? "none"}
      </div>
    </>
  );
};

const renderProvider = (strict = false) => {
  const tree = (
    <AuthProvider>
      <AuthStateProbe />
    </AuthProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

const waitForAuthLoaded = () =>
  waitFor(() =>
    expect(screen.getByTestId("user")).not.toHaveTextContent("loading"),
  );

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.startedFromOAuthCallback = false;
    authMocks.callback = null;
    authMocks.initialize.mockResolvedValue({ error: null });
    authMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authMocks.callback = callback;
      return { data: { subscription: { unsubscribe: authMocks.unsubscribe } } };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the existing session and unsubscribes on unmount", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session }, error: null });

    const { unmount } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent(
        "worker@example.com",
      );
    });

    unmount();
    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("keeps a plain visit without a session in guest mode", async () => {
    renderProvider();

    await waitForAuthLoaded();
    expect(screen.getByTestId("user")).toHaveTextContent("signed-out");
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent("none");
    expect(screen.getByTestId("initialization-error")).toHaveTextContent(
      "none",
    );
  });

  it("establishes the session from a valid OAuth callback", async () => {
    authMocks.startedFromOAuthCallback = true;
    authMocks.getSession.mockResolvedValue({ data: { session }, error: null });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent(
        "worker@example.com",
      );
    });
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent("none");
  });

  it("reports a failed OAuth callback instead of a silent guest visit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.startedFromOAuthCallback = true;
    authMocks.initialize.mockResolvedValue({ error: new Error("Invalid JWT") });

    renderProvider();

    await waitForAuthLoaded();
    expect(screen.getByTestId("user")).toHaveTextContent("signed-out");
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent(
      "Invalid JWT",
    );
    // Guest mode stays usable: this is not a session-loading failure.
    expect(screen.getByTestId("initialization-error")).toHaveTextContent(
      "none",
    );
  });

  it("reports an exception thrown while processing the OAuth callback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.startedFromOAuthCallback = true;
    authMocks.initialize.mockRejectedValue(new Error("Failed to fetch"));

    renderProvider();

    await waitForAuthLoaded();
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent(
      "Failed to fetch",
    );
  });

  it("does not treat an initialization error outside a callback as a sign-in failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.initialize.mockResolvedValue({ error: new Error("Unexpected") });

    renderProvider();

    await waitForAuthLoaded();
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent("none");
  });

  it("clears the sign-in error once a session arrives", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.startedFromOAuthCallback = true;
    authMocks.initialize.mockResolvedValue({ error: new Error("Invalid JWT") });

    renderProvider();
    await waitForAuthLoaded();

    act(() => authMocks.callback?.("SIGNED_IN", session));

    expect(screen.getByTestId("user")).toHaveTextContent("worker@example.com");
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent("none");
  });

  it("signs out when the auth state reports it", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session }, error: null });

    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent(
        "worker@example.com",
      );
    });

    act(() => authMocks.callback?.("SIGNED_OUT", null));

    expect(screen.getByTestId("user")).toHaveTextContent("signed-out");
  });

  it("settles on the latest state under StrictMode double effects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.startedFromOAuthCallback = true;
    authMocks.initialize.mockResolvedValue({ error: new Error("Invalid JWT") });

    renderProvider(true);

    await waitForAuthLoaded();
    expect(screen.getByTestId("user")).toHaveTextContent("signed-out");
    expect(screen.getByTestId("sign-in-error")).toHaveTextContent(
      "Invalid JWT",
    );
    // The first (discarded) effect run must have released its subscription.
    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
