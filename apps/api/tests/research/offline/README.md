# Offline historical regressions

These deterministic helpers preserve useful assertions from the retired document
research POCs: table/quotation validation, historical effective dates, independent
NI/Health change points, missing intervals, conflicts and non-persistible derived
diagnostics. They are test-only, not a second research implementation.

- No model clients, discovery pipeline, fetchers, archive crawlers or execution
  entrypoints live here. The architecture test enforces that production imports
  never depend on these helpers and that the helpers have no network/model transport.
- Fixtures are read directly from `tests/fixtures`; their existing `SOURCES.md`
  files and captured bytes are retained. Explicit historical substitutions are
  fixture data, never a current-value lookup or nearest-year fallback.
- Reused production value schemas and numeric/quotation helpers remain the source
  of truth for those invariants; the old document provider/task/trace wrappers are
  removed rather than relocated.
- Historical fixture acceptance is **not** approval of a production value or an
  assertion that an old POC's surtax/yearly/month-start assumptions are current
  policy. Current `ResearchSpec` validators and grounded evidence admission remain
  authoritative for operational research.
- Candidate objects constructed by timeline regression tests are synthetic test
  projections. They never invoke persistence, activate references or enable
  `official_derived` values in the operational system.
