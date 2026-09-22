export const fieldShiftPercent: Record<string, number> = {
  hours50: 0.5,
  hours20: 0.2,
  hours100: 1,
  hours125: 1.25,
  hours150: 1.5,
  hours200: 2,
};

export const fieldMinutes: Record<string, number> = {
  fullDay: 1440,
  minutes: 60,
  min06: 6 * 60,
  min14: 14 * 60,
  min17: 17 * 60,
  min18: 18 * 60,
  min22: 22 * 60,
};

export const regularFields = ["hours100", "hours125", "hours150"] as const;
export const extraFields = ["hours20", "hours50"] as const;
export const specialFields = ["shabbat150", "shabbat200"] as const;

export enum WorkDayStatus {
  normal = "normal",
  vacation = "vacation",
  sick = "sick",
}

export enum WorkDayType {
  Regular = "Regular",
  SpecialPartialStart = "SpecialPartialStart",
  SpecialFull = "SpecialFull",
}

export type HolidayKey =
  | "rosh_hashana"
  | "rosh_hashana_2"
  | "yom_kippur"
  | "sukkot"
  | "shmini_atzeret"
  | "pesach"
  | "pesach_6"
  | "pesach_7"
  | "yom_haatzmaut"
  | "shavuot"
  | "erev_rosh_hashana"
  | "erev_yom_kippur"
  | "erev_sukkot"
  | "erev_pesach"
  | "erev_shavuot"
  | "yom_hazikaron"
  | "hoshana_rabba";
