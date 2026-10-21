import { Router } from "express";
import { ReferenceDataPersistenceError } from "./ports.ts";
import {
  InvalidPublishedTimelineError,
  parseTimelineKinds,
  PUBLISHED_TIMELINE_KINDS,
  type PublishedTimelinesReader,
} from "./published-timelines.ts";

/** Same freshness as election days; rates change rarely and are announced ahead. */
const PUBLIC_CACHE = "public, max-age=300, stale-while-revalidate=3600";

/**
 * GET /timelines?kinds=a,b. Public: guests calculate with the same rates.
 * Returns the full published history of each requested kind.
 */
export function publishedTimelinesRouter(
  reader: PublishedTimelinesReader,
): Router {
  const router = Router();

  router.get("/timelines", async (req, res) => {
    const kinds = parseTimelineKinds(req.query.kinds);
    if (kinds === null) {
      res.status(400).json({
        error: {
          code: "invalid_kinds",
          message: `kinds must list distinct values of: ${PUBLISHED_TIMELINE_KINDS.join(", ")}`,
        },
      });
      return;
    }

    try {
      const published = await reader.timelines();
      res.set("Cache-Control", PUBLIC_CACHE).json({
        timelines: Object.fromEntries(
          kinds.map((kind) => [kind, published[kind]]),
        ),
      });
    } catch (error) {
      const invalid = error instanceof InvalidPublishedTimelineError;
      if (!invalid && !(error instanceof ReferenceDataPersistenceError)) {
        throw error;
      }
      console.error(
        JSON.stringify({
          severity: "ERROR",
          event: invalid
            ? "reference_data_invalid"
            : "reference_data_unavailable",
          message: error.message,
        }),
      );
      res
        .status(503)
        .set("Cache-Control", "no-store")
        .json({
          error: invalid
            ? {
                code: "reference_data_invalid",
                message: "Published reference data is invalid",
              }
            : {
                code: "reference_data_unavailable",
                message: "Reference data is temporarily unavailable",
              },
        });
    }
  });

  return router;
}
