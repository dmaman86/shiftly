import type { ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks";

export const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, initializationError } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const { search } = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", p: 4 }}
        aria-busy="true"
      >
        <CircularProgress aria-label={t("auth.loading")} />
      </Box>
    );
  } else {
    if (initializationError)
      return <Alert severity="error">{t("auth.initialization_error")}</Alert>;
    if (!user)
      return (
        <Navigate
          to={{ pathname: `/${lang}/calculation-rules`, search }}
          replace
        />
      );
    return <>{children}</>;
  }
};
