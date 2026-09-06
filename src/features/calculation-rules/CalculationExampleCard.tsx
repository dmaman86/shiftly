import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";

import { dayToPayBreakdownVM } from "@/adapters";
import { DomainContextType } from "@/app";
import { WorkDayType } from "@/constants";
import {
  calculateDayFromShifts,
  PayBreakdownViewModel,
  Shift,
  WorkDayMeta,
} from "@/domain";
import { useGlobalState } from "@/hooks";
import { WorkParametersInputs } from "@/features/config";
import {
  dayToCompactPayBreakdownVM,
  DayDetails,
  ShiftEditorFields,
  shiftToPayBreakdownVM,
  useShiftControls,
} from "@/features/work-table";
import { formatValue } from "@/utils";
import { analyticsService } from "@/services";
import { RuleCard } from "./RuleCard";

type ShiftContribution = {
  breakdown: PayBreakdownViewModel;
};

const getCurrentIsraelDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jerusalem",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
};

const createShift = (date: string, index: number): Shift => {
  const baseDate = new Date(`${date}T00:00:00`);
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  start.setHours(index === 0 ? 8 : 16);
  end.setHours(index === 0 ? 16 : 20);

  return {
    id: crypto.randomUUID(),
    start: { date: start },
    end: { date: end },
    isDuty: false,
  };
};

type CalculationExampleCardProps = {
  defaultExpanded?: boolean;
  domain: DomainContextType;
};

type CalculationExampleShiftProps = {
  canRemove: boolean;
  contribution?: ShiftContribution;
  domain: DomainContextType;
  index: number;
  onChange: (shift: Shift) => void;
  onRemove: () => void;
  shift: Shift;
};

const CalculationExampleShift = ({
  canRemove,
  contribution,
  domain,
  index,
  onChange,
  onRemove,
  shift,
}: CalculationExampleShiftProps) => {
  const { t } = useTranslation("pages");
  const controls = useShiftControls({
    ...domain.services,
    onChange,
    shift,
  });

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Typography fontWeight={700}>
            {t("calculation_rules_page.example.shift", { number: index + 1 })}
          </Typography>

          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
            <ShiftEditorFields
              crossDay={controls.crossDay}
              crossDayLabel={t("calculation_rules_page.example.cross_day")}
              disabled={false}
              endMinutes={controls.endMinutes}
              hasError={controls.hasError}
              onChange={controls.handleChange}
              onToggleDuty={controls.toggleDuty}
              onToggleNextDay={controls.handleToggleNextDay}
              shift={shift}
              startMinutes={controls.startMinutes}
            />
            <Tooltip title={t("calculation_rules_page.example.remove_shift")}>
              <span>
                <IconButton
                  color="error"
                  disabled={!canRemove}
                  aria-label={t("calculation_rules_page.example.remove_shift")}
                  onClick={onRemove}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {contribution ? (
        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" fontWeight={700} sx={{ px: 1.5, pt: 1.5 }}>
            {t("calculation_rules_page.example.shift_contribution", {
              hours: formatValue(contribution.breakdown.actualHours),
            })}
          </Typography>
          <DayDetails
            breakdown={contribution.breakdown}
            id={`calculation-example-shift-${shift.id}`}
            showAbsence={false}
            showAllowances={false}
          />
        </Box>
      ) : (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          {t("calculation_rules_page.example.invalid_shift")}
        </Alert>
      )}
    </Paper>
  );
};

export const CalculationExampleCard = ({
  defaultExpanded = false,
  domain,
}: CalculationExampleCardProps) => {
  const { t } = useTranslation("pages");
  const { baseRate, month, standardHours, year } = useGlobalState();
  const trackedDeepLink = useRef(false);
  const [date] = useState(() => getCurrentIsraelDate());
  const [dayType, setDayType] = useState<WorkDayType>(WorkDayType.Regular);
  const [shifts, setShifts] = useState<Shift[]>(() => [createShift(date, 0)]);

  useEffect(() => {
    if (!defaultExpanded || trackedDeepLink.current) return;

    analyticsService.track({
      name: "calculation_rules_accordion_expanded",
      params: {
        section: "interactive_example",
        open_method: "deep_link",
      },
    });
    trackedDeepLink.current = true;
  }, [defaultExpanded]);

  const meta = useMemo<WorkDayMeta>(
    () => ({
      crossDayContinuation: dayType === WorkDayType.SpecialPartialStart,
      date,
      typeDay: dayType,
    }),
    [date, dayType],
  );

  const calculation = useMemo(() => {
    const validShifts = shifts
      .filter((shift) => domain.services.shiftService.isValidShiftDuration(shift))
      .sort((left, right) => left.start.date.getTime() - right.start.date.getTime());

    const { dayPayMap, shiftPayMaps } = calculateDayFromShifts({
      dayPayMapBuilder: domain.payMap.dayPayMapBuilder,
      meta,
      month,
      shifts: validShifts,
      shiftMapBuilder: domain.payMap.shiftMapBuilder,
      standardHours,
      year,
    });
    const contributionByShiftId = Object.fromEntries(
      validShifts.map((shift, index) => [
        shift.id,
        { breakdown: shiftToPayBreakdownVM(shiftPayMaps[index]) },
      ]),
    ) satisfies Record<string, ShiftContribution>;

    return {
      contributionByShiftId,
      dayBreakdown: dayToPayBreakdownVM(dayPayMap, 0),
      dayCompactBreakdown: dayToCompactPayBreakdownVM(
        dayPayMap,
        baseRate,
        0,
      ),
      earnedShabbatCreditHours: dayPayMap.earnedShabbatCredit.hours,
    };
  }, [baseRate, domain, meta, month, shifts, standardHours, year]);

  const specialStart = domain.services.dateService.minutesToTimeStr(
    domain.services.dateService.getSpecialStartMinutes(date),
  );
  const updateShift = (id: string, update: (shift: Shift) => Shift) => {
    setShifts((current) =>
      current.map((shift) => (shift.id === id ? update(shift) : shift)),
    );
  };

  return (
    <RuleCard
      title={t("calculation_rules_page.example.title")}
      collapsible
      defaultExpanded={defaultExpanded}
      id="interactive-example"
      onExpand={() =>
        analyticsService.track({
          name: "calculation_rules_accordion_expanded",
          params: {
            section: "interactive_example",
            open_method: "manual",
          },
        })
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("calculation_rules_page.example.description")}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
          },
          mb: 2,
        }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel id="calculation-example-day-type-label">
            {t("calculation_rules_page.example.day_type")}
          </InputLabel>
          <Select
            labelId="calculation-example-day-type-label"
            label={t("calculation_rules_page.example.day_type")}
            value={dayType}
            onChange={(event) => setDayType(event.target.value as WorkDayType)}
          >
            <MenuItem value={WorkDayType.Regular}>
              {t("calculation_rules_page.example.day_types.regular")}
            </MenuItem>
            <MenuItem value={WorkDayType.SpecialPartialStart}>
              {t(
                "calculation_rules_page.example.day_types.special_partial_start",
              )}
            </MenuItem>
            <MenuItem value={WorkDayType.SpecialFull}>
              {t("calculation_rules_page.example.day_types.special_full")}
            </MenuItem>
          </Select>
        </FormControl>

        <WorkParametersInputs
          idPrefix="calculationExample"
          showHelperText={false}
        />
      </Box>

      {dayType === WorkDayType.SpecialPartialStart && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("calculation_rules_page.example.special_start_notice", {
            time: specialStart,
          })}
        </Alert>
      )}

      <Stack spacing={2}>
        {shifts.map((shift, index) => (
          <CalculationExampleShift
            key={shift.id}
            canRemove={shifts.length > 1}
            contribution={calculation.contributionByShiftId[shift.id]}
            domain={domain}
            index={index}
            onChange={(nextShift) => updateShift(shift.id, () => nextShift)}
            onRemove={() =>
              setShifts((current) =>
                current.filter(
                  (currentShift) => currentShift.id !== shift.id,
                ),
              )
            }
            shift={shift}
          />
        ))}
      </Stack>

      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        <Tooltip title={t("calculation_rules_page.example.add_shift")}>
          <IconButton
            color="primary"
            aria-label={t("calculation_rules_page.example.add_shift")}
            onClick={() =>
              setShifts((current) => [
                ...current,
                createShift(date, current.length),
              ])
            }
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ p: 1.5, pb: 0 }}
        >
          <Typography variant="h6" fontWeight={700}>
            {t("calculation_rules_page.example.day_total", {
              hours: formatValue(calculation.dayBreakdown.actualHours),
            })}
          </Typography>
          <Box sx={{ textAlign: { xs: "start", sm: "end" } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {t("calculation_rules_page.example.daily_pay")}
            </Typography>
            <Typography variant="h5" color="primary.main" fontWeight={700}>
              {calculation.dayCompactBreakdown.dailySalary === undefined
                ? "—"
                : `₪${calculation.dayCompactBreakdown.dailySalary.toFixed(2)}`}
            </Typography>
          </Box>
        </Stack>
        <DayDetails
          breakdown={calculation.dayBreakdown}
          id="calculation-example-day-total"
          showAbsence={false}
        />
      </Paper>

      {calculation.earnedShabbatCreditHours > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("calculation_rules_page.example.shabbat_credit_notice", {
            hours: formatValue(calculation.earnedShabbatCreditHours),
          })}
        </Alert>
      )}
    </RuleCard>
  );
};
