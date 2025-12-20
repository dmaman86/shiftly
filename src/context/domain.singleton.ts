import { buildPayMapPipeline } from "@/domain";

const payMapPipeline = buildPayMapPipeline();

export const domain = {
  payMap: payMapPipeline.payMap,
  resolvers: payMapPipeline.resolvers,
};
