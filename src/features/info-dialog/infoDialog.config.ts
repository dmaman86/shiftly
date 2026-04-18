import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export type InfoDialogKey = "about" | "disclaimer" | "privacy";

export type InfoDialogConfig = {
  icon: SvgIconComponent;
};

export const INFO_DIALOG_CONTENT: Record<InfoDialogKey, InfoDialogConfig> = {
  about: { icon: InfoOutlinedIcon },
  disclaimer: { icon: GavelOutlinedIcon },
  privacy: { icon: PrivacyTipOutlinedIcon },
};
