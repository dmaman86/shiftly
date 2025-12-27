import { RuleAccordion, RuleCard } from "@/features";
import {
  Box,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Link,
} from "@mui/material";

export const CalculationRulesPage = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      {/* Page title */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          כללי החישוב
        </Typography>

        <Typography variant="body2" color="text.secondary">
          מסך זה מציג את כללי החישוב והנתונים לפיהם המערכת מחשבת שעות ותוספות.
          המידע מוצג לצורך שקיפות ואינו ניתן לעריכה.
        </Typography>
      </Box>

      {/* Daily time split */}
      <RuleCard title="🕒 חלוקת יום עבודה">
        <RuleAccordion title="חלוקת שעות">
          <Typography>06:00 – 14:00</Typography>
          <Typography>14:00 – 22:00</Typography>
          <Typography>22:00 – 06:00 (למחרת)</Typography>
        </RuleAccordion>

        <RuleAccordion title="חציית יום">
          <Typography>משמרת החוצה את חצות מחושבת כיום עבודה אחד.</Typography>
        </RuleAccordion>
      </RuleCard>

      {/* Friday / Holiday */}
      <RuleCard title="🕯️ שישי וערבי חג">
        <RuleAccordion title="תחילת זמן מיוחד">
          <Typography>שעון קיץ – החל מ־18:00</Typography>
          <Typography>שעון חורף – החל מ־17:00</Typography>

          <Typography sx={{ mt: 1 }} color="text.secondary">
            הזיהוי מתבצע אוטומטית לפי התאריך.
          </Typography>
        </RuleAccordion>
      </RuleCard>

      <RuleCard title="🍽️ אש״ל">
        <RuleAccordion title="תנאי זכאות">
          <Typography>
            אש״ל מחושב רק בימים בהם קיימת לפחות משמרת אחת בתפקיד (Field Duty).
          </Typography>
          <Typography>נספרות רק שעות שבוצעו בפועל בתפקיד.</Typography>
        </RuleAccordion>
        <RuleAccordion title="מדרגות ותעריפים">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>סך שעות בתפקיד</TableCell>
                <TableCell align="center">מדרגה</TableCell>
                <TableCell align="center">נקודות</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow>
                <TableCell>מעל 4 שעות</TableCell>
                <TableCell align="center">א׳</TableCell>
                <TableCell align="center">1</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>מעל 8 שעות</TableCell>
                <TableCell align="center">ב׳</TableCell>
                <TableCell align="center">2</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>מעל 12 שעות</TableCell>
                <TableCell align="center">ג׳</TableCell>
                <TableCell align="center">3</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Link
            href="https://www.gov.il/BlobFolder/policy/guidance_superior_18092024/he/Procedures_guidance_superior_18092024.pdf"
            target="_blank"
            rel="noopener"
            underline="hover"
            sx={{ display: "block", mt: 2 }}
          >
            לצפייה במסמך הרשמי באתר gov.il
          </Link>
        </RuleAccordion>
      </RuleCard>

      <RuleCard title="🥪 כלכלה">
        <RuleAccordion title="תנאי זכאות">
          <Typography>
            דמי כלכלה מחושבים רק אם מתקיימים תנאי הזכאות הקבועים.
          </Typography>
        </RuleAccordion>

        <RuleAccordion title="תעריפים">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>תנאי זכאות</TableCell>
                <TableCell align="center">עד ‎31.08.2024</TableCell>
                <TableCell align="center">מ־‎01.09.2024</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow>
                <TableCell>לפחות 2 שעות נוספות</TableCell>
                <TableCell align="center">₪19.70</TableCell>
                <TableCell align="center">₪21.10</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>לפחות 2 שעות נוספות (ללא הסכם ארוחות)</TableCell>
                <TableCell align="center">₪20.70</TableCell>
                <TableCell align="center">₪23.80</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>משמרת שלישית (לפחות 4 שעות)</TableCell>
                <TableCell align="center">₪13.50</TableCell>
                <TableCell align="center">₪14.50</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Link
            href="https://www.malam-payroll.com/%d7%a2%d7%93%d7%9b%d7%95%d7%9f-%d7%93%d7%9e%d7%99-%d7%9b%d7%9c%d7%9b%d7%9c%d7%94-%d7%95%d7%90%d7%a9%d7%9c-%d7%91%d7%9e%d7%92%d7%96%d7%a8-%d7%94%d7%a6%d7%99%d7%91%d7%95%d7%a8%d7%99-%d7%9e-1-9-24/"
            target="_blank"
            rel="noopener"
            underline="hover"
            sx={{ display: "block", mt: 2 }}
          >
            מקור הנתונים – malam-payroll.com
          </Link>
        </RuleAccordion>
      </RuleCard>

      {/* Date limits */}
      <RuleCard title="📅 טווחי תאריכים">
        <RuleAccordion title="מגבלות בחירה">
          <Typography>המערכת פעילה החל מנובמבר 2015</Typography>
          <Typography>לא ניתן לחשב חודשים עתידיים</Typography>
          <Typography>
            בשנה הנוכחית ניתן לבחור חודשים עד החודש הנוכחי בלבד
          </Typography>
        </RuleAccordion>
      </RuleCard>

      {/* Disclaimer */}
      <RuleCard title="ℹ️ מידע חשוב">
        <RuleAccordion title="הבהרות">
          <Typography>
            החישוב במערכת הינו להערכה בלבד ואינו מחליף תלוש שכר רשמי.
          </Typography>
          <Typography>
            ייתכנו הבדלים בהתאם להסכמים אישיים או נהלים פנימיים.
          </Typography>
        </RuleAccordion>
      </RuleCard>
    </Container>
  );
};
