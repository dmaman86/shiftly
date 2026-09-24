import { defineWorkTableFixtureTest } from "./work-table-fixture";

defineWorkTableFixtureTest({
  title: "creates the August 2026 work table in Hebrew",
  inputFile: "e2e/fixtures/august-2026.json",
  resultFile: "e2e/fixtures/august-2026.results.json",
  language: "he",
});
