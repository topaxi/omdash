/**
 * Build provenance, reported by every part of the system in the same shape:
 * the relay and the Rust client stamp it in at build time, the Node client
 * reads it from its checkout at startup, and the frontend has it injected by
 * vite (see `vite.config.ts`).
 */
export interface Version {
  /** Full commit sha. */
  commit: string;
  /** Commit timestamp, unix seconds. */
  committedAt: number;
}

/** Injected at build time by vite; `null` when built outside a checkout. */
declare const __OMDASH_VERSION__: Version | null;

export const frontendVersion: Version | null = __OMDASH_VERSION__;

export function shortCommit(version: Version | undefined | null): string {
  return version ? version.commit.slice(0, 7) : 'unknown';
}

/**
 * Whether a client runs older code than the relay it reports to.
 *
 * The relay is the reference because it is deployed from the same repository
 * and every client talks to it. Comparison is by commit date rather than by
 * sha equality alone, so a host that happens to be *ahead* of the relay - the
 * relay being the outdated one - is not flagged.
 *
 * An unknown version on either side yields `false`: a missing icon is a better
 * failure mode than one that cannot be trusted.
 */
export function isOutdated(
  client: Version | undefined | null,
  server: Version | undefined | null,
): boolean {
  if (!client?.commit || !server?.commit || client.commit === server.commit) {
    return false;
  }

  return client.committedAt < server.committedAt;
}
