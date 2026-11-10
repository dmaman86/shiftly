import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedUser } from "../ports/auth.ts";
import {
  userDataErrorFrom,
  type PostgrestFailure,
} from "../errors/user-data-errors.ts";

/** Tables where every row belongs to one user through user_id. */
export type UserOwnedTable = "monthly_configs" | "work_days" | "shifts";

/**
 * Database functions callable only by the backend. By convention they are
 * named api_* and take the owner as p_user_id, which only UserScope sets.
 */
export type UserDataFunction = `api_${string}`;

/** Row values a repository writes; the owner is never one of them. */
export type OwnedRow = Record<string, unknown> & { user_id?: never };

/**
 * Every operation a repository may run on user-owned data, each one pinned
 * to the verified caller. The client behind it uses a secret key and bypasses
 * RLS, so this class is where ownership is enforced: reads and deletes always
 * filter by user_id, writes always set it, and RPCs always receive it.
 * Repositories never see the client itself.
 */
export class UserScope {
  readonly userId: string;
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient, user: AuthenticatedUser) {
    if (!user.userId) throw new Error("UserScope needs a verified user id");
    this.client = client;
    this.userId = user.userId;
  }

  /** The caller's rows only. No automatic retries: the caller times out first. */
  select(table: UserOwnedTable, columns: string) {
    return this.client
      .from(table)
      .select(columns)
      .eq("user_id", this.userId)
      .retry(false);
  }

  /** Deletes among the caller's rows only; add filters to narrow it. */
  delete(table: UserOwnedTable) {
    return this.client.from(table).delete().eq("user_id", this.userId);
  }

  /**
   * Inserts or updates one of the caller's rows. The conflict target must
   * include user_id: a unique key that contains the owner can only collide
   * with the caller's own row, so another user's row is never updated, even
   * under concurrent requests. Rows keyed by id alone (shifts) go through an
   * api_* function instead.
   */
  upsert(table: UserOwnedTable, row: OwnedRow, onConflict: string) {
    const target = onConflict.split(",").map((column) => column.trim());
    if (!target.includes("user_id")) {
      throw new Error(
        `upsert into ${table} must conflict on a key that includes user_id`,
      );
    }
    return this.client
      .from(table)
      .upsert({ ...row, user_id: this.userId }, { onConflict });
  }

  /** Calls a backend-only function with the caller as p_user_id. */
  rpc(fn: UserDataFunction, args: Record<string, unknown> = {}) {
    return this.client.rpc(fn, { ...args, p_user_id: this.userId });
  }
}

/** Builds the UserScope of the verified caller for one request. */
export interface UserDataAccess {
  scopeFor(user: AuthenticatedUser): UserScope;
}

/**
 * The backend-only client for user-owned data: a secret key, so it never
 * reaches the browser and the browser's own roles can later lose every
 * privilege on these tables. It keeps no session, so one client serves every
 * request; ownership comes from the UserScope of each one.
 */
export function supabaseUserDataAccess(options: {
  url: string;
  secretKey: string;
  /** Test seam: the HTTP client. */
  fetch?: typeof fetch;
}): UserDataAccess {
  const client = createClient(options.url, options.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  });
  return { scopeFor: (user) => new UserScope(client, user) };
}

type PostgrestResult<T> = {
  data: T | null;
  error: PostgrestFailure["error"] | null;
  status: number;
};

/** Awaits a query and returns its data, or throws the mapped UserDataError. */
export async function dataOrThrow<T>(
  query: PromiseLike<PostgrestResult<T>>,
): Promise<T | null> {
  const { data, error, status } = await query;
  if (error) throw userDataErrorFrom({ status, error });
  return data;
}
