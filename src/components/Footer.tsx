import { Box, Container, Typography, Link } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import EmailIcon from "@mui/icons-material/Email";

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        backgroundColor: "#f5f5f5",
        mt: "auto",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" color="textSecondary">
          © {new Date().getFullYear()} Shiftly.
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Link
            href="https://github.com/dmaman86/shiftly"
            target="_blank"
            rel="noopener"
            underline="hover"
            variant="body2"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <GitHubIcon fontSize="small" />
            GitHub Repo
          </Link>
          <Link
            href="mailto:dmaman86@gmail.com"
            underline="hover"
            variant="body2"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <EmailIcon fontSize="small" />
            Contact Me
          </Link>
        </Box>
      </Container>
    </Box>
  );
};
