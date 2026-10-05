import { WorkDayType } from "../constants/index.js";
import type { DateService } from "../services/date.service.js";
import type {
  NormalizedShiftTimeline,
  TimelineInterval,
  WorkDayMeta,
} from "../types/types.js";

const MINUTES_PER_DAY = 1440;

type ClassificationInput = {
  timeline: NormalizedShiftTimeline;
  meta: WorkDayMeta;
  dateService: DateService;
};

/**
 * Classifies a normalized shift by calendar category only. Salary rates and
 * additions are intentionally resolved by later pipelines.
 */
export const classifyShiftTimeline = ({
  timeline,
  meta,
  dateService,
}: ClassificationInput): TimelineInterval[] => {
  const { start, end } = timeline.point;
  if (start >= end) return [];

  const intervals: TimelineInterval[] = [];

  const firstDate = dateService.createDateWithTime(meta.date);
  const lastDayOffset = Math.floor((end - 1) / MINUTES_PER_DAY);
  let previousTypeDay: WorkDayType | undefined;

  for (let dayOffset = 0; dayOffset <= lastDayOffset; dayOffset += 1) {
    const dayStart = dayOffset * MINUTES_PER_DAY;
    const dayEnd = Math.min(end, dayStart + MINUTES_PER_DAY);
    const date = dateService.formatDate(
      dateService.addDaysToDate(firstDate, dayOffset),
    );
    const typeDay =
      dayOffset === 0
        ? meta.typeDay
        : meta.crossDayContinuation
          ? WorkDayType.SpecialFull
          : WorkDayType.Regular;

    const continuationEnd = dayStart + 6 * 60;
    const carriesSpecialIntoDay =
      dayOffset > 0 &&
      (previousTypeDay === WorkDayType.SpecialFull ||
        (dayOffset === 1 &&
          meta.typeDay === WorkDayType.SpecialPartialStart &&
          meta.crossDayContinuation));
    const needsContinuationSegment =
      carriesSpecialIntoDay && typeDay !== WorkDayType.SpecialFull;

    if (needsContinuationSegment) {
      appendSpecialInterval({
        intervals,
        start: Math.max(start, dayStart),
        end: Math.min(dayEnd, continuationEnd),
        date,
        dayOffset,
        sourceShiftId: timeline.sourceShiftId,
      });
    }

    appendDayIntervals({
      intervals,
      start: Math.max(
        start,
        needsContinuationSegment ? continuationEnd : dayStart,
      ),
      end: dayEnd,
      typeDay,
      date,
      dayOffset,
      dateService,
      sourceShiftId: timeline.sourceShiftId,
    });

    previousTypeDay = typeDay;
  }

  return intervals;
};

const appendSpecialInterval = (params: {
  intervals: TimelineInterval[];
  start: number;
  end: number;
  date: string;
  dayOffset: number;
  sourceShiftId: string;
}) => {
  if (params.start >= params.end) return;

  params.intervals.push({
    point: { start: params.start, end: params.end },
    category: "special",
    calendarDate: params.date,
    dayOffset: params.dayOffset,
    sourceShiftId: params.sourceShiftId,
  });
};

const appendDayIntervals = (params: {
  intervals: TimelineInterval[];
  start: number;
  end: number;
  typeDay: WorkDayType;
  date: string;
  dayOffset: number;
  dateService: DateService;
  sourceShiftId: string;
}) => {
  const {
    intervals,
    start,
    end,
    typeDay,
    date,
    dayOffset,
    dateService,
    sourceShiftId,
  } = params;
  if (start >= end) return;

  if (typeDay === WorkDayType.SpecialFull) {
    intervals.push({
      point: { start, end },
      category: "special",
      calendarDate: date,
      dayOffset,
      sourceShiftId,
    });
    return;
  }

  if (typeDay === WorkDayType.Regular) {
    intervals.push({
      point: { start, end },
      category: "regular",
      calendarDate: date,
      dayOffset,
      sourceShiftId,
    });
    return;
  }

  const specialStart = dateService.getSpecialStartMinutes(date);
  const absoluteSpecialStart =
    Math.floor(start / MINUTES_PER_DAY) * MINUTES_PER_DAY + specialStart;
  const regularEnd = Math.min(end, absoluteSpecialStart);

  if (start < regularEnd) {
    intervals.push({
      point: { start, end: regularEnd },
      category: "regular",
      calendarDate: date,
      dayOffset,
      sourceShiftId,
    });
  }

  const specialStartForInterval = Math.max(start, absoluteSpecialStart);
  if (specialStartForInterval < end) {
    intervals.push({
      point: { start: specialStartForInterval, end },
      category: "special",
      calendarDate: date,
      dayOffset,
      sourceShiftId,
    });
  }
};
