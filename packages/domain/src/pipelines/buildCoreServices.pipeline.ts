import { DateService, ShiftService } from "../services/index.js";
import { CoreServices } from "../types/domain.types.js";

export const buildCoreServices = (): CoreServices => {
  const dateService = new DateService();
  const shiftService = new ShiftService(dateService);

  return {
    dateService,
    shiftService,
  };
};
