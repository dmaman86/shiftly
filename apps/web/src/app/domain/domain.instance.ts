import { buildPayMapPipeline } from "@shiftly/domain";
import { DomainContextType } from "./domain.types";
import { DefaultMonthResolver } from "../months/month.resolver";
import { WorkDayInfoPresenter } from "./workdayinfo.presenter";

const pipelineInstance = buildPayMapPipeline();

export const domain: DomainContextType = {
  payMap: {
    shiftMapBuilder: pipelineInstance.payMap.shiftMapBuilder,
    dayPayMapBuilder: pipelineInstance.payMap.dayPayMapBuilder,
    monthPayMapCalculator: pipelineInstance.payMap.monthPayMapCalculator,
    workDaysMonthBuilder: pipelineInstance.payMap.workDaysForMonthBuilder,
    calculateDayFromShifts: pipelineInstance.payMap.calculateDayFromShifts,
  },
  resolvers: {
    holidayResolver: pipelineInstance.rateCalculators.holiday,
    perDiemResolver: pipelineInstance.rateCalculators.perDiem,
    dayInfoResolver: new WorkDayInfoPresenter(
      pipelineInstance.resolvers.workDayInfoResolver,
      pipelineInstance.services.dateService,
    ),
    monthResolver: new DefaultMonthResolver(),
    mealAllowanceRateResolver: pipelineInstance.rateCalculators.mealAllowanceRate,
  },
  services: {
    dateService: pipelineInstance.services.dateService,
    shiftService: pipelineInstance.services.shiftService,
  },
};
