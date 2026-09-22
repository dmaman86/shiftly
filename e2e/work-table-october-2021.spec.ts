import { defineWorkTableFixtureTest } from "./work-table-fixture";

defineWorkTableFixtureTest({
  title: "creates the October 2021 work table from the fixture",
  inputFile: "e2e/fixtures/october-2021.json",
  resultFile: "e2e/fixtures/october-2021.result.json",
});
