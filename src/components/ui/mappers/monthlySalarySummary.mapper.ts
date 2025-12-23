import { PayBreakdownViewModel } from "@/domain"
import { MonthlySalarySummaryVM } from "../MonthlySalarySummaryVM";
import { buildPaySectionRows } from "../builders/paySection.builder";
import { BASE_SECTION_CONFIG, EXTRA_SECTION_CONFIG } from "../config/paySections.config";
import { buildPerDiemRow } from "./payRow.mapper";

export const monthlySalarySummaryMapper = ({
    payVM,
    baseRate,
    rateDiem
}: {
    payVM: PayBreakdownViewModel;
    baseRate: number;
    rateDiem: number;
}): MonthlySalarySummaryVM => {
    const baseRows = buildPaySectionRows(
        payVM,
        baseRate,
        BASE_SECTION_CONFIG
    );

    const extraRows = buildPaySectionRows(
        payVM,
        baseRate,
        EXTRA_SECTION_CONFIG
    );

    const perDiemRow = payVM.perDiemPoints != null
        ? buildPerDiemRow(payVM.perDiemPoints, rateDiem)
        : null;

    const monthlyTotal = [...baseRows, ...extraRows].reduce(
        (sum, row) => sum + row.total, 0
    ) + (perDiemRow?.total || 0);

    return {
        baseRows,
        extraRows,
        perDiemRow,
        monthlyTotal,
    };
}