import { Router } from "express";
import { publishedTimelinesController } from "../controllers/published-timelines-controller.ts";
import type { PublishedTimelinesReader } from "../services/published-timelines.ts";

/** Public rate timelines: guests calculate with the same rates. */
export const publishedTimelinesRouter = (
  reader: PublishedTimelinesReader,
): Router => {
  const timelines = publishedTimelinesController(reader);
  const router = Router();

  router.get("/timelines", timelines.listByKind);

  return router;
};
