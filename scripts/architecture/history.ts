import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArchitectureConfig, ArchitectureTarget } from "./config";
import { resolveRepositoryPath } from "./config";
import type { ArchitectureDiagram } from "./diagram";
import type { GitService } from "./git";

interface Snapshot {
  tag: string;
  target: ArchitectureTarget;
  diagram: ArchitectureDiagram;
}

interface ArchitectureHistoryDependencies {
  git: GitService;
  diagramGenerator: {
    generate(worktreePath: string, target: ArchitectureTarget): Promise<ArchitectureDiagram>;
  };
  config: ArchitectureConfig;
  repositoryRoot?: string;
}

export const createArchitectureHistory = ({
  git,
  diagramGenerator,
  config,
  repositoryRoot = process.cwd(),
}: ArchitectureHistoryDependencies) => {
  const createSnapshot = async (
    tag: string,
    worktreePath: string,
    target: ArchitectureTarget,
  ): Promise<Snapshot> => ({
    tag,
    target,
    diagram: await diagramGenerator.generate(worktreePath, target),
  });

  const save = async (snapshot: Snapshot) => {
    if (snapshot.diagram.status !== "available" || !snapshot.diagram.mermaid) return;
    const directory = resolveRepositoryPath(
      repositoryRoot,
      path.join(config.historyRoot, snapshot.tag),
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, snapshot.target.name + ".mmd"),
      snapshot.diagram.mermaid,
    );
  };

  const refreshExistingArtifact = async (snapshot: Snapshot) => {
    if (snapshot.diagram.status !== "available" || !snapshot.diagram.mermaid) return;
    const filePath = resolveRepositoryPath(
      repositoryRoot,
      path.join(config.historyRoot, snapshot.tag, snapshot.target.name + ".mmd"),
    );
    try {
      await access(filePath);
      await writeFile(filePath, snapshot.diagram.mermaid);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  };

  return {
    async run() {
      const previousFingerprints = new Map<string, string>();
      const persistedSnapshots: Snapshot[] = [];
      const tags = await git.getTags();

      for (const tag of tags) {
        await git.withWorktree(tag, async (worktreePath) => {
          for (const target of config.targets.filter(
            ({ includeInHistory }) => includeInHistory !== false,
          )) {
            const snapshot = await createSnapshot(tag, worktreePath, target);
            if (
              snapshot.diagram.status !== "available" ||
              !snapshot.diagram.fingerprint
            ) {
              continue;
            }
            if (
              previousFingerprints.get(target.name) ===
              snapshot.diagram.fingerprint
            ) {
              await refreshExistingArtifact(snapshot);
              continue;
            }
            previousFingerprints.set(target.name, snapshot.diagram.fingerprint);
            await save(snapshot);
            persistedSnapshots.push(snapshot);
          }
        });
      }

      return persistedSnapshots;
    },
  };
};
