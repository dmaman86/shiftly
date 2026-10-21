import {
  BASELINE_REFERENCE_TIMELINES,
  buildPayMapPipeline,
  createReferenceResolver,
  type ReferenceResolver,
} from "@shiftly/domain";
import { DomainContextType } from "./domain.types";
import { DefaultMonthResolver } from "../months/month.resolver";
import { WorkDayInfoPresenter } from "./workdayinfo.presenter";
import { monthReferenceIssues } from "./referenceIssues";

/**
 * The application's view of the domain, calculating with the given rates.
 * Pure: building it performs no I/O, so it can be rebuilt whenever the
 * published rates change.
 */
export const createDomainContext = (references: {
  resolver: ReferenceResolver;
  version: string;
}): DomainContextType => {
  const pipelineInstance = buildPayMapPipeline({
    referenceResolver: references.resolver,
  });

  return {
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
      mealAllowanceRateResolver:
        pipelineInstance.rateCalculators.mealAllowanceRate,
    },
    services: {
      dateService: pipelineInstance.services.dateService,
      shiftService: pipelineInstance.services.shiftService,
    },
    references: {
      version: references.version,
      monthIssues: (year, month) =>
        monthReferenceIssues(references.resolver, year, month),
    },
  };
};

/** Calculates with the embedded baseline rates: tests and provider overrides. */
export const domain: DomainContextType = createDomainContext({
  resolver: createReferenceResolver(BASELINE_REFERENCE_TIMELINES),
  version: "baseline",
});
