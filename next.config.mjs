import { execSync } from 'node:child_process';

/**
 * Build stamp (One-Engine-Redesign-Plan §26.3).
 *
 * Every deploy carries the commit it was built from and the moment it was built,
 * on a surface reachable without a login, so a deploy can be confirmed from the
 * URL instead of from a build log. This is what the §26.1 phase gate checks.
 *
 * CI values win when present; a local build falls back to git; a build with
 * neither says "unknown" rather than lying.
 */
function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function fromGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const buildSha =
  readEnv('BUILD_SHA', 'CF_PAGES_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA') ||
  fromGit('git rev-parse HEAD') ||
  'unknown';

const buildBranch =
  readEnv('BUILD_BRANCH', 'CF_PAGES_BRANCH', 'VERCEL_GIT_COMMIT_REF', 'GITHUB_REF_NAME') ||
  fromGit('git rev-parse --abbrev-ref HEAD') ||
  'unknown';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildSha,
    NEXT_PUBLIC_BUILD_BRANCH: buildBranch,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};
export default nextConfig;
