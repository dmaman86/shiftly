import { DateService, ShiftService } from "@/domain/services";
import { CoreServices, DomainConfig } from "../types/domain.types";

export const buildCoreServices = (config: DomainConfig): CoreServices => {
  const dateService = new DateService(config.timeZone);
  const shiftService = new ShiftService(dateService);

  return {
    dateService,
    shiftService,
  };
};
