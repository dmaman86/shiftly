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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("pages");

  const std = Number(standardHours);
  const cr = "calculation_rules_page";

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
                {t(`${cr}.title`)}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              {t(`${cr}.sub_title`)}
            </Typography>
          </Box>
          <Divider sx={{ mt: 3 }} />

          {/* Daily time split */}
          <RuleCard title={t(`${cr}.card_extra_hours.title`)}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {t(`${cr}.card_extra_hours.sub_title`)}
            </Typography>

            <RuleAccordion title={t(`${cr}.card_extra_hours.accordion_title`)}>
              <WorkDayTimeline>
                <TimeSegment
                  from=""
                  to={t(`${cr}.card_extra_hours.segment_standard`, { standardHours })}
                  label="100%"
                  flex={1}
                  color="#e3f2fd"
                />
                <TimeSegment
                  from=""
                  to={t(`${cr}.card_extra_hours.segment_overtime_1`)}
                  label="125%"
                  flex={1}
                  color="#fff8e1"
                />
                <TimeSegment
                  from=""
                  to={t(`${cr}.card_extra_hours.segment_overtime_2`)}
                  label="150%"
                  flex={1}
                  color="#fce4ec"
                />
              </WorkDayTimeline>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  {t(`${cr}.card_extra_hours.example_label`)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(`${cr}.card_extra_hours.example_regular`, { to: std })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(`${cr}.card_extra_hours.example_extra_125`, { from: std + 1, to: std + 2 })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(`${cr}.card_extra_hours.example_extra_150`, { from: std + 2 })}
                </Typography>
              </Box>

              <TimelineNote variant="tip">
                {t(`${cr}.card_extra_hours.tip`, { standardHours })}
              </TimelineNote>
            </RuleAccordion>
          </RuleCard>

          <RuleCard title={t(`${cr}.card_salary_additions.title`)}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {t(`${cr}.card_salary_additions.sub_title`)}
            </Typography>

            <RuleAccordion title={t(`${cr}.card_salary_additions.accordion_weekday.title`)}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(`${cr}.card_salary_additions.accordion_weekday.sub_title`)}
              </Typography>

              <WorkDayTimeline title={t(`${cr}.card_salary_additions.accordion_weekday.timeline_start_label`)}>
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
                  label={t(`${cr}.card_salary_additions.accordion_weekday.base_salary`)}
                  flex={8}
                  color="#e3f2fd"
                />
              </WorkDayTimeline>

              <WorkDayTimeline title={t(`${cr}.card_salary_additions.accordion_weekday.timeline_continue_label`)}>
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
                <div>{t(`${cr}.card_salary_additions.accordion_weekday.note_midnight`)}</div>
                <div>{t(`${cr}.card_salary_additions.accordion_weekday.note_next_day`)}</div>
              </TimelineNote>
            </RuleAccordion>

            <RuleAccordion title={t(`${cr}.card_salary_additions.accordion_friday.title`)}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(`${cr}.card_salary_additions.accordion_friday.sub_title`)}
              </Typography>

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
                <div>{t(`${cr}.card_salary_additions.accordion_friday.note_midnight`)}</div>
                <div>{t(`${cr}.card_salary_additions.accordion_friday.note_next_day`)}</div>
              </TimelineNote>

              <TimelineNote variant="tip">
                <div>{t(`${cr}.card_salary_additions.accordion_friday.tip_summer`)}</div>
                <div>{t(`${cr}.card_salary_additions.accordion_friday.tip_winter`)}</div>
                <div>{t(`${cr}.card_salary_additions.accordion_friday.tip_auto`)}</div>
              </TimelineNote>
            </RuleAccordion>

            <RuleAccordion title={t(`${cr}.card_salary_additions.accordion_shabbat.title`)}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(`${cr}.card_salary_additions.accordion_shabbat.sub_title`)}
              </Typography>

              <WorkDayTimeline>
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
                <div>{t(`${cr}.card_salary_additions.accordion_shabbat.note_midnight`)}</div>
                <div>{t(`${cr}.card_salary_additions.accordion_shabbat.note_next_day`)}</div>
              </TimelineNote>
            </RuleAccordion>
          </RuleCard>

          <RuleCard title={t(`${cr}.card_meal_allowance.title`)}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {t(`${cr}.card_meal_allowance.sub_title`)}
            </Typography>

            <RuleAccordion title={t(`${cr}.card_meal_allowance.accordion_eligibility.title`)}>
              <Typography variant="body2" color="text.secondary">
                {t(`${cr}.card_meal_allowance.accordion_eligibility.description`)}
              </Typography>
            </RuleAccordion>

            <RuleAccordion title={t(`${cr}.card_meal_allowance.accordion_tiers.title`)}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "action.hover" }}>
                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_tiers.col_hours`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_tiers.col_tier`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_tiers.col_points`)}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_tiers.tier_a_hours`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_tiers.tier_a_label`)}</TableCell>
                    <TableCell align="center">1</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_tiers.tier_b_hours`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_tiers.tier_b_label`)}</TableCell>
                    <TableCell align="center">2</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_tiers.tier_c_hours`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_tiers.tier_c_label`)}</TableCell>
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
                {t(`${cr}.card_meal_allowance.accordion_tiers.official_doc_link`)}
              </Link>
            </RuleAccordion>

            <RuleAccordion title={t(`${cr}.card_meal_allowance.accordion_per_diem.title`)}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "action.hover" }}>
                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_per_diem.col_condition`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_per_diem.col_until_2024`)}</TableCell>
                    <TableCell align="center">{t(`${cr}.card_meal_allowance.accordion_per_diem.col_from_2024`)}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_per_diem.row_overtime_2h`)}</TableCell>
                    <TableCell align="center">₪19.70</TableCell>
                    <TableCell align="center">₪21.10</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_per_diem.row_overtime_2h_no_meal`)}</TableCell>
                    <TableCell align="center">₪20.70</TableCell>
                    <TableCell align="center">₪23.80</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>{t(`${cr}.card_meal_allowance.accordion_per_diem.row_night_shift`)}</TableCell>
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
                {t(`${cr}.card_meal_allowance.accordion_per_diem.source_link`)}
              </Link>
            </RuleAccordion>
          </RuleCard>

          {/* Disclaimer */}
          <RuleCard title={t(`${cr}.card_important_info.title`)}>
            <RuleAccordion title={t(`${cr}.card_important_info.accordion_limitations.title`)}>
              <Typography>
                {t(`${cr}.card_important_info.accordion_limitations.text_1`)}
              </Typography>
              <Typography>
                {t(`${cr}.card_important_info.accordion_limitations.text_2`)}
              </Typography>
              <Typography>
                {t(`${cr}.card_important_info.accordion_limitations.text_3`)}
              </Typography>
            </RuleAccordion>

            <RuleAccordion title={t(`${cr}.card_important_info.accordion_disclaimers.title`)}>
              <Typography>
                {t(`${cr}.card_important_info.accordion_disclaimers.text_1`)}
              </Typography>
              <Typography>
                {t(`${cr}.card_important_info.accordion_disclaimers.text_2`)}
              </Typography>
            </RuleAccordion>
          </RuleCard>
        </CardContent>
      </Card>
    </Container>
  );
};
