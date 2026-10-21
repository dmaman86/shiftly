import {
  CalendarEventKind,
  type CalendarEvent,
  type CalendarEventMap,
} from "@shiftly/domain";

import type {
  IsraeliHoliday,
  IsraeliHolidayFact,
} from "@/services/calendar/israeliHolidays";

/** Shiftly's classification of each Israeli holiday for pay purposes. */
const HOLIDAY_EVENTS: Readonly<Record<IsraeliHoliday, CalendarEvent>> = {
  rosh_hashana: {
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "rosh_hashana",
  },
  rosh_hashana_2: {
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "rosh_hashana_2",
  },
  yom_kippur: { kind: CalendarEventKind.PaidHoliday, holidayKey: "yom_kippur" },
  sukkot: { kind: CalendarEventKind.PaidHoliday, holidayKey: "sukkot" },
  shmini_atzeret: {
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "shmini_atzeret",
  },
  pesach: { kind: CalendarEventKind.PaidHoliday, holidayKey: "pesach" },
  pesach_7: { kind: CalendarEventKind.PaidHoliday, holidayKey: "pesach_7" },
  yom_haatzmaut: {
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "yom_haatzmaut",
  },
  shavuot: { kind: CalendarEventKind.PaidHoliday, holidayKey: "shavuot" },
  erev_rosh_hashana: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_rosh_hashana",
  },
  erev_yom_kippur: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_yom_kippur",
  },
  erev_sukkot: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_sukkot",
  },
  erev_pesach: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_pesach",
  },
  erev_shavuot: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_shavuot",
  },
  yom_hazikaron: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "yom_hazikaron",
  },
  hoshana_rabba: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "hoshana_rabba",
  },
  pesach_6: {
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "pesach_6",
  },
};

export const buildHolidayEventMap = (
  facts: readonly IsraeliHolidayFact[],
): CalendarEventMap => {
  const eventMap: CalendarEventMap = {};
  for (const { date, holiday } of facts) {
    (eventMap[date] ??= []).push({ ...HOLIDAY_EVENTS[holiday] });
  }
  return eventMap;
};
