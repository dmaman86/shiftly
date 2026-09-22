import { defineWorkTableFixtureTest } from "./work-table-fixture";

defineWorkTableFixtureTest({
  title: "creates the March 2022 work table from the fixture",
  inputFile: "e2e/fixtures/march-2022.json",
  resultFile: "e2e/fixtures/march-2022.result.json",
});
