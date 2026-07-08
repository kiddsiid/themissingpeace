import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'prototype');
const cwd = process.cwd();
const outputDir = path.basename(cwd) === 'cloudflare-prototype'
  ? path.join(cwd, 'dist')
  : path.join(root, '.pages-prototype');
const pagesDir = path.join(outputDir, '_pages');
const componentsDir = path.join(outputDir, '_components');

const pages = [
  { name: 'Homepage', file: 'Homepage.html', slug: 'home', route: '/' },
  { name: 'Dream Walk', file: 'Dream Walk.html', slug: 'dreamwalk', route: '/dreamwalk' },
  { name: 'Dream', file: 'Dream.html', slug: 'dream', route: '/dream' },
  { name: 'Peace Center', file: 'Peace Center.html', slug: 'peacecenter', route: '/peacecenter' },
  { name: 'Board', file: 'Board.html', slug: 'board', route: '/board' },
  { name: 'Decisions', file: 'Decisions.html', slug: 'decisions', route: '/decisions' },
  { name: 'Money Map', file: 'Money Map.html', slug: 'moneymap', route: '/moneymap' },
  { name: 'Vendors', file: 'Vendors.html', slug: 'vendors', route: '/vendors' },
  { name: 'Guests', file: 'Guests.html', slug: 'guests', route: '/guests' },
  { name: 'Seating Studio', file: 'Seating Studio.html', slug: 'seatingstudio', route: '/seatingstudio' },
  { name: 'Website', file: 'Website.html', slug: 'website', route: '/website' },
  { name: 'Printables', file: 'Printables.html', slug: 'printables', route: '/printables' },
  { name: 'Timeline', file: 'Timeline.html', slug: 'timeline', route: '/timeline' },
  { name: 'Documents', file: 'Documents.html', slug: 'documents', route: '/documents' },
  { name: 'Playlist', file: 'Playlist.html', slug: 'playlist', route: '/playlist' },
  { name: 'Honeymoon', file: 'Honeymoon.html', slug: 'honeymoon', route: '/honeymoon' },
  { name: 'Peace Notes', file: 'Peace Notes.html', slug: 'peacenotes', route: '/peacenotes' },
];

const extraRedirects = {
  '/dream-walk': '/dreamwalk',
  '/peace-center': '/peacecenter',
  '/money-map': '/moneymap',
  '/seating-studio': '/seatingstudio',
  '/seating': '/seatingstudio',
  '/peace-notes': '/peacenotes',
  '/home': '/',
  '/homepage': '/',
};

await assertExists(sourceDir, 'prototype');

await rm(outputDir, { recursive: true, force: true });
await mkdir(pagesDir, { recursive: true });
await mkdir(componentsDir, { recursive: true });

await copyIfExists(path.join(sourceDir, '.thumbnail'), path.join(outputDir, '.thumbnail'));
await copyIfExists(path.join(sourceDir, 'uploads'), path.join(outputDir, 'uploads'));
await copyIfExists(path.join(sourceDir, 'screenshots'), path.join(outputDir, 'screenshots'));

await writeFile(
  path.join(outputDir, 'support.js'),
  patchSupportJs(await readFile(path.join(sourceDir, 'support.js'), 'utf8')),
);

for (const file of ['mobile.js', 'wedding-state.js']) {
  await copyIfExists(path.join(sourceDir, file), path.join(outputDir, file));
}

for (const page of pages) {
  const sourcePath = path.join(sourceDir, page.file);
  const html = cleanHtml(await readFile(sourcePath, 'utf8'));

  await writeFile(path.join(pagesDir, page.slug), html);
  await writeFile(path.join(componentsDir, page.file), html);

  if (page.route === '/') {
    await writeFile(path.join(outputDir, 'index.html'), html);
  }
}

await writeFile(path.join(outputDir, '_worker.js'), buildWorkerSource());

console.log(`Prepared prototype Pages output at ${path.relative(root, outputDir)}`);
console.log(`Routes: ${pages.map((page) => page.route).join(', ')}`);

async function assertExists(target, label) {
  try {
    await stat(target);
  } catch {
    throw new Error(`${label} was not found.`);
  }
}

async function copyIfExists(from, to) {
  try {
    await stat(from);
  } catch {
    return;
  }

  await cp(from, to, { recursive: true, force: true });
}

function cleanHtml(source) {
  let html = source;

  html = html
    .replaceAll('src="./support.js"', 'src="/support.js"')
    .replaceAll("src='./support.js'", "src='/support.js'")
    .replaceAll('src="./mobile.js"', 'src="/mobile.js"')
    .replaceAll("src='./mobile.js'", "src='/mobile.js'")
    .replaceAll('src="./wedding-state.js"', 'src="/wedding-state.js"')
    .replaceAll("src='./wedding-state.js'", "src='/wedding-state.js'")
    .replaceAll('src="./uploads/', 'src="/uploads/')
    .replaceAll("src='./uploads/", "src='/uploads/")
    .replaceAll('src="./screenshots/', 'src="/screenshots/')
    .replaceAll("src='./screenshots/", "src='/screenshots/")
    .replaceAll('href="./uploads/', 'href="/uploads/')
    .replaceAll("href='./uploads/", "href='/uploads/")
    .replaceAll('href="./screenshots/', 'href="/screenshots/')
    .replaceAll("href='./screenshots/", "href='/screenshots/");

  for (const page of pages) {
    for (const alias of publicPageAliases(page.file, page.slug)) {
      html = html.replace(new RegExp(escapeRegExp(alias), 'g'), page.route);
    }
  }

  return html;
}

function patchSupportJs(source) {
  const legacyExtension = `.${'dc'}.html`;
  const legacyRegexSource = '\\.' + 'dc' + '\\.html';

  return source
    .replace('var COMPONENT_DIR = ".";', 'var COMPONENT_DIR = "/_components";')
    .replaceAll(`.replace(/${legacyRegexSource}$/, "").replace(/\\.html?$/, "")`, '.replace(/\\.html?$/, "")')
    .replaceAll(`/${legacyRegexSource}?$/i`, '/\\.html?$/i')
    .replaceAll(` + "${legacyExtension}"`, ' + ".html"')
    .replaceAll(`"${legacyExtension}: <script data-dc-script> must define \`class Component extends DCLogic\`"`, '".html: <script data-dc-script> must define `class Component extends DCLogic`"');
}

function publicPageAliases(file, slug) {
  const stem = file.replace(/\.html$/i, '');
  const encodedFile = encodeURI(file);

  return [
    file,
    encodedFile,
    `${slug}.html`,
  ];
}

function workerRedirectAliases(page) {
  const stem = page.file.replace(/\.html$/i, '').toLowerCase();
  const slug = page.slug.toLowerCase();
  const aliases = new Set([
    `/${stem}`,
    `/${stem}.html`,
    `/${slug}.html`,
  ]);

  if (page.route === '/') {
    aliases.add('/index');
    aliases.add('/index.html');
    aliases.add('/homepage.html');
  }

  return [...aliases];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWorkerSource() {
  const routes = Object.fromEntries(pages.map((page) => [page.route, page.slug]));
  const redirects = { ...extraRedirects };

  for (const page of pages) {
    for (const alias of workerRedirectAliases(page)) {
      if (alias !== page.route) {
        redirects[alias] = page.route;
      }
    }
  }

  return `const ROUTES = ${JSON.stringify(routes, null, 2)};
const REDIRECTS = ${JSON.stringify(redirects, null, 2)};

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\\/+$/, '');
      return Response.redirect(url.toString(), 308);
    }

    const path = normalizePath(url.pathname);
    const redirectTo = REDIRECTS[path];

    if (redirectTo) {
      url.pathname = redirectTo;
      return Response.redirect(url.toString(), 308);
    }

    const slug = ROUTES[path];
    if (slug) {
      return servePage(slug, request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function servePage(slug, request, env) {
  const url = new URL(request.url);
  url.pathname = '/_pages/' + slug;

  const response = await env.ASSETS.fetch(new Request(url.toString(), request));
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(HTML_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function normalizePath(pathname) {
  let path = pathname || '/';
  try {
    path = decodeURIComponent(path);
  } catch {
  }

  path = path.replace(/\\/+$/, '') || '/';
  return path.toLowerCase();
}
`;
}
