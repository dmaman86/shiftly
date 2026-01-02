import {
  buildAllowanceRows,
  buildBasePayRows,
  buildExtraPayRows,
} from "../mappers";
import {
  AllowanceSectionConfig,
  BasePaySectionConfig,
  ExtraPaySectionConfig,
} from "../vm";

export const createBaseSectionFactory = (
  id: string,
  config: Omit<BasePaySectionConfig, "id" | "type" | "buildRows">,
): BasePaySectionConfig => ({
  type: "base",
  id,
  ...config,
  buildRows: buildBasePayRows,
});

export const createExtraSectionFactory = (
  id: string,
  config: Omit<ExtraPaySectionConfig, "id" | "type" | "buildRows">,
): ExtraPaySectionConfig => ({
  type: "extra",
  id,
  ...config,
  buildRows: buildExtraPayRows,
});

export const createAllowanceSectionFactory = (
  id: string,
  config: Omit<AllowanceSectionConfig, "id" | "type" | "buildRows">,
): AllowanceSectionConfig => ({
  type: "allowance",
  id,
  ...config,
  buildRows: buildAllowanceRows,
});

// Union de todos los factories (opcional, para conveniencia)
export const createSectionFactory = {
  base: createBaseSectionFactory,
  extra: createExtraSectionFactory,
  allowance: createAllowanceSectionFactory,
};
