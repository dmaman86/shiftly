import { Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { analyticsService } from "@/services";

export const CalculationHelpLinks = ({
  source,
}: {
  source: "daily" | "monthly";
}) => {
  const { t } = useTranslation("pages", { keyPrefix: "calculation_help" });

  return (
    <Typography variant="body2" color="text.secondary">
      {t("intro")}{" "}
      <Link component={RouterLink} to="../calculation-rules">
        {t("rules")}
      </Link>
      {" · "}
      <Link
        component={RouterLink}
        to="../calculation-rules#interactive-example"
        onClick={() =>
          analyticsService.track({
            name: "calculation_example_link_clicked",
            params: { source },
          })
        }
      >
        {t("example")}
      </Link>
      {" · "}
      <Link
        component={RouterLink}
        to="../calculation-rules#demo"
        onClick={() =>
          analyticsService.track({
            name: "calculation_demo_link_clicked",
            params: { source },
          })
        }
      >
        {t("demo")}
      </Link>
    </Typography>
  );
};
