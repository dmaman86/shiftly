import { Typography } from "@mui/material";

type InfoDialogContentProps = {
  paragraphs: string[];
};

export const InfoDialogContent = ({ paragraphs }: InfoDialogContentProps) => {
  return (
    <>
      {paragraphs.map((text, index) => (
        <Typography key={index} paragraph>
          {text}
        </Typography>
      ))}
    </>
  );
};
