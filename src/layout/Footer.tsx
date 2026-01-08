import { Box, Typography, Link, Stack } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import EmailIcon from "@mui/icons-material/Email";
import { useState } from "react";
import {
  INFO_DIALOG_CONTENT,
  InfoDialog,
  InfoDialogContent,
  type InfoDialogKey,
} from "@/features";

export const Footer = () => {
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
      dir="rtl"
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
              textAlign: { xs: "center", md: "left" },
            }}
          >
            <Typography variant="body2" color="textSecondary">
              © {new Date().getFullYear()} Shiftly – מחשבון סימולציות ובדיקות
              שכר ומשמרות | Salary & Shift Simulation & Calculator
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
                const { title, icon: Icon } = INFO_DIALOG_CONTENT[key];

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
                      {title}
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
                  window.open(
                    "https://github.com/dmaman86/shiftly",
                    "_blank",
                  )
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
                יצירת קשר
              </Link>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {dialogConfig && (
        <InfoDialog
          open
          title={dialogConfig.title}
          icon={dialogConfig.icon}
          onClose={closeDialog}
        >
          <InfoDialogContent paragraphs={dialogConfig.paragraphs} />
        </InfoDialog>
      )}
    </Box>
  );
};
