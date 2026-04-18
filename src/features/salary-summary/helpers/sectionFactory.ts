import {
  AllowanceSectionConfig,
  BasePaySectionConfig,
  ExtraPaySectionConfig,
} from "../vm";

export const createBaseSectionFactory = (
  id: string,
  config: Omit<BasePaySectionConfig, "id" | "type">,
): BasePaySectionConfig => ({
  type: "base",
  id,
  ...config,
});

export const createExtraSectionFactory = (
  id: string,
  config: Omit<ExtraPaySectionConfig, "id" | "type">,
): ExtraPaySectionConfig => ({
  type: "extra",
  id,
  ...config,
});

export const createAllowanceSectionFactory = (
  id: string,
  config: Omit<AllowanceSectionConfig, "id" | "type">,
): AllowanceSectionConfig => ({
  type: "allowance",
  id,
  ...config,
});

export const createSectionFactory = {
  base: createBaseSectionFactory,
  extra: createExtraSectionFactory,
  allowance: createAllowanceSectionFactory,
};
