import { useCallback, useEffect, useState } from "react";
import { PayRowVM } from "../vm";
import { useDebounce } from "@/hooks";

type UseSalaryRowParams = {
  initialRow: PayRowVM;
  enabled: boolean;
};

export const useSalaryRow = ({ initialRow, enabled }: UseSalaryRowParams) => {
  const [row, setRow] = useState<PayRowVM>(initialRow);

  const [inputValue, setInputValue] = useState<string>(
    initialRow.quantity.toString(),
  );

  const debouncedValue = useDebounce({ value: inputValue });

  useEffect(() => {
    setInputValue(initialRow.quantity.toString());
    setRow(initialRow);
  }, [initialRow]);

  useEffect(() => {
    if (!enabled) return;
    const parsed = parseFloat(debouncedValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== row.quantity) {
      setRow((prev) => {
        const updated: PayRowVM = {
          ...prev,
          quantity: parsed,
          total: parsed * prev.rate,
        };
        return updated;
      });
    }
  }, [debouncedValue, enabled, row.quantity]);

  const updateRate = useCallback((newRate: number) => {
    setRow((prev) => {
      const updated: PayRowVM = {
        ...prev,
        rate: newRate,
        total: prev.quantity * newRate,
      };
      return updated;
    });
  }, []);

  return {
    row,
    inputValue,
    onInputChange: setInputValue,
    updateRate,
  };
};
