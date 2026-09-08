import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";

import { PayBreakdownViewModel } from "@/domain";
import { formatValue } from "@/utils";
import { breakdownToDetailGroups, DetailItem } from "../../mappers";
import { shabbatCreditHoursFromSpecial } from "../../helpers";

type DayCardDetailsProps = {
  breakdown: PayBreakdownViewModel;
  showAbsence?: boolean;
  showShabbatCreditUsed?: boolean;
  showGeneratedAlert?: boolean;
};

const GroupValues = ({ items }: { items: DetailItem[] }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      gap: 1,
    }}
  >
    {items.map(({ label, value }) => (
      <Box key={label} sx={{ textAlign: "center" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", fontSize: "0.7rem" }}
        >
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {formatValue(value)}
        </Typography>
      </Box>
    ))}
  </Box>
);

/**
 * Mobile equivalent of DayDetails: same breakdown groups, but each group is
 * independently collapsible (an accordion nested inside the day card's own
 * expand toggle) instead of DayDetails' side-by-side desktop grid, since a
 * phone-width column has no room to show every group open at once.
 */
export const DayCardDetails = ({
  breakdown,
  showAbsence = true,
  showShabbatCreditUsed = false,
  showGeneratedAlert = true,
}: DayCardDetailsProps) => {
  const { t } = useTranslation("work-table");
  const groups = breakdownToDetailGroups(
    breakdown,
    t,
    showAbsence,
    true,
    showShabbatCreditUsed,
  );
  const generatedShabbatCreditHours = shabbatCreditHoursFromSpecial(
    breakdown.special,
  );

  return (
    <Box>
      {showGeneratedAlert && generatedShabbatCreditHours > 0 && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          {t("day_details.shabbat_credit_generated", {
            hours: formatValue(generatedShabbatCreditHours),
          })}
        </Alert>
      )}
      {groups.map((group) => (
        <Accordion
          key={group.key}
          elevation={0}
          disableGutters
          square
          sx={{
            "&:before": { display: "none" },
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:last-of-type": { borderBottom: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.75 } }}
          >
            <Typography variant="body2" fontWeight={600}>
              {group.title ?? group.sections?.map((section) => section.label).join(" / ")}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {group.items && <GroupValues items={group.items} />}
            {group.sections && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {group.sections.map((section) => (
                  <Box key={section.label}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5, fontWeight: 600 }}
                    >
                      {section.label}
                    </Typography>
                    <GroupValues items={section.items} />
                  </Box>
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
