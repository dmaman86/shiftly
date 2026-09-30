import { useContext } from "react";

import { AppSnackbarContext } from "@/app/providers";

export const useAppSnackbar = () => {
  const context = useContext(AppSnackbarContext);

  if (!context) {
    throw new Error(
      "useAppSnackbar must be used within an AppSnackbarProvider",
    );
  }
  return context;
};
