import { useCallback, useEffect, useState } from "react";

import { WorkDayStatus } from "@/constants";
import { DayShift, 
        Shift, 
        WorkDayMeta, 
        WorkPayMap, 
    } from "@/domain";
import { useList } from "./useList";
import { DomainContextType } from "@/context/DomainProvider";


type UseDayProps = {
    domain: DomainContextType;
    meta: WorkDayMeta;
    standardHours: number;
    baseRate: number;
    rateDiem: number;
};

export const useDay = ({ domain, meta, standardHours, baseRate, rateDiem }: UseDayProps) => {
    
    const builders = domain.builders;
    const { shiftMapBuilderService, workPayMapBuilderService } = builders;

    const { 
        items: shiftList,
        setItems: setShiftList,
        addItem,
        updateItem,
        removeItem
     } = useList<DayShift>();
    
    const [status, setStatus] = useState<WorkDayStatus>(WorkDayStatus.normal);

    const [payMap, setPayMap] = useState<WorkPayMap>(() =>
        workPayMapBuilderService.create(baseRate, rateDiem).build()
    );

    const addShift = useCallback((shift: Shift) => {
        const dayShift = shiftMapBuilderService.create(
            meta,
            standardHours,
            rateDiem
        ).withShift(shift)
        .buildDayShift(false, rateDiem);

        addItem(dayShift);
    }, [meta, standardHours, rateDiem, addItem, shiftMapBuilderService]);

    const updateShift = useCallback((id: string, fullShift: DayShift) => {
        updateItem(id, fullShift);
    }, [updateItem]);

    const removeShift = useCallback((id: string) => {
        removeItem(id);
    }, [removeItem]);

    useEffect(() => {        
        setShiftList(prev =>
            prev.map(s =>
                shiftMapBuilderService.create(
                    meta,
                    standardHours,
                    rateDiem
                ).withShift(s.shift)
                .buildDayShift(s.perDiemShift.isFieldDutyDay, rateDiem)
            )
        );
    }, [standardHours, rateDiem, meta, setShiftList, shiftMapBuilderService]);

    useEffect(() => {
        // Sick / vacation override shifts
        if (status !== WorkDayStatus.normal) {

            const dayMap = workPayMapBuilderService.create(baseRate, rateDiem).build();

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

        let dayMap = workPayMapBuilderService.buildFromShifts(
            shiftList,
            standardHours,
            baseRate,
            rateDiem
        );

        // Recalculate day-level Ashlam (per diem)
        dayMap = workPayMapBuilderService.recalculateDay(
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
        workPayMapBuilderService,
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