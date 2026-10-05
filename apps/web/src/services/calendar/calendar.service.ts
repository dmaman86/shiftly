import axios from "axios";
import { toApiResponse } from "@/utils";

/**
 * Serves the pre-generated holiday calendar from public/calendar/{year}.json
 * (see scripts/generate-calendar.ts). Same-origin static files remove the
 * runtime dependency on Hebcal availability.
 */
export const calendarService = () => {
  const buildUrl = (year: number): string =>
    `${import.meta.env.BASE_URL}calendar/${year}.json`;

  const getYear = (year: number) =>
    toApiResponse(axios.get<unknown>(buildUrl(year)));

  return { getYear };
};
