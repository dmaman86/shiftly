import type { Request, Response } from "express";
import { ReferenceDataPersistenceError } from "../ports/reference-data.ts";
import {
  InvalidPublishedTimelineError,
  parseTimelineKinds,
  PUBLISHED_TIMELINE_KINDS,
  type PublishedTimelinesReader,
} from "../services/published-timelines.ts";

/** Same freshness as election days; rates change rarely and are announced ahead. */
const PUBLIC_CACHE = "public, max-age=300, stale-while-revalidate=3600";

/** Public: guests calculate with the same rates. */
export const publishedTimelinesController = (
  reader: PublishedTimelinesReader,
) => {
  /** GET /timelines?kinds=a,b → the full published history of each kind */
  const listByKind = async (req: Request, res: Response) => {
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
  };

  return { listByKind };
};
