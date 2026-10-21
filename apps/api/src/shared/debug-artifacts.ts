import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface DebugArtifactWriter {
  write(name: string, content: string | Uint8Array): Promise<void>;
}

export interface DebugArtifactStore {
  /** `sourceKey` identifies the exact source revisions a run read. */
  forDocument(year: number, sourceKey: string): Promise<DebugArtifactWriter>;
}

/**
 * Keeps what each run saw (the source tables sent to the model, the raw model
 * answers, the result or error) for manual inspection:
 * <rootDir>/<year>/<sourceKey>/<run timestamp>/. One folder per run, so files of
 * different runs (an old error.json next to a new result.json) never mix.
 */
export class FileDebugArtifactStore implements DebugArtifactStore {
  private readonly rootDir: string;
  private readonly now: () => Date;

  constructor(rootDir: string, now: () => Date = () => new Date()) {
    this.rootDir = rootDir;
    this.now = now;
  }

  async forDocument(
    year: number,
    sourceKey: string,
  ): Promise<DebugArtifactWriter> {
    const runId = this.now().toISOString().replace(/:/g, "-");
    const dir = join(this.rootDir, String(year), sourceKey, runId);
    await mkdir(dir, { recursive: true });
    return {
      write: (name, content) =>
        typeof content === "string"
          ? writeFile(join(dir, name), content, "utf8")
          : writeFile(join(dir, name), content),
    };
  }
}
