import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  callback: null as ((event: AuthChangeEvent, session: Session | null) => void) | null,
}));

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  },
}));

import { AuthProvider } from "@/app/providers/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";

const AuthStateProbe = () => {
  const { user, isLoading } = useAuth();

  return <div>{isLoading ? "loading" : user?.email ?? "signed-out"}</div>;
};

describe("AuthProvider", () => {
  it("loads the existing session and unsubscribes on unmount", async () => {
    const session = {
      user: { email: "worker@example.com" },
    } as Session;

    authMocks.getSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authMocks.callback = callback;
      return { data: { subscription: { unsubscribe: authMocks.unsubscribe } } };
    });

    const { unmount } = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("worker@example.com")).toBeInTheDocument();
    });

    unmount();
    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
