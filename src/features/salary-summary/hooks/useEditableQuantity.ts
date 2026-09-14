import { useCallback, useRef, useState } from "react";

type UseEditableQuantityParams = {
  value: number;
  enabled: boolean;
  delay?: number;
  onCommit: (value: number) => void;
};

const formatEditableValue = (value: number): string =>
  Math.abs(value) < 0.005 ? "0.00" : value.toFixed(2);

export const useEditableQuantity = ({
  value,
  enabled,
  delay = 500,
  onCommit,
}: UseEditableQuantityParams) => {
  const [inputValue, setInputValue] = useState(formatEditableValue(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setInputValue(formatEditableValue(value));
  }

  const onInputChange = useCallback(
    (raw: string) => {
      setInputValue(raw);
      if (!enabled) return;

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed >= 0 && parsed !== value) {
          onCommit(parsed);
        }
      }, delay);
    },
    [enabled, delay, value, onCommit],
  );

  return { inputValue, onInputChange };
};
