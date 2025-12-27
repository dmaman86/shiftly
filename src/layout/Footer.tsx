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
      }}
      dir="rtl"
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        <Box dir="rtl">
          <Typography variant="body2" color="textSecondary">
            © {new Date().getFullYear()} Shiftly – מחשבון שכר וחישוב משמרות |
            Salary & Shift Calculator
          </Typography>

          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            מערכת בקרה והסבר לחישוב שעות עבודה ושכר, המיועדת לעובדי ביטחון
            שעתיים במשרדי ממשלה, ומשחזרת את לוגיקת החישוב על-פי דוחות מערכת
            מרכבה.
          </Typography>

          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            למרות בדיקות מקיפות, ייתכן שהמערכת תציג חישוב שאינו מדויק בכל
            התרחישים. אם נתקלתם באי־התאמה, נשמח לקבל דיווח לצורך שיפור המערכת.
          </Typography>

          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            המערכת אינה שומרת מידע אישי ואינה עושה שימוש בעוגיות. ניתוח שימוש
            אנונימי ובסיסי בלבד, לצורכי שיפור המערכת. אין מדובר במערכת שכר או
            הנהלת חשבונות.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Link
              href="https://github.com/dmaman86/shiftly"
              aria-label="GitHub Repository"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              variant="body2"
              color="textSecondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <GitHubIcon fontSize="small" />
              GitHub Repo
            </Link>
            <Link
              href="mailto:dmaman86@gmail.com"
              aria-label="Contact via Email"
              underline="hover"
              variant="body2"
              color="textSecondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <EmailIcon fontSize="small" />
              יצירת קשר
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
