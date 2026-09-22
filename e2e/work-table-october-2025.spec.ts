import { defineWorkTableFixtureTest } from "./work-table-fixture";

defineWorkTableFixtureTest({
  title: "creates the October 2025 work table from the fixture",
  inputFile: "e2e/fixtures/october-2025.json",
  resultFile: "e2e/fixtures/october-2025.result.json",
  hebcalItems: [
    {
      date: "2025-10-01",
      title: "Erev Yom Kippur",
      category: "holiday",
    },
    {
      date: "2025-10-02",
      title: "Yom Kippur",
      category: "holiday",
      yomtov: true,
    },
    {
      date: "2025-10-06",
      title: "Erev Sukkot",
      category: "holiday",
    },
    {
      date: "2025-10-07",
      title: "Sukkot I",
      category: "holiday",
      yomtov: true,
    },
    {
      date: "2025-10-13",
      title: "Sukkot VII (Hoshana Raba)",
      category: "holiday",
    },
    {
      date: "2025-10-14",
      title: "Shmini Atzeret",
      category: "holiday",
      yomtov: true,
    },
  ],
});
