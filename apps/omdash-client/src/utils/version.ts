import childProcess from 'node:child_process';
import path from 'node:path';

export interface Version {
  commit: string;
  committedAt: number;
}

/**
 * The commit this client is running. Unlike the Rust client and the relay,
 * which are stamped at build time, this one runs straight out of the
 * repository checkout (`node build/client.js`), so it can just ask git - and
 * gets the right answer even when the build output was restored from a cache.
 *
 * Resolved once at startup, synchronously: it has to be part of the very first
 * message sent on connect, and the whole thing costs a few milliseconds once
 * per process.
 */
export function getVersion(): Version | undefined {
  // build/utils/version.js -> the repo root.
  const repo = path.resolve(__dirname, '../../../..');

  const commit = git(repo, ['rev-parse', 'HEAD']);
  const committedAt = git(repo, ['log', '-1', '--format=%ct']);

  if (!commit) {
    return undefined;
  }

  return { commit, committedAt: Number(committedAt) || 0 };
}

function git(cwd: string, args: string[]): string | undefined {
  try {
    return childProcess
      .execFileSync('git', ['-C', cwd, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
  } catch {
    // Not a checkout, or no git installed - the dashboard treats a missing
    // version as "unknown" rather than guessing.
    return undefined;
  }
}
