import { useCallback, useEffect, useState } from "react";

import { Shift, 
        TimeFieldType, 
        WorkDayMeta, 
        DayShift,
 } from "@/domain";
import { DomainContextType } from "@/context";


type ShiftProps = {
    domain: DomainContextType;
    id: string;
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    rateDiem: number;
    isDuty: boolean;
    onShiftUpdate: (id: string, fullShift: DayShift) => void;
};

export const useShift = ({ domain, id, shift, meta, standardHours, rateDiem, isDuty, onShiftUpdate }: ShiftProps) => {
    const { shiftMapBuilderService } = domain.builders;
    
    const [localShift, setLocalShift] = useState<Shift>(shift);

    const [fullShift, setFullShift] = useState<DayShift | null>(null);
    
    const update = useCallback((newStart: TimeFieldType, newEnd: TimeFieldType) => {
        setLocalShift({ id, start: newStart, end: newEnd });
    }, [id]);

    
    useEffect(() => {

        const built = shiftMapBuilderService.create(meta, standardHours, rateDiem)
            .withShift(localShift)
            .buildDayShift(isDuty, rateDiem);

        setFullShift(built);
    }, [localShift, meta, standardHours, isDuty, rateDiem, shiftMapBuilderService]);


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