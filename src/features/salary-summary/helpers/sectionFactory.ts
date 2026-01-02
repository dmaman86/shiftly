import { SalarySectionConfig } from "../vm";

export const createSectionFactory = (
  id: string,
  config: Omit<SalarySectionConfig, "id">,
): SalarySectionConfig => {
  return {
    id,
    title: config.title || "",
    icon: config.icon || null,
    summaryLabel: config.summaryLabel || "",
    color: config.color || "#000",
    payVM: config.payVM!,
    baseRate: config.baseRate,
    allowanceRate: config.allowanceRate,
    rateDiem: config.rateDiem,
    buildRows: config.buildRows!,
  };
};
