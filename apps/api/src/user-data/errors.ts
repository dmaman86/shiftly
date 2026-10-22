import type { ErrorRequestHandler } from "express";

export type UserDataErrorCode =
  | "unauthenticated"
  | "not_found"
  | "invalid_request"
  | "conflict"
  | "data_unavailable"
  | "internal_error";

const RESPONSES: Record<
  UserDataErrorCode,
  { readonly status: number; readonly message: string }
> = {
  unauthenticated: { status: 401, message: "Authentication required" },
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

/** PostgREST rejected the JWT: missing, invalid or expired. */
const JWT_REJECTED = new Set(["PGRST301", "PGRST302", "PGRST303"]);

/** Bad values that reached the database: the request was wrong, not the server. */
const INVALID_INPUT = new Set([
  "22007", // invalid_datetime_format
  "22008", // datetime_field_overflow
  "22023", // invalid_parameter_value, raised by import_guest_month
  "22P02", // invalid_text_representation
  "23502", // not_null_violation
  "23514", // check_violation
]);

/** Gateway failures: the database may be fine on the next try. */
const UNAVAILABLE_STATUSES = new Set([0, 502, 503, 504]);

/**
 * Maps a PostgREST failure to the API's error. 42501 (RLS or privilege
 * denied) becomes not_found: every write already carries the caller's own
 * user_id, so the only way to hit it is another user's row, and answering 404
 * does not reveal that the row exists.
 */
export function userDataErrorFrom(failure: PostgrestFailure): UserDataError {
  const { status, error } = failure;
  const sourceCode = error.code || undefined;
  const as = (code: UserDataErrorCode) =>
    new UserDataError(code, error.message, sourceCode);

  if (status === 401 || (sourceCode && JWT_REJECTED.has(sourceCode))) {
    return as("unauthenticated");
  }
  if (sourceCode === "42501") return as("not_found");
  if (sourceCode && INVALID_INPUT.has(sourceCode)) return as("invalid_request");
  if (sourceCode === "23505") return as("conflict");
  // supabase-js reports a network failure as status 0; PGRST000-003 are the
  // database connection and pool errors.
  if (UNAVAILABLE_STATUSES.has(status) || sourceCode?.startsWith("PGRST00")) {
    return as("data_unavailable");
  }
  return as("internal_error");
}

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
  if (error.code === "unauthenticated") res.set("WWW-Authenticate", "Bearer");
  res.status(status).json({ error: { code: error.code, message } });
};
