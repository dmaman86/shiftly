import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const refreshSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
    },
  },
}));

import { supabaseSessionTokens } from "@/services/api/client";

describe("supabaseSessionTokens", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    refreshSessionMock.mockReset();
  });

  it("reads the current access token from the Supabase session", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-1", user: { id: "user-1" } } },
      error: null,
    });
    expect(await supabaseSessionTokens.current()).toEqual({
      accessToken: "token-1",
      userId: "user-1",
    });
  });

  it("has no token when signed out", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    expect(await supabaseSessionTokens.current()).toBeNull();
  });

  it("returns the refreshed token", async () => {
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-2", user: { id: "user-1" } } },
      error: null,
    });
    expect(await supabaseSessionTokens.refreshed()).toEqual({
      accessToken: "token-2",
      userId: "user-1",
    });
    expect(refreshSessionMock).toHaveBeenCalledOnce();
  });

  it("has no token when the refresh fails", async () => {
    refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: new Error("refresh_token_not_found"),
    });
    expect(await supabaseSessionTokens.refreshed()).toBeNull();
  });
});
