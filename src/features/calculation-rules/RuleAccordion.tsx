import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type RuleAccordionProps = {
  title: string;
  children: React.ReactNode;
};

export const RuleAccordion = ({ title, children }: RuleAccordionProps) => {
  return (
    <Accordion elevation={0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight="medium">{title}</Typography>
      </AccordionSummary>

      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
