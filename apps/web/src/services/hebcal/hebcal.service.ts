import axios from "axios";
import { toApiResponse } from "@/utils";
import { buildHebcalUrl } from "./hebcal.request";

export const hebcalService = () => {
  const loadAbort = () => new AbortController();

  const getData = (start: string, end: string) => {
    const controller = loadAbort();
    const url = buildHebcalUrl(start, end);
    return {
      call: () =>
        toApiResponse(axios.get<unknown>(url, { signal: controller.signal })),
      controller,
    };
  };

  return { getData };
};
