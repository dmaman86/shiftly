import i18n from "@/i18n";

type ErrorMessageKey =
  | "network"
  | "cancelled"
  | "server"
  | `api.${
      | "unauthenticated"
      | "session_changed"
      | "timeout"
      | "not_found"
      | "invalid_request"
      | "conflict"
      | "data_unavailable"}`;

/**
 * Error codes the API client returns: its own (session, transport) and the
 * API's (see apps/api user-data errors). Each maps to a message key in the
 * errors namespace; several share one when the user can do the same thing.
 */
const MESSAGE_KEY_BY_CODE = new Map<string, ErrorMessageKey>([
  // Session
  ["unauthenticated", "api.unauthenticated"],
  ["session_changed", "api.session_changed"],
  // Transport
  ["network", "network"],
  ["timeout", "api.timeout"],
  ["aborted", "cancelled"],
  // API answers
  ["not_found", "api.not_found"],
  ["invalid_request", "api.invalid_request"],
  ["conflict", "api.conflict"],
  ["data_unavailable", "api.data_unavailable"],
  ["internal_error", "server"],
  ["invalid_response", "server"],
  ["api_not_configured", "server"],
]);

/**
 * The message to show for an API client error code. Unknown HTTP statuses
 * read as a server failure; any other text is already a message and is
 * returned as is.
 */
export const resolveApiErrorMessage = (code: string): string => {
  const key =
    MESSAGE_KEY_BY_CODE.get(code) ??
    (/^http_\d{3}$/.test(code) ? ("server" as const) : null);
  return key ? i18n.t(key, { ns: "errors" }) : code;
};
