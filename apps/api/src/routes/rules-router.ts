import { Router } from "express";
import { yearRulesController } from "../controllers/rules-controller.ts";

/** POST <prefix>/:year/<action> runs one pipeline for that year. */
export const yearRulesRouter = (
  prefix: string,
  extract: (year: number) => Promise<unknown>,
  action = "rules",
): Router => {
  const rules = yearRulesController(extract, `${prefix}/${action}`);
  const router = Router();

  router.post(`${prefix}/:year/${action}`, rules.run);

  return router;
};
