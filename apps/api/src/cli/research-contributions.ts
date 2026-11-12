// Keep the old command fail-closed: no credentials, database access, fetches or model calls.
console.error(
  JSON.stringify({
    error: "research_command_retired",
    message:
      "Use reference:research --domain contributions with explicit --year, --month, --parameters and --plan or --execute. The legacy --store option is not supported.",
  }),
);
process.exitCode = 1;
