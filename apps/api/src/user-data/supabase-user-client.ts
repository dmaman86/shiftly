import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedUser } from "../auth/ports.ts";

/**
 * Builds the Supabase client for one request, acting as the verified caller.
 * Only for user-owned data (monthly_configs, work_days, shifts and their
 * RPCs); reference data and admin work keep their secret-key clients.
 */
export type UserDataClientFactory = (user: AuthenticatedUser) => SupabaseClient;

/**
 * The publishable key plus the caller's own access token: PostgREST runs as
 * `authenticated` with auth.uid() = the token's subject, so the RLS ownership
 * policies stay in force under the API's own checks. The secret key is never
 * used here: it would bypass RLS for ordinary user data.
 *
 * A new client per request shares no session between users, and the token is
 * only forwarded: never stored, refreshed or logged.
 */
export function supabaseUserClientFactory(options: {
  url: string;
  publishableKey: string;
  /** Test seam: the HTTP client. */
  fetch?: typeof fetch;
}): UserDataClientFactory {
  return (user) =>
    createClient(options.url, options.publishableKey, {
      // With accessToken set, supabase-js manages no session at all.
      accessToken: async () => user.accessToken,
      ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
    });
}
