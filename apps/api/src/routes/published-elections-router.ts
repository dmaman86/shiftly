import { Router } from "express";
import { publishedElectionsController } from "../controllers/published-elections-controller.ts";
import type { PublishedElectionsReader } from "../services/published-elections.ts";

/** Public election days: no token, published data only. */
export const publishedElectionsRouter = (
  reader: PublishedElectionsReader,
  now: () => Date = () => new Date(),
): Router => {
  const elections = publishedElectionsController(reader, now);
  const router = Router();

  router.get("/elections", elections.listInYear);

  return router;
};
