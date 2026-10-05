import { describe, expect, it } from "vitest";

import { hasOAuthCallbackParams } from "@/services/supabase/oauthCallback";

const BASE = "https://dmaman86.github.io/shiftly/";

describe("hasOAuthCallbackParams", () => {
  it.each([
    `${BASE}#access_token=token&refresh_token=refresh&token_type=bearer`,
    `${BASE}#error=server_error&error_description=failed`,
    `${BASE}?error=access_denied&error_code=denied`,
  ])("detects an OAuth callback in %s", (href) => {
    expect(hasOAuthCallbackParams(href)).toBe(true);
  });

  it.each([`${BASE}he/daily`, `${BASE}he/daily?month=8`, `${BASE}#section`])(
    "treats %s as a plain visit",
    (href) => {
      expect(hasOAuthCallbackParams(href)).toBe(false);
    },
  );
});
