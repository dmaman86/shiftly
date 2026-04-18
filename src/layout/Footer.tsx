import { Box, Typography, Link, Stack } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import EmailIcon from "@mui/icons-material/Email";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  INFO_DIALOG_CONTENT,
  InfoDialog,
  InfoDialogContent,
  type InfoDialogKey,
} from "@/features";
import { useDirection } from "@/hooks";

const DIALOG_I18N_KEYS: Record<
  InfoDialogKey,
  {
    title:
      | "info_dialogs.about.title"
      | "info_dialogs.disclaimer.title"
      | "info_dialogs.privacy.title";
    paragraphs:
      | "info_dialogs.about.paragraphs"
      | "info_dialogs.disclaimer.paragraphs"
      | "info_dialogs.privacy.paragraphs";
  }
> = {
  about: {
    title: "info_dialogs.about.title",
    paragraphs: "info_dialogs.about.paragraphs",
  },
  disclaimer: {
    title: "info_dialogs.disclaimer.title",
    paragraphs: "info_dialogs.disclaimer.paragraphs",
  },
  privacy: {
    title: "info_dialogs.privacy.title",
    paragraphs: "info_dialogs.privacy.paragraphs",
  },
};

export const Footer = () => {
  const { t } = useTranslation();
  const { direction } = useDirection();
  const [openDialog, setOpenDialog] = useState<InfoDialogKey | null>(null);

  const dialogConfig = openDialog ? INFO_DIALOG_CONTENT[openDialog] : null;

  const closeDialog = () => setOpenDialog(null);

  const infoKeys = Object.keys(INFO_DIALOG_CONTENT) as InfoDialogKey[];

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        backgroundColor: "#f5f5f5",
      }}
      dir={direction}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "center", md: "stretch" },
          }}
        >
          {/* Column 1: Copyright */}
          <Box
            sx={{
              flex: { xs: "none", md: 1 },
              display: "flex",
              alignItems: "center",
              textAlign: { xs: "center", md: "start" },
            }}
          >
            <Typography variant="body2" color="textSecondary">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </Typography>
          </Box>

          {/* Column 2: Info Links */}
          <Box
            sx={{
              flex: { xs: "none", md: 1 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
                width: "100%",
              }}
            >
              {infoKeys.map((key) => {
                const { icon: Icon } = INFO_DIALOG_CONTENT[key];

                return (
                  <Box
                    key={key}
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Link
                      component="button"
                      underline="hover"
                      color="textSecondary"
                      variant="body2"
                      onClick={() => setOpenDialog(key)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Icon fontSize="small" />
                      {t(DIALOG_I18N_KEYS[key].title)}
                    </Link>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Column 3: External Links */}
          <Box
            sx={{
              flex: { xs: "none", md: 1 },
              display: "flex",
              alignItems: "center",
              justifyContent: { xs: "center", md: "flex-end" },
            }}
          >
            <Stack direction="row" spacing={2}>
              <Link
                component="button"
                onClick={() =>
                  window.open("https://github.com/dmaman86/shiftly", "_blank")
                }
                underline="hover"
                variant="body2"
                color="textSecondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <GitHubIcon fontSize="small" />
                GitHub Repo
              </Link>
              <Link
                component="button"
                onClick={() =>
                  (window.location.href = "mailto:dmaman86@gmail.com")
                }
                underline="hover"
                variant="body2"
                color="textSecondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <EmailIcon fontSize="small" />
                {t("footer.contact")}
              </Link>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {openDialog && dialogConfig && (
        <InfoDialog
          open
          title={t(DIALOG_I18N_KEYS[openDialog].title)}
          icon={dialogConfig.icon}
          onClose={closeDialog}
        >
          <InfoDialogContent
            paragraphs={
              t(DIALOG_I18N_KEYS[openDialog].paragraphs, {
                returnObjects: true,
              }) as string[]
            }
          />
        </InfoDialog>
      )}
    </Box>
  );
};
