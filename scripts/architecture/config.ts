import path from "node:path";

export interface ArchitectureTarget {
  name: string;
  sourceRoot: string;
  focus: string;
  kind?: "conceptual";
}

export interface ArchitectureConfig {
  generatedRoot: string;
  historyRoot: string;
  targets: readonly ArchitectureTarget[];
}

export const architectureConfig: ArchitectureConfig = {
  generatedRoot: "docs/architecture/generated",
  historyRoot: "docs/architecture/history",
  targets: [
    { name: "overview", sourceRoot: "src", focus: "^src/", kind: "conceptual" },
    { name: "domain", sourceRoot: "src/domain", focus: "^src/domain/", kind: "conceptual" },
    {
      name: "work-table",
      sourceRoot: "src/features/work-table",
      focus: "^src/features/work-table/",
      kind: "conceptual",
    },
    { name: "application-state", sourceRoot: "src", focus: "^src/(hooks|store)/", kind: "conceptual" },
    { name: "data", sourceRoot: "src/services", focus: "^src/services/", kind: "conceptual" },
  ],
};

export const resolveRepositoryPath = (repositoryRoot: string, relativePath: string) =>
  path.resolve(repositoryRoot, relativePath);
