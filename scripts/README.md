# Calendar maintenance

`bun run calendar:elections:sync` merges the verified registry in
`scripts/data/knesset-elections.json` into the existing yearly calendar JSON files.
`bun run calendar:generate` also merges that registry after downloading Hebcal.
Election items have `category: "election"`, `subcat: "knesset"`, and a numeric
`knessetNumber`. They are not religious `yomtov` events. The web adapter carries
elections into day metadata for desktop/mobile badges. The domain adds a 100%
premium for regular work overlapping 07:00–22:00 on an election date, including
cross-midnight shifts. The premium increases `regular.hours100.hours`, not actual
duration or `totalHours`, and does not change the base overtime progression.
This is the owner-specified calculation contract, not independent legal validation.

`bun run calendar:elections:update` fetches Hebrew Wikipedia via MediaWiki, checks the
Knesset number and date, and updates the registry and affected calendar files.
Changes to past elections, skipped Knesset numbers, invalid dates, and years
outside 2015–2040 require manual investigation. A missing announcement never
deletes an existing record. Run tests with `bun run calendar:elections:test`.

## Weekly GitHub Actions job

`.github/workflows/knesset-elections.yml` runs Mondays at 06:23 UTC and supports
manual dispatch. It creates or updates one review PR; it never auto-merges.
Enable **Allow GitHub Actions to create and approve pull requests** in repository
Settings → Actions → General. The workflow must be on the default branch for
scheduled execution. Review CI status before merging automated changes; workflows
triggered by the repository token may require approval or a separate dispatch.

Failures mark the run red and create or comment on one open issue. Repository
issues must be enabled for that additional notification. The failed job does not
commit or publish partial local writes.

## Wikipedia source

The checker queries `https://he.wikipedia.org/w/api.php` for revision content,
IDs, and timestamps. It reads `יום הבחירות` from the `בחירות בישראל` infobox,
validates its `שם` against the Knesset number, and parses an explicit Gregorian
day, Hebrew month name, and year. No LLM or HTML scraping is involved.

It checks the latest registered election for rescheduling, then follows its
`מערכת בחירות הבאה` link only when it identifies the immediately following Knesset.
A missing next article or a missing/year-only date does not add an election.
Unexpected formats, ambiguous fields, API errors, and historical changes fail
closed before any file is written. Extend the title mapping for numbers beyond
Knesset 30. The source URL advances when a new election is registered.

The workflow logs permanent revision links and timestamps; the PR links that run
so reviewers can inspect the precise evidence without weekly metadata-only diffs.
Wikipedia is the update source, not an official electoral authority. Historical
seed dates retain their official Knesset source. Direct official website requests
previously returned 404/403, which is why this checker uses Wikipedia instead.
