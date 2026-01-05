import { DateService, ShiftService } from "@/domain/services";
import { CoreServices } from "../types/domain.types";

export const buildCoreServices = (): CoreServices => {
  const dateService = new DateService();
  const shiftService = new ShiftService(dateService);

  return {
    dateService,
    shiftService,
  };
};
