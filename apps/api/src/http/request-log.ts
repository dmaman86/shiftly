import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const UNLOGGED_PATHS = new Set(["/health"]);

/**
 * One JSON line per request with a severity Cloud Logging understands. Logs
 * the path only: never the query string, headers, tokens or bodies.
 */
export function requestLog(): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();
    res.set("X-Request-Id", requestId);
    res.on("finish", () => {
      if (UNLOGGED_PATHS.has(req.path)) return;
      const status = res.statusCode;
      console.log(
        JSON.stringify({
          severity:
            status >= 500 ? "ERROR" : status >= 400 ? "WARNING" : "INFO",
          event: "http_request",
          requestId,
          method: req.method,
          path: req.originalUrl.split("?")[0],
          status,
          durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
        }),
      );
    });
    next();
  };
}
