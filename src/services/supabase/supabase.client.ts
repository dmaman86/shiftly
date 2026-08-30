import { createClient } from "@supabase/supabase-js";

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
