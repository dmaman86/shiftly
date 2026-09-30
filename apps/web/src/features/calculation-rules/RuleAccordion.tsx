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
  onExpand?: () => void;
};

export const RuleAccordion = ({ title, children, onExpand }: RuleAccordionProps) => {
  return (
    <Accordion elevation={0} onChange={(_, expanded) => { if (expanded) onExpand?.(); }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight="medium">{title}</Typography>
      </AccordionSummary>

      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
