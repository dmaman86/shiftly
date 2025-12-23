import { PayRowVM } from "./PayRowVM";

export type MonthlySalarySummaryVM = {
    baseRows: PayRowVM[];
    extraRows: PayRowVM[];
    perDiemRow: PayRowVM | null;
    monthlyTotal: number;
}