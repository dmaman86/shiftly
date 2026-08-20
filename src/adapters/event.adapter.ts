import {
  CalendarEventKind,
  type CalendarEvent,
  type CalendarEventMap,
} from "@/domain";

interface HebcalItem {
  date: string;
  title: string;
  category: string;
  subcat?: string;
  yomtov?: boolean;
}

interface HolidayTitleRule extends CalendarEvent {
  title: string;
}

const HOLIDAY_TITLE_RULES: readonly HolidayTitleRule[] = [
  {
    title: "Rosh Hashana II",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "rosh_hashana_2",
  },
  {
    title: "Rosh Hashana",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "rosh_hashana",
  },
  {
    title: "Yom Kippur",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "yom_kippur",
  },
  {
    title: "Sukkot I",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "sukkot",
  },
  {
    title: "Shmini Atzeret",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "shmini_atzeret",
  },
  {
    title: "Pesach I",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "pesach",
  },
  {
    title: "Pesach VII",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "pesach_7",
  },
  {
    title: "Yom HaAtzma'ut",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "yom_haatzmaut",
  },
  {
    title: "Shavuot I",
    kind: CalendarEventKind.PaidHoliday,
    holidayKey: "shavuot",
  },
  {
    title: "Erev Rosh Hashana",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_rosh_hashana",
  },
  {
    title: "Erev Yom Kippur",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_yom_kippur",
  },
  {
    title: "Erev Sukkot",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_sukkot",
  },
  {
    title: "Erev Pesach",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_pesach",
  },
  {
    title: "Erev Shavuot",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "erev_shavuot",
  },
  {
    title: "Yom HaZikaron",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "yom_hazikaron",
  },
  {
    title: "Sukkot VII (Hoshana Raba)",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "hoshana_rabba",
  },
  {
    title: "Pesach VI (CH'M)",
    kind: CalendarEventKind.PartialHolidayStart,
    holidayKey: "pesach_6",
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRequiredString = (
  item: Record<string, unknown>,
  field: "date" | "title" | "category",
  index: number,
): string => {
  const value = item[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid Hebcal response: items[${index}].${field} must be a non-empty string`,
    );
  }
  return value;
};

const readOptionalString = (
  item: Record<string, unknown>,
  field: "subcat",
  index: number,
): string | undefined => {
  const value = item[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(
      `Invalid Hebcal response: items[${index}].${field} must be a string`,
    );
  }
  return value;
};

const readOptionalBoolean = (
  item: Record<string, unknown>,
  field: "yomtov",
  index: number,
): boolean | undefined => {
  const value = item[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(
      `Invalid Hebcal response: items[${index}].${field} must be a boolean`,
    );
  }
  return value;
};

const getDateKey = (date: string, index: number): string => {
  const dateKey = date.slice(0, 10);
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(
      `Invalid Hebcal response: items[${index}].date has an invalid format`,
    );
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error(
      `Invalid Hebcal response: items[${index}].date is not a valid date`,
    );
  }

  return dateKey;
};

const parseItems = (payload: unknown): HebcalItem[] => {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error("Invalid Hebcal response: items must be an array");
  }

  return payload.items.map((value, index) => {
    if (!isRecord(value)) {
      throw new Error(`Invalid Hebcal response: items[${index}] must be an object`);
    }

    return {
      date: readRequiredString(value, "date", index),
      title: readRequiredString(value, "title", index),
      category: readRequiredString(value, "category", index),
      subcat: readOptionalString(value, "subcat", index),
      yomtov: readOptionalBoolean(value, "yomtov", index),
    };
  });
};

const normalizeTitle = (title: string): string =>
  title
    .trim()
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/'{2,}/g, "'");

const findTitleRule = (title: string): HolidayTitleRule | undefined =>
  HOLIDAY_TITLE_RULES.find((rule) => {
    if (!title.startsWith(rule.title)) return false;
    const nextCharacter = title[rule.title.length];
    return nextCharacter === undefined || nextCharacter === " ";
  });

const classifyHoliday = (item: HebcalItem): CalendarEvent | undefined => {
  if (item.category !== "holiday") return undefined;

  const rule = findTitleRule(normalizeTitle(item.title));
  if (rule) {
    const { kind, holidayKey } = rule;
    return { kind, holidayKey };
  }

  if (item.yomtov === true) {
    return { kind: CalendarEventKind.PaidHoliday };
  }

  return undefined;
};

const appendUniqueEvent = (
  eventMap: CalendarEventMap,
  dateKey: string,
  event: CalendarEvent,
): void => {
  const events = eventMap[dateKey] ?? [];
  if (
    !events.some(
      (current) =>
        current.kind === event.kind && current.holidayKey === event.holidayKey,
    )
  ) {
    events.push(event);
    eventMap[dateKey] = events;
  }
};

export const buildEventMap = (payload: unknown): CalendarEventMap => {
  const eventMap: CalendarEventMap = {};

  parseItems(payload).forEach((item, index) => {
    const dateKey = getDateKey(item.date, index);
    const event = classifyHoliday(item);
    if (event) appendUniqueEvent(eventMap, dateKey, event);
  });

  return eventMap;
};
