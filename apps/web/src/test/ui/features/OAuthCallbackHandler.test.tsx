import { StrictMode } from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import i18n from "@/i18n";

const mocks = vi.hoisted(() => ({
  startedFromOAuthCallback: true,
  authState: { isLoading: false, signInError: null as string | null },
  snackbar: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/services/supabase/supabase.client", () => ({
  get startedFromOAuthCallback() {
    return mocks.startedFromOAuthCallback;
  },
  supabase: {},
}));

vi.mock("@/hooks", () => ({
  useAuth: () => mocks.authState,
  useAppSnackbar: () => mocks.snackbar,
}));

import { OAuthCallbackHandler } from "@/features/auth/OAuthCallbackHandler";
import { oauthReturnPath } from "@/features/auth/oauthReturn";

const LocationProbe = () => {
  const { pathname, search, hash } = useLocation();
  return <div data-testid="location">{`${pathname}${search}${hash}`}</div>;
};

// Mirrors AppRoutes' RootRedirect: it forwards the hash so deep links survive,
// and it mounts in the same commit the handler runs (routes wait for auth).
const RootRedirect = () => {
  const location = useLocation();
  return (
    <Navigate to={{ pathname: "/he/daily", hash: location.hash }} replace />
  );
};

const renderAt = (entry: string) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[entry]}>
        <OAuthCallbackHandler />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );

describe("OAuthCallbackHandler", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    sessionStorage.clear();
    vi.clearAllMocks();
    mocks.startedFromOAuthCallback = true;
    mocks.authState.isLoading = false;
    mocks.authState.signInError = null;
  });

  afterAll(async () => {
    await i18n.changeLanguage("he");
  });

  it("returns to the page the sign-in started from with a clean URL", () => {
    oauthReturnPath.save("/en/monthly");

    renderAt("/he/daily#access_token=secret");

    expect(screen.getByTestId("location")).toHaveTextContent("/en/monthly");
    expect(mocks.snackbar.error).not.toHaveBeenCalled();
    expect(oauthReturnPath.consume()).toBeNull();
  });

  it("wins over a redirect that forwards the stale callback hash", () => {
    oauthReturnPath.save("/en/monthly");

    renderAt("/#access_token=secret&refresh_token=secret");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/en\/monthly$/);
  });

  it("cleans the URL when the app root itself is the return target", () => {
    renderAt("/#access_token=secret&refresh_token=secret");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/he\/daily$/);
  });

  it("drops leftover tokens and reports a failed sign-in", () => {
    mocks.authState.signInError = "Invalid JWT";

    renderAt("/he/daily#access_token=secret");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/he\/daily$/);
    expect(mocks.snackbar.error).toHaveBeenCalledOnce();
    expect(mocks.snackbar.error).toHaveBeenCalledWith(
      "Sign-in with Google did not complete. You can keep working as a guest and try again.",
    );
  });

  it("leaves the URL alone until auth-js has processed it", () => {
    mocks.authState.isLoading = true;

    renderAt("/he/daily#access_token=secret");

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/he/daily#access_token=secret",
    );
  });

  it("does nothing on a plain visit", () => {
    mocks.startedFromOAuthCallback = false;
    oauthReturnPath.save("/en/monthly");

    renderAt("/he/daily");

    expect(screen.getByTestId("location")).toHaveTextContent("/he/daily");
    expect(oauthReturnPath.consume()).toBe("/en/monthly");
  });

  it("ignores a stored path that could leave the app", () => {
    oauthReturnPath.save("//evil.example/phish");

    renderAt("/he/daily#access_token=secret");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/he\/daily$/);
  });
});
