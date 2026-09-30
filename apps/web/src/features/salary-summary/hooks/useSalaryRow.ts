import { useCallback, useRef, useState } from "react";
import { PayRowVM } from "../vm";

type UseSalaryRowParams = {
  initialRow: PayRowVM;
  enabled: boolean;
  delay?: number;
};

export const useSalaryRow = ({ initialRow, enabled, delay = 500 }: UseSalaryRowParams) => {
  const [row, setRow] = useState<PayRowVM>(initialRow);
  const [inputValue, setInputValue] = useState<string>(initialRow.quantity.toString());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onInputChange = useCallback(
    (raw: string) => {
      setInputValue(raw);
      if (!enabled) return;

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed >= 0) {
          setRow((prev) => {
            if (parsed === prev.quantity) return prev;
            return { ...prev, quantity: parsed, total: parsed * prev.rate };
          });
        }
      }, delay);
    },
    [enabled, delay],
  );

  const updateRate = useCallback((newRate: number) => {
    setRow((prev) => ({ ...prev, rate: newRate, total: prev.quantity * newRate }));
  }, []);

  return { row, inputValue, onInputChange, updateRate };
};
