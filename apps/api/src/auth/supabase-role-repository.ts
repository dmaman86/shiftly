import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AuthUnavailableError,
  type AppRole,
  type RoleRepository,
} from "./ports.ts";

const KNOWN_ROLES: ReadonlySet<string> = new Set<AppRole>(["admin"]);

/**
 * Reads app_user_roles with the backend secret key. The table has RLS with no
 * policies and no browser grants, so this is the only reader. No cache: a
 * revoked role stops working on the next request.
 */
export class SupabaseRoleRepository implements RoleRepository {
  private readonly client: SupabaseClient;

  constructor(options: {
    url: string;
    secretKey: string;
    /** Test seam: the HTTP client. */
    fetch?: typeof fetch;
  }) {
    this.client = createClient(options.url, options.secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
    });
  }

  async rolesOf(userId: string): Promise<AppRole[]> {
    const { data, error } = await this.client
      .from("app_user_roles")
      .select("role")
      .eq("user_id", userId)
      .returns<{ role: string }[]>();
    if (error) {
      throw new AuthUnavailableError(`reading roles failed: ${error.message}`);
    }
    // A role this code does not know grants nothing.
    return data
      .map(({ role }) => role)
      .filter((role): role is AppRole => KNOWN_ROLES.has(role));
  }
}
