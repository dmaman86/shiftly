import { SnackbarProvider, useSnackbar } from "notistack";
import { AppSnackbarContextType } from "@/app";
import { AppSnackbarContext } from "./snackbarContext";

interface SnackbarProviderProps {
  children: React.ReactNode;
}

const SnackbarBridge = ({ children }: { children: React.ReactNode }) => {
  const { enqueueSnackbar } = useSnackbar();

  const value: AppSnackbarContextType = {
    info: (message) => enqueueSnackbar(message, { variant: "info" }),
    success: (message) => enqueueSnackbar(message, { variant: "success" }),
    warning: (message) => enqueueSnackbar(message, { variant: "warning" }),
    error: (message) => enqueueSnackbar(message, { variant: "error" }),
  };

  return (
    <AppSnackbarContext.Provider value={value}>
      {children}
    </AppSnackbarContext.Provider>
  );
};

export const AppSnackbarProvider = ({ children }: SnackbarProviderProps) => {
  return (
    <SnackbarProvider
      maxSnack={2}
      autoHideDuration={3000}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <SnackbarBridge>{children}</SnackbarBridge>
    </SnackbarProvider>
  );
};
