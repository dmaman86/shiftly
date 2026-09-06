import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  CardContent,
  Divider,
  Typography,
} from "@mui/material";

type RuleCardProps = {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  id?: string;
  onExpand?: () => void;
};

const cardSx = {
  mb: 3,
  transition: "all 0.2s",
  "&:hover": {
    boxShadow: 2,
  },
};

export const RuleCard = ({
  title,
  children,
  collapsible = false,
  defaultExpanded = false,
  id,
  onExpand,
}: RuleCardProps) => {
  if (collapsible) {
    return (
      <Accordion
        id={id}
        disableGutters
        defaultExpanded={defaultExpanded}
        onChange={(_, expanded) => {
          if (expanded) onExpand?.();
        }}
        sx={{
          ...cardSx,
          "&::before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
        </AccordionSummary>

        <Divider />

        <AccordionDetails sx={{ p: 2, pt: 1 }}>{children}</AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Card id={id} sx={cardSx}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {title}
        </Typography>

        <Divider sx={{ mb: 1 }} />

        {children}
      </CardContent>
    </Card>
  );
};
