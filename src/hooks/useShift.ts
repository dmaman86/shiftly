import { useCallback, useEffect, useState } from "react";

import { Shift, 
        TimeFieldType, 
        buildShiftMap,
        WorkDayMeta, 
        DayShift,
 } from "@/domain";


type ShiftProps = {
    id: string;
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    rateDiem: number;
    isDuty: boolean;
    onShiftUpdate: (id: string, fullShift: DayShift) => void;
};

export const useShift = ({ id, shift, meta, standardHours, rateDiem, isDuty, onShiftUpdate }: ShiftProps) => {
    const [localShift, setLocalShift] = useState<Shift>(shift);

    const [fullShift, setFullShift] = useState<DayShift | null>(null);
    
    const update = useCallback((newStart: TimeFieldType, newEnd: TimeFieldType) => {
        setLocalShift({ id, start: newStart, end: newEnd });
    }, [id]);

    
    useEffect(() => {
        const built = buildShiftMap.buildDayShift(
            localShift,
            meta,
            standardHours,
            isDuty,
            rateDiem
        );
        setFullShift(built);
    }, [localShift, meta, standardHours, isDuty, rateDiem]);


    const commit = useCallback(() => {
        if (fullShift) {
            onShiftUpdate(id, fullShift);
        }
    }, [id, fullShift, onShiftUpdate]);

    return {
        localShift,
        update,
        commit,
    };
};