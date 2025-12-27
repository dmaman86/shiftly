import { Card, CardContent, Divider, Typography } from "@mui/material";

type RuleCardProps = {
  title: string;
  children: React.ReactNode;
};

export const RuleCard = ({ title, children }: RuleCardProps) => {
  return (
    <Card sx={{ mb: 3 }}>
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
