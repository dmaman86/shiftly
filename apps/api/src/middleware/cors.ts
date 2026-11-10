import type { RequestHandler } from "express";

const ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";
const PREFLIGHT_MAX_AGE_SECONDS = "600";

/**
 * CORS for an exact allowlist of browser origins. No wildcard and no
 * credentials: the web app authenticates with a Bearer token, never cookies.
 * Requests without an Origin (curl, server to server) are not affected; CORS
 * only tells browsers which pages may read responses, it is not access control.
 */
export function corsAllowlist(
  allowedOrigins: readonly string[],
): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    res.vary("Origin");
    const origin = req.get("origin");
    const isAllowed = origin !== undefined && allowed.has(origin);
    if (isAllowed) res.set("Access-Control-Allow-Origin", origin);

    const isPreflight =
      req.method === "OPTIONS" &&
      req.get("access-control-request-method") !== undefined;
    if (!isPreflight) {
      next();
      return;
    }
    if (!isAllowed) {
      res.status(403).end();
      return;
    }
    res
      .set("Access-Control-Allow-Methods", ALLOWED_METHODS)
      .set("Access-Control-Allow-Headers", ALLOWED_HEADERS)
      .set("Access-Control-Max-Age", PREFLIGHT_MAX_AGE_SECONDS)
      .status(204)
      .end();
  };
}
