import type { ErrorRequestHandler } from "express";

export type UserDataErrorCode =
  | "not_found"
  | "invalid_request"
  | "conflict"
  | "data_unavailable"
  | "internal_error";

const RESPONSES: Record<
  UserDataErrorCode,
  { readonly status: number; readonly message: string }
> = {
  not_found: { status: 404, message: "Not found" },
  invalid_request: { status: 400, message: "Invalid request" },
  conflict: { status: 409, message: "Conflicts with existing data" },
  data_unavailable: {
    status: 503,
    message: "Data could not be reached; try again",
  },
  internal_error: { status: 500, message: "Unexpected error" },
};

/**
 * A failed user-data operation. The client sees only the code and a fixed
 * message; database details go to the log, since they would help probing.
 */
export class UserDataError extends Error {
  readonly code: UserDataErrorCode;
  /** Postgres or PostgREST code, for the log only. */
  readonly sourceCode: string | undefined;

  constructor(code: UserDataErrorCode, message: string, sourceCode?: string) {
    super(message);
    this.name = "UserDataError";
    this.code = code;
    this.sourceCode = sourceCode;
  }
}

/** What supabase-js returns for a failed query or RPC. */
export type PostgrestFailure = {
  readonly status: number;
  readonly error: { readonly code?: string; readonly message: string };
};

/**
 * The backend's own credential or privileges were refused: a missing or
 * rotated secret key, or a grant gone. Never the caller's session, which
 * does not reach the database, so it must not become a 401 that would send
 * the browser to refresh a session that is fine.
 */
const BACKEND_REJECTED = new Set(["42501", "PGRST301", "PGRST302", "PGRST303"]);
const BACKEND_REJECTED_STATUSES = new Set([401, 403]);

/** Bad values that reached the database: the request was wrong, not the server. */
const INVALID_INPUT = new Set([
  "22007", // invalid_datetime_format
  "22008", // datetime_field_overflow
  "22023", // invalid_parameter_value, raised by the import functions
  "22P02", // invalid_text_representation
  "23502", // not_null_violation
  "23514", // check_violation
]);

/** Gateway failures: the database may be fine on the next try. */
const UNAVAILABLE_STATUSES = new Set([0, 502, 503, 504]);

/**
 * Maps a PostgREST failure of the backend's user-data client to the API's
 * error. not_found never comes from here: a repository decides it, because
 * the secret key sees every row and only the repository knows that a row
 * missing from the caller's scope is "not yours or not there".
 */
export const userDataErrorFrom = (failure: PostgrestFailure): UserDataError => {
  const { status, error } = failure;
  const sourceCode = error.code || undefined;
  const as = (code: UserDataErrorCode) =>
    new UserDataError(code, error.message, sourceCode);

  if (
    BACKEND_REJECTED_STATUSES.has(status) ||
    (sourceCode && BACKEND_REJECTED.has(sourceCode))
  ) {
    return as("internal_error");
  }
  if (sourceCode && INVALID_INPUT.has(sourceCode)) return as("invalid_request");
  if (sourceCode === "23505") return as("conflict");
  // supabase-js reports a network failure as status 0; PGRST000-003 are the
  // database connection and pool errors.
  if (UNAVAILABLE_STATUSES.has(status) || sourceCode?.startsWith("PGRST00")) {
    return as("data_unavailable");
  }
  return as("internal_error");
};

/** Answers a UserDataError thrown by a user-data route; anything else goes on. */
export const handleUserDataErrors: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (!(error instanceof UserDataError)) {
    next(error);
    return;
  }
  const { status, message } = RESPONSES[error.code];
  console.warn(
    JSON.stringify({
      severity: status >= 500 ? "ERROR" : "WARNING",
      event: "user_data_error",
      code: error.code,
      sourceCode: error.sourceCode,
      message: error.message,
    }),
  );
  res.status(status).json({ error: { code: error.code, message } });
};
