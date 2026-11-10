import {
  createClient,
  isAuthRetryableFetchError,
  type AuthError,
} from "@supabase/supabase-js";
import { UserDataError } from "../errors/user-data-errors.ts";

/** Deletes a user and, by cascade, every row they own. */
export interface AccountDeleter {
  /** Idempotent: a user that no longer exists counts as deleted. */
  deleteUser(userId: string): Promise<void>;
}

const failureOf = (error: AuthError): UserDataError => {
  const status = error.status ?? 0;
  if (isAuthRetryableFetchError(error) || status >= 500) {
    return new UserDataError(
      "data_unavailable",
      `Supabase Auth unavailable: ${error.message}`,
      error.code,
    );
  }
  return new UserDataError(
    "internal_error",
    `Account deletion was refused: ${error.message}`,
    error.code,
  );
};

/**
 * Deletes through the Auth admin API, which needs the secret key. Every table
 * that references auth.users cascades (or sets null), so the user's monthly
 * configs, work days, shifts and roles go with them.
 */
export const supabaseAccountDeleter = (options: {
  url: string;
  secretKey: string;
  /** Test seam: the HTTP client. */
  fetch?: typeof fetch;
}): AccountDeleter => {
  const { auth } = createClient(options.url, options.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  });

  return {
    deleteUser: async (userId) => {
      const { error } = await auth.admin.deleteUser(userId);
      // Deleted by a concurrent request in between: the outcome is the same.
      if (!error || error.status === 404) return;
      throw failureOf(error);
    },
  };
};
