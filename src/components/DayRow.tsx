import React, { useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Checkbox,
  Stack,
  TableCell,
  TableRow,
  IconButton,
  Divider,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import AddIcon from "@mui/icons-material/Add";


import { useDay, useGlobalState, useWorkDays } from "@/hooks";
import { TimeFieldType, WorkDayMeta } from "@/domain";
import { WorkDayStatus } from "@/constants";
import { PayBreakdownRow } from "./PayBreakdownRow";
import { ShiftRow } from "./ShiftRow";
import { DateUtils } from "@/utils";

type DayRowProps = {
    meta: WorkDayMeta;
};

export const DayRow = ({ meta }: DayRowProps) => {
    const { standardHours, baseRate, updateBreakdownForDay, globalBreakdown } = useGlobalState();
    const { isSpecialFullDay, getHebrewDay } = useWorkDays();
    
    const { status,
        setStatus,
        payMap,
        shiftList,
        setShiftList,
        addShift,
        updateShift,
        removeShift,
     } = useDay({ meta, standardHours, baseRate, rateDiem: globalBreakdown.rateDiem });

    const specialFullDay = isSpecialFullDay(meta.date);
    const isEditable = status === WorkDayStatus.normal;

    const handleStatusChanged = useCallback((newStatus: WorkDayStatus) => {
        setStatus(newStatus);
        setShiftList([]);
    }, [setStatus, setShiftList]);

    const handleAddShift = useCallback(() => {
        if(status !== WorkDayStatus.normal) return;
        const id = uuidv4();
        const time = DateUtils.createDateWithTime(meta.date);
        const start: TimeFieldType = { date: time, minutes: 0 };
        const end: TimeFieldType = { date: time, minutes: 0 };
        addShift({ id, start, end });
    }, [status, meta.date, addShift]);

    useEffect(() => {
        updateBreakdownForDay(meta.date, payMap);
    }, [payMap, meta.date]);

    return (
        <TableRow key={meta.date}>
            <TableCell>{getHebrewDay(meta.date)}</TableCell>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TableCell>
                {!specialFullDay && (
                    <Checkbox
                        checked={status === WorkDayStatus.sick}
                        onChange={(e) =>
                            handleStatusChanged(
                            e.target.checked ? WorkDayStatus.sick : WorkDayStatus.normal,
                            )
                        }
                    />
                )}
                </TableCell>
                <TableCell>
                {!specialFullDay && (
                    <Checkbox
                        checked={status === WorkDayStatus.vacation}
                        onChange={(e) =>
                            handleStatusChanged(
                            e.target.checked
                                ? WorkDayStatus.vacation
                                : WorkDayStatus.normal,
                            )
                        }
                    />
                )}
                </TableCell>
                <TableCell>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        {
                            isEditable && (
                                <>
                                    <Box display="flex" flexDirection="column" alignItems="center" pt={1}>
                                        <IconButton size="small" onClick={() => handleAddShift()}>
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    {
                                        shiftList.length > 0 && (
                                            <>
                                                <Divider orientation="vertical" flexItem />
                                                <Stack spacing={1}>
                                                    {shiftList.map((item, index) => (
                                                        <React.Fragment key={item.id}>
                                                            <ShiftRow
                                                                shift={item.shift}
                                                                meta={meta}
                                                                standardHours={standardHours}
                                                                rateDiem={globalBreakdown.rateDiem}

                                                                isEditable={isEditable}
                                                                onShiftUpdate={updateShift}
                                                                onRemove={removeShift}
                                                            />
                                                            {index < shiftList.length - 1 && <Divider />}
                                                        </React.Fragment>
                                                    ))}
                                                </Stack>
                                            </>
                                        )
                                    }
                                </>
                            )
                        }                        
                    </Stack>
                </TableCell>
            </LocalizationProvider>
            <PayBreakdownRow breakdown={payMap} />
        </TableRow>
  );
};