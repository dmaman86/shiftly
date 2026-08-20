import axios from "axios";

export const hebcalService = () => {
  const loadAbort = () => new AbortController();

  const buildUrl = (start: string, end: string): string => {
    const baseUrl = "https://www.hebcal.com/hebcal/";
    const params = new URLSearchParams({
      v: "1",
      start,
      end,
      cfg: "json",
      i: "on",
      lg: "s",
      maj: "on",
      mod: "on",
      nx: "on",
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const getData = (start: string, end: string) => {
    const controller = loadAbort();
    const url = buildUrl(start, end);
    return {
      call: () => axios.get<unknown>(url, { signal: controller.signal }),
      controller,
    };
  };

  return { getData };
};
