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
