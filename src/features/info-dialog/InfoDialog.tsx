import { SvgIconComponent } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

type InfoDialogProps = {
  open: boolean;
  title: string;
  icon?: SvgIconComponent;
  onClose: () => void;
  children: React.ReactNode;
};

export const InfoDialog = ({
  open,
  title,
  icon: Icon,
  onClose,
  children,
}: InfoDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {Icon && <Icon fontSize="small" />}
          {title}
        </Box>
      </DialogTitle>

      <DialogContent dividers>{children}</DialogContent>

      <DialogActions>
        <Button onClick={onClose}>לסגור</Button>
      </DialogActions>
    </Dialog>
  );
};
