import axios from "axios";

export const hebcalService = () => {
  const loadAbort = () => new AbortController();

  const buildUrl = (start: string, end: string): string => {
    const baseUrl = "https://www.hebcal.com/hebcal/";
    const params = `?v=1&start=${start}&end=${end}&cfg=json&maj=on&mod=on&nx=on&s=on`;
    return `${baseUrl}${params}`;
  };

  const getData = (start: string, end: string) => {
    const controller = loadAbort();
    const url = buildUrl(start, end);
    return {
      call: () => axios.get(url, { signal: controller.signal }),
      controller,
    };
  };

  return { getData };
};
