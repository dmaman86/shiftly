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
