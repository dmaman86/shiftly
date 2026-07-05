import { useCallback, useRef, useState } from "react";

type UseEditableQuantityParams = {
  value: number;
  enabled: boolean;
  delay?: number;
  onCommit: (value: number) => void;
};

export const useEditableQuantity = ({
  value,
  enabled,
  delay = 500,
  onCommit,
}: UseEditableQuantityParams) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
