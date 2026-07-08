# Deploying The Missing Peace

The live `themissingpeace.pages.dev` URL should serve the prototype for now. A separate landing page can be created later without changing this repository.

## Current Live Deploy

The prototype in `prototype/` is the source for the current Cloudflare Pages build.

Important files and scripts:

- `prototype/`
- `scripts/prepare-prototype-pages.mjs`
- `cloudflare-prototype/wrangler.jsonc`
- `pnpm run prototype:build`
- `pnpm run prototype:deploy`
- `pnpm run deploy`

`pnpm run prototype:build` prepares `.pages-prototype/` for Cloudflare Pages. It keeps public URLs clean while still supporting the exported prototype runtime internally.

Public routes include:

```text
/
/dreamwalk
/dream
/peacecenter
/board
/decisions
/moneymap
/vendors
/guests
/seatingstudio
/website
/printables
/timeline
/documents
/playlist
/honeymoon
/peacenotes
```

Old spaced `.html` paths redirect to the clean versions.

Deploy the current prototype directly with:

```bash
pnpm run deploy
```

That command targets:

```text
Project: themissingpeace
URL: https://themissingpeace.pages.dev
Output directory: .pages-prototype
```

## GitHub To Cloudflare Automation

Once the Cloudflare Pages project is connected to GitHub, use these settings:

```text
Repository: kiddsiid/themissingpeace
Production branch: master
Root directory: cloudflare-prototype
Build command: node ../scripts/prepare-prototype-pages.mjs
Build output directory: ../.pages-prototype
```

With those settings, every push to `master` builds and deploys the current prototype automatically.

## Product Deploy Later

The Next.js product deploy setup is still available. Use it when the product is ready to replace the prototype:

```bash
pnpm run deploy:product
```

Product deploy files and scripts:

- `open-next.config.ts`
- `wrangler.jsonc`
- `cloudflare-pages/wrangler.jsonc`
- `scripts/prepare-cloudflare-pages.mjs`
- `pnpm run pages:build`
- `pnpm run pages:deploy`
- `pnpm run deploy:product`

The product output directory is `.open-next/pages`.

## Build Variables And Secrets

The prototype deploy does not require product secrets.

When deploying the full product, add these build/runtime variables in Cloudflare. The `NEXT_PUBLIC_*` values are needed during the Next.js build because they are inlined into the client bundle.

```text
NEXT_PUBLIC_APP_URL=https://themissingpeace.pages.dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
```

Add these as secrets, not plain text variables:

```text
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
LIVEBLOCKS_SECRET_KEY
ANTHROPIC_API_KEY
```

`ANTHROPIC_MODEL` can be a normal variable.
