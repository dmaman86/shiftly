import { fieldShiftPercent as defaultFieldShiftPercent } from "@/constants";
import { 
    DailyPerDiemInfo, 
    DayShift, 
    ExtraBreakdown, 
    PerDiemInfo, 
    RegularBreakdown, 
    Segment, 
    SpecialBreakdown, 
    WorkPayMap 
} from "../types/types";
import { distributeRegularHours } from "./distributeRegularHours.service";


export const workPayMapService = ((distributor, fieldShiftPercent) => {
    const {
        hours20,
        hours50,
        hours100,
        hours125,
        hours150,
        hours200,
    } = fieldShiftPercent;

    const addSeg = (a: Segment, b: Segment): Segment => ({
        percent: a.percent,
        hours: a.hours + b.hours
    });

    const buildPayMap = ({
        regular,
        extra,
        special,
        hours100Sick,
        hours100Vacation,
        extra100Shabbat,
        totalHours,
        baseRate,
        rateDiem,
        perDiem,
    }: {
        regular: RegularBreakdown;
        extra: ExtraBreakdown;
        special: SpecialBreakdown;
        hours100Sick: Segment;
        hours100Vacation: Segment;
        extra100Shabbat: Segment;
        totalHours: number;
        baseRate: number;
        rateDiem: number;
        perDiem: DailyPerDiemInfo;
    }): WorkPayMap => {
        return {
            regular,
            extra,
            special,
            hours100Sick,
            hours100Vacation,
            extra100Shabbat,
            totalHours,
            baseRate,
            rateDiem,
            perDiem,
        };
    };

    const init = (baseRate: number = 0, rateDiem: number, prev?: WorkPayMap): WorkPayMap => {
        const regular: RegularBreakdown = {
            hours100: { percent: hours100, hours: prev?.regular.hours100.hours ?? 0 },
            hours125: { percent: hours125, hours: prev?.regular.hours125.hours ?? 0 },
            hours150: { percent: hours150, hours: prev?.regular.hours150.hours ?? 0 },
        };
        const extra: ExtraBreakdown = {
            hours20: { percent: hours20, hours: prev?.extra.hours20.hours ?? 0 },
            hours50: { percent: hours50, hours: prev?.extra.hours50.hours ?? 0 },
        };
        const special: SpecialBreakdown = {
            shabbat150: { percent: hours150, hours: prev?.special.shabbat150.hours ?? 0 },
            shabbat200: { percent: hours200, hours: prev?.special.shabbat200.hours ?? 0 },
        };
        const hours100Sick: Segment = { percent: hours100, hours: prev?.hours100Sick.hours ?? 0  };
        const hours100Vacation: Segment = { percent: hours100, hours: prev?.hours100Vacation.hours ?? 0  };
        const extra100Shabbat: Segment = { percent: hours100, hours: prev?.extra100Shabbat.hours ?? 0 };
        const totalHours: number = prev?.totalHours ?? 0;

        const perDiem: DailyPerDiemInfo = {
            isFieldDutyDay: prev?.perDiem.isFieldDutyDay ?? false,
            diemInfo: {
                tier: prev?.perDiem.diemInfo.tier ?? null,
                points: prev?.perDiem.diemInfo.points ?? 0,
                amount: prev?.perDiem.diemInfo.amount ?? 0,
            }
        }
        
        return buildPayMap({
            regular,
            extra,
            special,
            hours100Sick,
            hours100Vacation,
            extra100Shabbat,
            totalHours,
            baseRate,
            rateDiem,
            perDiem,
        });
    };

    const updateBaseRate = (newRate: number, breakdown: WorkPayMap): WorkPayMap => {
        return init(newRate, breakdown.rateDiem, breakdown);
    };

    const pickBestDiem = (current: PerDiemInfo, candidate: PerDiemInfo): PerDiemInfo => {
        return (candidate.points > current.points) ? candidate : current;
    };

    const accumulateShift = (base: WorkPayMap, shift: DayShift, standardHours: number): WorkPayMap => {
        const { breakdown, perDiemShift } = shift;

        const totalHours = base.totalHours + breakdown.totalHours;
        let regular: RegularBreakdown = {
            hours100: addSeg(base.regular.hours100, breakdown.regular.hours100),
            hours125: addSeg(base.regular.hours125, breakdown.regular.hours125),
            hours150: addSeg(base.regular.hours150, breakdown.regular.hours150),
        }
        regular = distributor.distributeByDay(regular, standardHours);

        const isFieldDutyDay = base.perDiem.isFieldDutyDay || perDiemShift.isFieldDutyDay;
        const bestDiemInfo = pickBestDiem(base.perDiem.diemInfo, perDiemShift.diemInfo);

        return {
            ...base,
            regular,
            extra: {
                hours20: addSeg(base.extra.hours20, breakdown.extra.hours20),
                hours50: addSeg(base.extra.hours50, breakdown.extra.hours50),
            },
            special: {
                shabbat150: addSeg(base.special.shabbat150, breakdown.special.shabbat150),
                shabbat200: addSeg(base.special.shabbat200, breakdown.special.shabbat200),
            },
            totalHours,
            extra100Shabbat: { percent: hours100, hours: base.extra100Shabbat.hours + breakdown.special.shabbat150.hours + breakdown.special.shabbat200.hours },
            perDiem: {
                isFieldDutyDay,
                diemInfo: bestDiemInfo,
            }
        }
    };

    const accumulateDaily = (base: WorkPayMap, day: WorkPayMap): WorkPayMap => {
        return {
            ...base,

            regular: {
                hours100: addSeg(base.regular.hours100, day.regular.hours100),
                hours125: addSeg(base.regular.hours125, day.regular.hours125),
                hours150: addSeg(base.regular.hours150, day.regular.hours150),
            },

            extra: {
                hours20: addSeg(base.extra.hours20, day.extra.hours20),
                hours50: addSeg(base.extra.hours50, day.extra.hours50),
            },

            special: {
                shabbat150: addSeg(base.special.shabbat150, day.special.shabbat150),
                shabbat200: addSeg(base.special.shabbat200, day.special.shabbat200),
            },

            hours100Sick: addSeg(base.hours100Sick, day.hours100Sick),
            hours100Vacation: addSeg(base.hours100Vacation, day.hours100Vacation),
            extra100Shabbat: addSeg(base.extra100Shabbat, day.extra100Shabbat),

            totalHours: base.totalHours + day.totalHours,

            perDiem: {
                isFieldDutyDay: false,
                diemInfo: {
                    tier: null,
                    points: base.perDiem.diemInfo.points + day.perDiem.diemInfo.points,
                    amount: base.perDiem.diemInfo.amount + day.perDiem.diemInfo.amount,
                }
            }
        };
    };

    const buildFromShifts = (shiftList: DayShift[], standardHours: number, baseRate: number, rateDiem: number): WorkPayMap => {
        let map = init(baseRate, rateDiem);
        shiftList.forEach(shift => {
            map = accumulateShift(map, shift, standardHours);
        });
        return map;
    };

    const recalculateDay = (
        map: WorkPayMap, 
        standardHours: number, 
        baseRate: number,
    ): WorkPayMap => {
        const regular = distributor.distributeByDay(map.regular, standardHours);

        return buildPayMap({
            regular,
            extra: map.extra,
            special: map.special,
            hours100Sick: map.hours100Sick,
            hours100Vacation: map.hours100Vacation,
            extra100Shabbat: map.extra100Shabbat,
            totalHours: map.totalHours,
            baseRate,
            rateDiem: map.rateDiem,
            perDiem: map.perDiem,
        })
    }

    return { 
        init,
        updateBaseRate,
        accumulateShift, 
        buildFromShifts, 
        accumulateDaily,
        recalculateDay,
     };

})(distributeRegularHours, defaultFieldShiftPercent);