import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitService {
  getTags(): Promise<string[]>;
  withWorktree<T>(tag: string, callback: (worktreePath: string) => Promise<T>): Promise<T>;
}

export const createGitService = (repositoryRoot = process.cwd()): GitService => {
  const runGit = async (args: string[]) => {
    const { stdout } = await execFileAsync("git", args, { cwd: repositoryRoot });
    return stdout.trim();
  };

  return {
    async getTags() {
      const output = await runGit(["tag", "--sort=version:refname"]);
      return output.split("\n").filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
    },

    withWorktree: async <T>(
      tag: string,
      callback: (worktreePath: string) => Promise<T>,
    ): Promise<T> => {
      const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "shiftly-architecture-"));
      const worktreePath = path.join(temporaryRoot, "repository");
      let worktreeAdded = false;
      try {
        await runGit(["worktree", "add", "--detach", worktreePath, tag]);
        worktreeAdded = true;
        return await callback(worktreePath);
      } finally {
        if (worktreeAdded) await runGit(["worktree", "remove", "--force", worktreePath]);
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    },
  };
};
