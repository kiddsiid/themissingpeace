/**
 * Build stamp — One-Engine-Redesign-Plan §26.3.
 *
 * The values are injected at build time by next.config.mjs. Nothing here reads
 * the filesystem or the network, so the stamp is identical on the server and in
 * the browser and cannot drift from the bundle it shipped with.
 */

export interface BuildInfo {
  /** Full commit SHA, or 'unknown' when the build had no git and no CI env. */
  sha: string;
  /** First 7 characters of the SHA — what you compare against `git log`. */
  shortSha: string;
  branch: string;
  /** ISO-8601 instant the bundle was built. */
  builtAt: string;
  /** False when the build could not identify its own commit. */
  known: boolean;
}

const UNKNOWN = 'unknown';

export function buildInfo(): BuildInfo {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA || UNKNOWN;
  const branch = process.env.NEXT_PUBLIC_BUILD_BRANCH || UNKNOWN;
  const builtAt = process.env.NEXT_PUBLIC_BUILD_TIME || UNKNOWN;
  return {
    sha,
    shortSha: sha === UNKNOWN ? UNKNOWN : sha.slice(0, 7),
    branch,
    builtAt,
    known: sha !== UNKNOWN,
  };
}
