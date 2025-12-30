import { useEffect, useState } from "react";

type DebounceProps = {
  value: string;
  delay?: number;
};

export const useDebounce = ({ value, delay = 500 }: DebounceProps) => {
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
