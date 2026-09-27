import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { cruise, format } from "dependency-cruiser";
import type { ArchitectureTarget } from "./config.ts";
import { createConceptualDiagram } from "./conceptual.ts";

export interface ArchitectureDiagram {
  status: "available" | "unavailable";
  mermaid?: string;
  fingerprint?: string;
  reason?: string;
}

interface CruisedModule {
  source: string;
  dependencies?: Array<{ resolved?: string }>;
}

interface CruiseResult {
  modules: CruisedModule[];
}

interface GraphSnapshot {
  nodes: string[];
  edges: string[];
}

const excludedModules = "(^|/)(test|assets)/|\\.d\\.ts$";

const listFiles = (directory: string): string[] => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
};

const toRepositoryPath = (value: string, worktreePath: string): string => {
  const relative = path.isAbsolute(value) ? path.relative(worktreePath, value) : value;
  return relative.replaceAll(path.sep, "/").replace(/^\.\//, "");
};

const hasMatchingSource = (worktreePath: string, target: ArchitectureTarget): boolean => {
  const sourceRoot = path.resolve(worktreePath, target.sourceRoot);
  if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) return false;
  const focus = new RegExp(target.focus);
  return listFiles(sourceRoot).some((file) => focus.test(toRepositoryPath(file, worktreePath)));
};

const canonicalize = (result: CruiseResult, worktreePath: string): GraphSnapshot => {
  const nodes = result.modules
    .map((module) => toRepositoryPath(module.source, worktreePath))
    .filter((source) => source.startsWith("src/"))
    .sort();
  const nodeSet = new Set(nodes);
  const edges = result.modules.flatMap((module) => {
    const source = toRepositoryPath(module.source, worktreePath);
    if (!nodeSet.has(source)) return [];
    return (module.dependencies ?? [])
      .map((dependency) => {
        if (!dependency.resolved) return null;
        const target = toRepositoryPath(dependency.resolved, worktreePath);
        return nodeSet.has(target) ? source + " -> " + target : null;
      })
      .filter((edge): edge is string => edge !== null);
  }).sort();
  return { nodes, edges };
};

const toTopLevelModule = (source: string): string => {
  const parts = source.split("/");
  return parts.length > 1 ? parts[1] : "root";
};

const canonicalizeTopLevel = (result: CruiseResult, worktreePath: string): GraphSnapshot => {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const module of result.modules) {
    const source = toRepositoryPath(module.source, worktreePath);
    if (!source.startsWith("src/")) continue;
    const sourceModule = toTopLevelModule(source);
    nodes.add(sourceModule);
    for (const dependency of module.dependencies ?? []) {
      if (!dependency.resolved) continue;
      const target = toRepositoryPath(dependency.resolved, worktreePath);
      if (!target.startsWith("src/")) continue;
      const targetModule = toTopLevelModule(target);
      nodes.add(targetModule);
      if (sourceModule !== targetModule) edges.add(sourceModule + " -> " + targetModule);
    }
  }
  return { nodes: [...nodes].sort(), edges: [...edges].sort() };
};

const renderTopLevelDiagram = (graph: GraphSnapshot): string => {
  const subgraphs = graph.nodes.map((node) => {
    const id = "module_" + node.replace(/[^a-zA-Z0-9_]/g, "_");
    return [`  subgraph ${id}["${node}"]`, "  end"].join("\n");
  });
  const edges = graph.edges.map((edge) => {
    const [source, target] = edge.split(" -> ");
    const sourceId = "module_" + source.replace(/[^a-zA-Z0-9_]/g, "_");
    const targetId = "module_" + target.replace(/[^a-zA-Z0-9_]/g, "_");
    return `  ${sourceId} --> ${targetId}`;
  });
  return ["flowchart LR", "", ...subgraphs, "", ...edges].join("\n");
};

const catppuccinMochaConfig = `---
config:
  theme: base
  themeVariables:
    background: "#1e1e2e"
    primaryColor: "#313244"
    primaryTextColor: "#cdd6f4"
    primaryBorderColor: "#89b4fa"
    lineColor: "#a6adc8"
    secondaryColor: "#45475a"
    secondaryTextColor: "#cdd6f4"
    secondaryBorderColor: "#cba6f7"
    tertiaryColor: "#585b70"
    tertiaryTextColor: "#cdd6f4"
    tertiaryBorderColor: "#f9e2af"
    clusterBkg: "#181825"
    clusterBorder: "#cba6f7"
    edgeLabelBackground: "#1e1e2e"
---`;

export const normalizeMermaid = (diagram: string): string =>
  catppuccinMochaConfig + "\n" +
  diagram.replaceAll("\r\n", "\n").replace(/[ \t]+$/gm, "").trim() + "\n";

export const createDiagramGenerator = () => ({
  async generate(worktreePath: string, target: ArchitectureTarget): Promise<ArchitectureDiagram> {
    if (target.kind === "conceptual") {
      return createConceptualDiagram().generate(worktreePath, target);
    }
    if (!hasMatchingSource(worktreePath, target)) {
      return { status: "unavailable", reason: "No source matches " + target.focus };
    }

    const result = await cruise([target.sourceRoot], {
      baseDir: worktreePath,
      includeOnly: "^src/",
      exclude: excludedModules,
      focus: target.focus,
    }, {
      tsConfig: path.join(worktreePath, "tsconfig.app.json"),
    } as never);
    const cruiseResult = result.output as CruiseResult;
    const graph = target.granularity === "top-level"
      ? canonicalizeTopLevel(cruiseResult, worktreePath)
      : canonicalize(cruiseResult, worktreePath);
    const fingerprint = createHash("sha256").update(JSON.stringify(graph)).digest("hex");
    const mermaid = target.granularity === "top-level"
      ? renderTopLevelDiagram(graph)
      : String((await format(cruiseResult as never, {
        outputType: "mermaid" as never,
        exclude: excludedModules,
        includeOnly: "^src/",
        focus: target.focus,
      })).output);

    return {
      status: "available",
      fingerprint,
      mermaid: normalizeMermaid(mermaid),
    };
  },
});
