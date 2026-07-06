import { copyFile, cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const openNextDir = path.join(root, '.open-next');
const assetsDir = path.join(openNextDir, 'assets');
const workerFile = path.join(openNextDir, 'worker.js');
const pagesDir = path.join(openNextDir, 'pages');

async function assertExists(target, label) {
  try {
    await stat(target);
  } catch {
    throw new Error(`${label} was not found. Run opennextjs-cloudflare build first.`);
  }
}

async function copyDirectoryContents(from, to) {
  await mkdir(to, { recursive: true });

  for (const entry of await readdir(from, { withFileTypes: true })) {
    await cp(path.join(from, entry.name), path.join(to, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

await assertExists(openNextDir, '.open-next');
await assertExists(assetsDir, '.open-next/assets');
await assertExists(workerFile, '.open-next/worker.js');

await rm(pagesDir, { recursive: true, force: true });
await mkdir(pagesDir, { recursive: true });

await copyDirectoryContents(assetsDir, pagesDir);

for (const entry of await readdir(openNextDir, { withFileTypes: true })) {
  if (entry.name === 'assets' || entry.name === 'pages' || entry.name === 'worker.js') {
    continue;
  }

  await cp(path.join(openNextDir, entry.name), path.join(pagesDir, entry.name), {
    recursive: true,
    force: true,
  });
}

await copyFile(workerFile, path.join(pagesDir, 'open-next-worker.js'));
await writePagesWorker(path.join(pagesDir, '_worker.js'));

console.log(`Prepared Cloudflare Pages output at ${path.relative(root, pagesDir)}`);

async function writePagesWorker(target) {
  const source = `import openNextWorker from './open-next-worker.js';

export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from './open-next-worker.js';

function isAssetRequest(request) {
  const { pathname } = new URL(request.url);

  return (
    pathname === '/BUILD_ID' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/assets/') ||
    /\\.[a-zA-Z0-9]{2,8}$/.test(pathname)
  );
}

export default {
  async fetch(request, env, ctx) {
    if (isAssetRequest(request)) {
      return env.ASSETS.fetch(request);
    }

    return openNextWorker.fetch(request, env, ctx);
  },
};
`;

  await writeFile(target, source);
}
