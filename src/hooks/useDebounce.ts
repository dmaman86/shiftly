import { useEffect, useState } from "react";

type DebounceProps<T> = {
  value: T;
  delay?: number;
};

export const useDebounce = <T,>({ value, delay = 500 }: DebounceProps<T>) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
