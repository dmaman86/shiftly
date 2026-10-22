# National Insurance Institute fixtures

Excerpts of the employee rates page of the National Insurance Institute
(ביטוח לאומי), `https://www.btl.gov.il/Insurance/Rates/Pages/לעובדים שכירים.aspx`,
after the backend's HTML-to-text step (`src/research/document-text.ts`). Each
file keeps only the employee rates table (heading, salary bands, the National
Insurance, health insurance and total rows) and the sentence on the annual
update of the maximum insurable income; the rest of the page is dropped.
Line breaks inside table cells are kept as the page renders them.

| File                      | Read from                                                                                                                                                               | Downloaded text SHA-256 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `archived-2015-12-27.txt` | Wayback Machine capture [20151227003000](https://web.archive.org/web/20151227003000id_/https://www.btl.gov.il/Insurance/Rates/Pages/%D7%9C%D7%A2%D7%95%D7%91%D7%93%D7%99%D7%9D%20%D7%A9%D7%9B%D7%99%D7%A8%D7%99%D7%9D.aspx) | `2b0be3c0…`             |
| `archived-2025-02-05.txt` | Wayback Machine capture [20250205212112](https://web.archive.org/web/20250205212112id_/https://www.btl.gov.il/Insurance/Rates/Pages/%D7%9C%D7%A2%D7%95%D7%91%D7%93%D7%99%D7%9D%20%D7%A9%D7%9B%D7%99%D7%A8%D7%99%D7%9D.aspx) | `83a34257…`             |
| `live-2026-10-22.txt`     | The live page, 2026-10-22                                                                                                                                               | `1fd80ea4…`             |

Notes on what the pages state, which the tests rely on:

- 2015 dates the whole table with its heading ("מעודכן ל- 01.01.2015"); later
  pages date each cell ("(החל ב- 01.02.2025)").
- The 2025-02-05 capture writes the health standard rate without a percent
  sign ("5.17 (החל ב- 01.02.2025)") and states a standard total of
  "12.16 (החל ב- 01.01.2025)": the total of January, before the health rate
  rose to 5.17%. It is not compared with February's parts.

## Historical records

Excerpts of official historical records, read on 2026-10-22, which cover
the years no archived capture of the rates page does:

| File                                     | Source                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `thresholds-history-2026-10-22.txt`      | [Employee income thresholds](https://www.btl.gov.il/Mediniyut/GeneralData/rates_1954_2007/Hachnasa/Pages/Sahir_Maasik.aspx), the table since 2000, rows down to 2014 |
| `employee-totals-history-2026-10-22.txt` | Rates as a percentage of income, "שכיר בגיל הביטוח", the table since 1995, rows down to 2014                                 |
| `report-2018-page-35.txt`                | [developments_2018-H.pdf](https://www.btl.gov.il/Publications/devwlopmends-hebrew/Documents/developments_2018-H.pdf), page 35 |
| `report-2019-page-35.txt`                | [developments_2019-H.pdf](https://www.btl.gov.il/Publications/devwlopmends-hebrew/Documents/developments_2019-H.pdf), page 35 |

- Both tables list change points ("החל ביום"): each row holds until the next
  one. They stop at 01/02/2025 and list nothing for 2026, so their newest
  row covers only its own month.
- The employee totals table states National Insurance and health together,
  never one of them alone.
- The reports state the health insurance rate in the table of rates
  collected from the employer and the employee; health insurance has no
  employer share. The PDF text keeps the reports' line order, so a row may
  read right to left ("3.10 5.00 ביטוח בריאות") under a header in the same
  order ("שיעור מופחת שיעור רגיל").
