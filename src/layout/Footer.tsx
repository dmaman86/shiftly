import { Box, Typography, Link } from "@mui/material";
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
  const infoColSize = Math.floor(12 / infoKeys.length);

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        backgroundColor: "#f5f5f5",
      }}
      dir="rtl"
    >
      <div className="container">
        <div className="row justity-content-center align-items-stretch">
          {/* Column 1 */}
          <div className="col-12 col-md-4 mb-2 mb-md-0">
            <div className="d-flex h-100 align-items-center">
              <Typography variant="body2" color="textSecondary">
                © {new Date().getFullYear()} Shiftly – מחשבון סימולציות ובדיקות
                שכר ומשמרות | Salary & Shift Simulation & Calculator
              </Typography>
            </div>
          </div>
          {/* Column 2 */}
          <div className="col-12 col-md-4">
            <div className="d-flex h-100 align-items-center">
              <div className="row w-100 justity-content-center">
                {infoKeys.map((key) => {
                  const { title, icon: Icon } = INFO_DIALOG_CONTENT[key];

                  return (
                    <div
                      key={key}
                      className={`col-${infoColSize} d-flex justity-content-center`}
                    >
                      <Link
                        key={key}
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="col-12 col-md-4">
            <div className="d-flex h-100 align-items-center">
              <div className="row w-100 justify-content-md-center justify-content-center">
                <div className="col-6 col-md-auto">
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
                  </Link>{" "}
                </div>
                <div className="col-6 col-md-auto">
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
                  </Link>{" "}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
