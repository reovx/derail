import { execFileSync } from "node:child_process";

/**
 * Git metadata, read locally.
 *
 * `DECISIONS.md` reversed the original CI-first plan for exactly this reason:
 * everything CI would have supplied is already on the machine running the
 * deploy, and laptop deploys are the part of the lifecycle nothing else sees.
 */

export type GitMetadata = {
  commit_sha?: string;
  branch?: string;
  remote_url?: string;
  dirty?: boolean;
};

function git(args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
  } catch {
    // Not a repository, no git on PATH, no origin remote — all fine. The run
    // is still worth recording without them.
    return undefined;
  }
}

/**
 * The child's own version string.
 *
 * Worth the ~60ms: hash extraction is a regex against human-readable output
 * (spike/FINDINGS.md §3.3), so a stored run is only interpretable if you know
 * which version produced it. Without this, a format change silently invalidates
 * history rather than being visible in it.
 */
export function readToolVersion(executable: string): string | undefined {
  if (process.env.DERAIL_CLI_VERSION) return process.env.DERAIL_CLI_VERSION;

  try {
    const output = execFileSync(executable, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    });
    // `stellar --version` prints three lines; the first identifies the CLI.
    return output.split("\n")[0]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function readGitMetadata(): GitMetadata {
  const commitSha = git(["rev-parse", "HEAD"]);
  if (!commitSha) return {};

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const remoteUrl = git(["remote", "get-url", "origin"]);
  const porcelain = git(["status", "--porcelain"]);

  return {
    commit_sha: commitSha,
    branch: branch || undefined,
    remote_url: remoteUrl || undefined,
    // An empty porcelain output means a clean tree. `undefined` means we could
    // not tell, which is not the same as clean and must not be recorded as it.
    dirty: porcelain === undefined ? undefined : porcelain.length > 0,
  };
}
