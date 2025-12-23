import { PayBreakdownViewModel } from "@/domain";
import { PaySectionConfig } from "../config/paySections.config";
import { PayRowVM } from "../PayRowVM";
import { buildPayRowsFromSegments } from "../mappers/payRow.mapper";


export const buildPaySectionRows = (
    vm: PayBreakdownViewModel,
    baseRate: number,
    config: PaySectionConfig[],
): PayRowVM[] => {
    const segmentMap = Object.fromEntries(
        config.map(({ label, selector }) => [label, selector(vm)]),
    );

    return buildPayRowsFromSegments(baseRate, segmentMap);
}