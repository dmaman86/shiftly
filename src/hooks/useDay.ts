import { useCallback, useEffect, useState } from "react";

import { WorkDayStatus } from "@/constants";
import { DayShift, 
        Shift, 
        buildShiftMap, 
        WorkDayMeta, 
        WorkPayMap, 
        workPayMapService  
    } from "@/domain";


type UseDayProps = {
    meta: WorkDayMeta;
    standardHours: number;
    baseRate: number;
    rateDiem: number;
};

export const useDay = ({ meta, standardHours, baseRate, rateDiem }: UseDayProps) => {
    const [shiftList, setShiftList] = useState<DayShift[]>([]);
    const [status, setStatus] = useState<WorkDayStatus>(WorkDayStatus.normal);

    const [payMap, setPayMap] = useState<WorkPayMap>(() => 
        workPayMapService.init(baseRate, rateDiem)
);

    const addShift = useCallback((shift: Shift) => {
        const dayShift = buildShiftMap.buildDayShift(
            shift,
            meta,
            standardHours,
            false,
            rateDiem
        );
        setShiftList((prev) => [...prev, dayShift]);
    }, [meta, standardHours, rateDiem]);

    const updateShift = useCallback((id: string, fullShift: DayShift) => {
        setShiftList(prev =>
            prev.map(s => (s.id === id ? fullShift : s))
        );
    }, []);

    const removeShift = useCallback((id: string) => {
        setShiftList(prev => prev.filter(s => s.id !== id));
    }, []);

    useEffect(() => {
        setShiftList(prev =>
            prev.map(s =>
                buildShiftMap.buildDayShift(
                    s.shift,
                    meta,
                    standardHours,
                    s.perDiemShift.isFieldDutyDay, // keep duty per shift
                    rateDiem
                )
            )
        );
    }, [standardHours, rateDiem, meta]);

    useEffect(() => {
        // Sick / vacation override shifts
        if (status !== WorkDayStatus.normal) {

            const dayMap = workPayMapService.init(baseRate, rateDiem);

            setPayMap({
                ...dayMap,
                totalHours: standardHours,
                hours100Sick: {
                    ...dayMap.hours100Sick,
                    hours: status === WorkDayStatus.sick ? standardHours : 0,
                },
                hours100Vacation: {
                    ...dayMap.hours100Vacation,
                    hours: status === WorkDayStatus.vacation ? standardHours : 0,
                },
                perDiem: {
                    isFieldDutyDay: false,
                    diemInfo: { tier: null, points: 0, amount: 0 },
                },
            });

            return;
        }

        let dayMap = workPayMapService.buildFromShifts(
            shiftList,
            standardHours,
            baseRate,
            rateDiem
        );

        // Recalculate day-level Ashlam (per diem)
        dayMap = workPayMapService.recalculateDay(
            dayMap,
            standardHours,
            baseRate,
        );

        setPayMap(dayMap);
    }, [
        shiftList,
        status,
        standardHours,
        baseRate,
        rateDiem,
  ]);

    return {
        status,
        setStatus,

        payMap,
        shiftList,
        setShiftList,

        addShift,
        updateShift,
        removeShift
    }
};