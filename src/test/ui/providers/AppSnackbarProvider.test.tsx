import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppSnackbarProvider } from "@/app/providers/snackbar/AppSnackbarProvider";
import { useAppSnackbar } from "@/hooks/useAppSnackbar";

describe("AppSnackbarProvider", () => {
  it("keeps the context API stable when its children rerender", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppSnackbarProvider>{children}</AppSnackbarProvider>
    );
    const { result } = renderHook(
      () => {
        const [, rerender] = useState(0);
        return { snackbar: useAppSnackbar(), rerender };
      },
      { wrapper },
    );
    const initialSnackbar = result.current.snackbar;

    act(() => result.current.rerender((value) => value + 1));

    expect(result.current.snackbar).toBe(initialSnackbar);
  });
});
