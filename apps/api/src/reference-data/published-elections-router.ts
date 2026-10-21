import { Router } from "express";
import { ReferenceDataPersistenceError } from "./ports.ts";
import {
  supportedYears,
  type PublishedElectionsReader,
} from "./published-elections.ts";

/**
 * Fresh for five minutes, then served stale while revalidating for up to an
 * hour: planned and confirmed elections can still be rescheduled.
 */
const PUBLIC_CACHE = "public, max-age=300, stale-while-revalidate=3600";

/** GET /elections?year=YYYY. Public: no token, published data only. */
export function publishedElectionsRouter(
  reader: PublishedElectionsReader,
  now: () => Date = () => new Date(),
): Router {
  const router = Router();

  router.get("/elections", async (req, res) => {
    const { first, last } = supportedYears(now());
    const raw = req.query.year;
    const year =
      typeof raw === "string" && /^\d{4}$/.test(raw) ? Number(raw) : NaN;
    if (!(year >= first && year <= last)) {
      res.status(400).json({
        error: {
          code: "invalid_year",
          message: `Year must be ${first}–${last}`,
        },
      });
      return;
    }

    try {
      const elections = await reader.electionsIn(year);
      res.set("Cache-Control", PUBLIC_CACHE).json({ year, elections });
    } catch (error) {
      if (!(error instanceof ReferenceDataPersistenceError)) throw error;
      console.error(
        JSON.stringify({
          severity: "ERROR",
          event: "reference_data_unavailable",
          message: error.message,
        }),
      );
      res
        .status(503)
        .set("Cache-Control", "no-store")
        .json({
          error: {
            code: "reference_data_unavailable",
            message: "Reference data is temporarily unavailable",
          },
        });
    }
  });

  return router;
}
