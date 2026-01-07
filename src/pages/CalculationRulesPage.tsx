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
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import {
  RuleAccordion,
  RuleCard,
  TimeSegment,
  WorkDayTimeline,
  TimelineNote,
} from "@/features";
import { useGlobalState } from "@/hooks";

export const CalculationRulesPage = () => {
  const { standardHours } = useGlobalState();

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Page title */}
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                mb: 1,
              }}
            >
              <Typography variant="h5" fontWeight="bold">
                כללי החישוב
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              מסך זה מציג את כללי החישוב והנתונים לפיהם המערכת מחשבת שעות
              ותוספות. המידע מוצג לצורך שקיפות ואינו ניתן לעריכה.
            </Typography>
          </Box>
          <Divider sx={{ mt: 3 }} />

          {/* Daily time split */}
          <RuleCard title="🕒 חלוקת יום עבודה">
            <RuleAccordion title="חלוקת שעות נוספות (ש״נ)">
              <WorkDayTimeline>
                <TimeSegment
                  from=""
                  to={`עד ${standardHours}`}
                  label="100%"
                  flex={1}
                  color="#e3f2fd"
                />
                <TimeSegment
                  from=""
                  to="עד שעתיים"
                  label="125%"
                  flex={1}
                  color="#fff8e1"
                />
                <TimeSegment
                  from=""
                  to="עד יתרת השעות"
                  label="150%"
                  flex={1}
                  color="#fce4ec"
                />
              </WorkDayTimeline>
              <TimelineNote variant="tip">
                נכון להיום, שעות התקן הן {standardHours}.
              </TimelineNote>
            </RuleAccordion>
          </RuleCard>

          <RuleCard title="💰 תוספות שכר לפי שעות עבודה">
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, whiteSpace: "pre-line" }}
            >
              {`התוספות המוצגות מסומנות כ־"+" ומתווספות לשכר הבסיסי.
ביום חול ייתכן חישוב שעות נוספות (ש״נ).
בשבת ובחג משולם שכר שבת (בסיס + תוספת), ללא ש״נ.`}
            </Typography>
            <RuleAccordion title="יום חול">
              <WorkDayTimeline title="תחילת יום">
                <TimeSegment
                  from="00:00"
                  to="06:00"
                  label="+50%"
                  flex={8}
                  color="#fce4ec"
                />

                <TimeSegment
                  from="06:00"
                  to="14:00"
                  label="שכר בסיס"
                  flex={8}
                  color="#e3f2fd"
                />
              </WorkDayTimeline>
              <WorkDayTimeline title="המשך יום">
                <TimeSegment
                  from="14:00"
                  to="22:00"
                  label="+20%"
                  flex={8}
                  color="#fff8e1"
                />

                <TimeSegment
                  from="22:00"
                  to="6:00"
                  label="+50%"
                  flex={8}
                  color="#fce4ec"
                  crossDay
                />
              </WorkDayTimeline>
              <TimelineNote>
                <div>* משמרת החוצה את חצות מחושבת כיום עבודה אחד.</div>
                <div>** המשמרת ממשיכה ליום הבא.</div>
              </TimelineNote>
            </RuleAccordion>
            <RuleAccordion title="שישי וערבי חג">
              <WorkDayTimeline>
                <TimeSegment
                  from="14:00"
                  to="17:00 או 18:00"
                  label="+20%"
                  flex={8}
                  color="#e3f2fd"
                />
                <TimeSegment
                  from="17:00 או 18:00"
                  to="22:00"
                  label="+150%"
                  flex={8}
                  color="#fff8e1"
                />
                <TimeSegment
                  from="22:00"
                  to="6:00"
                  label="+200%"
                  flex={8}
                  color="#fce4ec"
                  crossDay
                />
              </WorkDayTimeline>
              <TimelineNote>
                <div>* משמרת החוצה את חצות מחושבת כיום עבודה אחד.</div>
                <div>** המשמרת ממשיכה ליום הבא.</div>
              </TimelineNote>
              <TimelineNote variant="tip">
                <div>• שעון קיץ – החל מ־18:00</div>
                <div>• שעון חורף – החל מ־17:00</div>
                <div>• הזיהוי מתבצע אוטומטית לפי התאריך.</div>
              </TimelineNote>
            </RuleAccordion>
            <RuleAccordion title="שבת / חג">
              <WorkDayTimeline title="תחילת יום">
                <TimeSegment
                  from="06:00"
                  to="22:00"
                  label="+150%"
                  flex={8}
                  color="#fff8e1"
                />
                <TimeSegment
                  from="22:00"
                  to="6:00"
                  label="+200%"
                  flex={8}
                  color="#fce4ec"
                  crossDay
                />
              </WorkDayTimeline>
              <TimelineNote>
                <div>* משמרת החוצה את חצות מחושבת כיום עבודה אחד.</div>
                <div>** המשמרת ממשיכה ליום הבא.</div>
              </TimelineNote>
            </RuleAccordion>
          </RuleCard>

          <RuleCard title="🍽️ אש״ל וכלכלה">
            <RuleAccordion title="תנאי זכאות אש״ל">
              <Typography variant="body2" gutterBottom>
                אש״ל מחושב רק בימים בהם קיימת לפחות משמרת אחת בתפקיד.
              </Typography>
              <Typography variant="body2">
                נספרות רק שעות שבוצעו בפועל בתפקיד.
              </Typography>
            </RuleAccordion>

            <RuleAccordion title="מדרגות אש״ל">
              <Table size="small">
                <TableHead sx={{ bgcolor: "action.hover" }}>
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

            <RuleAccordion title="תעריפי כלכלה">
              <Table size="small">
                <TableHead sx={{ bgcolor: "action.hover" }}>
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

          {/* Disclaimer */}
          <RuleCard title="ℹ️ מידע חשוב">
            <RuleAccordion title="מגבלות בחירה">
              <Typography>
                המערכת מאפשרת סימולציות ובדיקות חישוב החל מנובמבר 2015.
              </Typography>
              <Typography>
                לא ניתן לבצע חישוב עבור חודשים עתידיים, מאחר ושינויים עתידיים
                בתנאים, בתקנות או בהסכמים עשויים להשפיע על אופן החישוב, ונדרש
                זמן היערכות בהתאם.
              </Typography>
              <Typography>
                בשנה הנוכחית ניתן לבחור חודשים עד החודש הנוכחי בלבד, מאותה סיבה.
              </Typography>
            </RuleAccordion>

            <RuleAccordion title="הבהרות">
              <Typography>
                החישוב במערכת הינו להערכה בלבד ואינו מחליף דו״ח רשמי ו/או תלוש
                שכר רשמי.
              </Typography>
              <Typography>
                ייתכנו הבדלים בהתאם להסכמים אישיים או נהלים פנימיים.
              </Typography>
            </RuleAccordion>
          </RuleCard>
        </CardContent>
      </Card>
    </Container>
  );
};
