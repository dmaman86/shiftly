
import {
  createShiftResolverService,
  createRegularService,
  createGenericBreakdownFactory,
  createPerDiemService,
  createShiftMapBuilderService,
  createWorkPayMapBuilderService,
  createHolidayResolverService,
} from "@/domain";
import { fieldShiftPercent, fieldMinutes } from "@/constants";

const extraPercent = {
  hours20: fieldShiftPercent.hours20,
  hours50: fieldShiftPercent.hours50,
};

const specialPercent = {
  shabbat150: fieldShiftPercent.hours150,
  shabbat200: fieldShiftPercent.hours200,
};

const extraService = createGenericBreakdownFactory(extraPercent);
const specialService = createGenericBreakdownFactory(specialPercent);
const regularService = createRegularService(fieldShiftPercent);
const perDiemService = createPerDiemService();

const shiftResolver = createShiftResolverService()
  .withFieldMinutes(fieldMinutes)
  .withFieldShiftPercent(fieldShiftPercent)
  .build();

const holidayResolver = createHolidayResolverService();

const shiftMapBuilderService = createShiftMapBuilderService(
  shiftResolver,
  fieldShiftPercent,
  regularService,
  createGenericBreakdownFactory,
  perDiemService,
);

const workPayMapBuilderService = createWorkPayMapBuilderService(
  fieldShiftPercent,
  regularService,
  createGenericBreakdownFactory,
  perDiemService,
);

export const domain = {
  resolvers: { shiftResolver, holidayResolver },
  factories: { regularService, extraService, specialService, perDiemService },
  builders: { shiftMapBuilderService, workPayMapBuilderService },
};