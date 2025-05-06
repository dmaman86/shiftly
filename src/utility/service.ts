import axios from "axios";

export const service = (() => {
  const loadAbort = () => new AbortController();

  const getData = (start: string, end: string) => {
    const controller = loadAbort();
    return {
      call: axios.get(
        `https://www.hebcal.com/hebcal/?v=1&start=${start}&end=${end}&cfg=json&maj=on&mod=on&nx=on&s=on`,
        { signal: controller.signal },
      ),
      controller,
    };
  };

  return { getData };
})();
