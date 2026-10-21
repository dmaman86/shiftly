import { toJewishDate } from "jewish-date";

/**
 * Holidays of the Israeli calendar that Shiftly classifies. This module only
 * states when each one falls; whether a day is paid is decided by
 * adapters/holiday.adapter.ts.
 */
export type IsraeliHoliday =
  | "erev_rosh_hashana"
  | "rosh_hashana"
  | "rosh_hashana_2"
  | "erev_yom_kippur"
  | "yom_kippur"
  | "erev_sukkot"
  | "sukkot"
  | "hoshana_rabba"
  | "shmini_atzeret"
  | "erev_pesach"
  | "pesach"
  | "pesach_6"
  | "pesach_7"
  | "yom_hazikaron"
  | "yom_haatzmaut"
  | "erev_shavuot"
  | "shavuot";

export interface IsraeliHolidayFact {
  /** YYYY-MM-DD */
  date: string;
  holiday: IsraeliHoliday;
}

// Israel observes one day of each festival, so no second diaspora days.
const FIXED_HOLIDAYS: Readonly<Record<string, IsraeliHoliday>> = {
  "Elul-29": "erev_rosh_hashana",
  "Tishri-1": "rosh_hashana",
  "Tishri-2": "rosh_hashana_2",
  "Tishri-9": "erev_yom_kippur",
  "Tishri-10": "yom_kippur",
  "Tishri-14": "erev_sukkot",
  "Tishri-15": "sukkot",
  "Tishri-21": "hoshana_rabba",
  "Tishri-22": "shmini_atzeret",
  "Nisan-14": "erev_pesach",
  "Nisan-15": "pesach",
  "Nisan-20": "pesach_6",
  "Nisan-21": "pesach_7",
  "Sivan-5": "erev_shavuot",
  "Sivan-6": "shavuot",
};

const FRIDAY = 5;
const SATURDAY = 6;
const MONDAY = 1;

/**
 * Yom HaAtzmaut is 5 Iyar unless it would touch Shabbat: moved back to
 * Thursday when 5 Iyar falls on Friday (4 Iyar) or Saturday (3 Iyar), and
 * postponed to Tuesday (6 Iyar) when it falls on Monday (rule in force since
 * 2004). 5 Iyar never falls on Sunday, Tuesday or Thursday. Yom HaZikaron is
 * always the day before.
 */
const yomHaatzmautDay = (weekdayOfFiveIyar: number): number => {
  if (weekdayOfFiveIyar === FRIDAY) return 4;
  if (weekdayOfFiveIyar === SATURDAY) return 3;
  if (weekdayOfFiveIyar === MONDAY) return 6;
  return 5;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseIsoDate = (value: string): Date => {
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error(`Invalid date "${value}": expected YYYY-MM-DD`);
  const [, year, month, day] = match.map(Number);
  // Noon keeps the calendar day stable across DST transitions.
  const date = new Date(year, month - 1, day, 12);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date "${value}"`);
  }
  return date;
};

const formatIsoDate = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const holidayOn = (date: Date): IsraeliHoliday | undefined => {
  const { monthName, day } = toJewishDate(date);
  const fixed = FIXED_HOLIDAYS[`${monthName}-${day}`];
  if (fixed) return fixed;

  if (monthName !== "Iyyar" || day < 2 || day > 6) return undefined;
  const weekdayOfFiveIyar = (date.getDay() + (5 - day) + 7) % 7;
  const independenceDay = yomHaatzmautDay(weekdayOfFiveIyar);
  if (day === independenceDay) return "yom_haatzmaut";
  if (day === independenceDay - 1) return "yom_hazikaron";
  return undefined;
};

/** Israeli holidays from `start` to `end`, both inclusive, in date order. */
export const israeliHolidaysBetween = (
  start: string,
  end: string,
): IsraeliHolidayFact[] => {
  const last = parseIsoDate(end);
  const facts: IsraeliHolidayFact[] = [];
  for (
    let date = parseIsoDate(start);
    date <= last;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12)
  ) {
    const holiday = holidayOn(date);
    if (holiday) facts.push({ date: formatIsoDate(date), holiday });
  }
  return facts;
};
