import { createClient } from "@supabase/supabase-js";

import { hasOAuthCallbackParams } from "./oauthCallback";

// Read before the client is created: auth-js clears the fragment only after a
// successful callback, and getSession() reports a failed one as a plain
// signed-out visit, so this is the only way to tell them apart later.
export const startedFromOAuthCallback =
  typeof window !== "undefined" && hasOAuthCallbackParams(window.location.href);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Auth and persistence are optional (guest mode works with zero config), so
// this must not throw when unconfigured - that would crash every consumer of
// this module (tests, CI, a fresh clone without .env.local) even for guests
// who never touch Supabase. A placeholder client is inert until someone
// actually tries to sign in, at which point it fails as a normal network/auth
// error instead of an import-time crash.
if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    "Supabase environment variables are not configured - sign-in and data persistence are disabled. Guest mode is unaffected.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-anon-key",
);
