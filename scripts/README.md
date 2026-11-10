# Scripts

Repository tooling that runs outside the application.

| Command                                  | Script                        | What it does                                                                                                                                             |
| ---------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run reference:timelines:diff <api>` | `diff-reference-timelines.ts` | Reports where the rate timelines a deployed apps/api publishes differ from the app's embedded baseline. Diagnostic only: a difference is not a failure. |
| `bun run docs:diagrams`                  | `sync-diagrams.ts`            | Embeds `docs/architecture/generated/*.mmd` into the reference READMEs. `docs:diagrams:check` fails CI when a README is out of date.                      |

## Calendar

There are no static calendar files and no calendar scripts any more.

- **Holidays** are computed in the browser from Hebrew-calendar rules
  (`apps/web/src/services/calendar/israeliHolidays.ts`).
- **Knesset election days** are reference data in the database. An admin
  records each election with its official evidence and activates it with
  `election:record` and `election:activate` in apps/api; the web app reads the
  published days from `GET /reference/elections`.

An election day adds a 100% premium for regular work overlapping 07:00–22:00
on that date, including cross-midnight shifts. The premium increases
`regular.hours100.hours`, not actual duration or `totalHours`, and does not
change the base overtime progression. This is the owner-specified calculation
contract, not independent legal validation.
