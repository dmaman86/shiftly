import { createContext } from "react";
import { AppSnackbarContextType } from "@/app/domain";

export const AppSnackbarContext = createContext<AppSnackbarContextType | null>(
  null,
);
