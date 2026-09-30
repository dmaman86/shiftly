import { WorkDayInfoResolver } from "../resolve/index.js";
import { Resolvers } from "../types/domain.types.js";

export const buildResolvers = (): Resolvers => {
  const workDayInfoResolver = new WorkDayInfoResolver();

  return {
    workDayInfoResolver,
  };
};
