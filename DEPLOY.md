# Deploying The Missing Peace Product

The `themissingpeace.pages.dev` URL is the product URL for now. Do not deploy a separate landing page from this repo; a marketing/landing site can live in its own project later.

This app is a full-stack Next.js app. Cloudflare's current guidance points full server-rendered Next.js apps at Workers/OpenNext, while Pages can run a generated Worker through Pages Functions advanced mode. This repo uses that advanced-mode path so the existing `themissingpeace.pages.dev` project serves the product instead of a static landing page.

## Product Deploy To `themissingpeace.pages.dev`

The important files and scripts are:

- `open-next.config.ts`
- `wrangler.jsonc`
- `cloudflare-pages/wrangler.jsonc`
- `scripts/prepare-cloudflare-pages.mjs`
- `pnpm run pages:build`
- `pnpm run pages:deploy`
- `pnpm run deploy`

`pnpm run pages:build` runs the OpenNext build and prepares `.open-next/pages` for Cloudflare Pages. The generated Pages output contains:

- the built static assets from `.open-next/assets`
- the generated OpenNext Worker as `_worker.js`
- the server/runtime files that `_worker.js` imports

Deploy the product to the existing Pages project with:

```bash
pnpm run deploy
```

That command targets:

```text
Project: themissingpeace
URL: https://themissingpeace.pages.dev
Output directory: .open-next/pages
```

## Cloudflare Pages Settings

In the Cloudflare dashboard, open **Workers & Pages -> themissingpeace -> Settings**.

Use these settings for the product project:

```text
Build command: pnpm run pages:build
Build output directory: .open-next/pages
Root directory: /
Pages config: cloudflare-pages/wrangler.jsonc
Compatibility date: 2026-06-05 or newer
Compatibility flags: nodejs_compat
```

If deploying through direct upload, the script handles the build/output directory:

```bash
pnpm run pages:deploy
```

Do not use `cloudflare-page/` as the Pages output. That folder was the temporary landing page and has been removed. The `cloudflare-pages/` folder is only Wrangler configuration for the product deploy.

## Build Variables And Secrets

Add these in Cloudflare as build/runtime variables. The `NEXT_PUBLIC_*` values are needed during the Next.js build because they are inlined into the client bundle.

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

## Service Checks

Clerk:

- Use a Clerk production instance for real guests.
- Add `themissingpeace.pages.dev` in Clerk while this Pages URL is the product URL.
- Set the webhook endpoint to:

  ```text
  https://themissingpeace.pages.dev/api/webhooks/clerk
  ```

- Subscribe the webhook to the user, organization, and membership events used by the app.
- Put the webhook signing secret into `CLERK_WEBHOOK_SECRET`.

Supabase:

- Run migrations `0000_reset.sql` through `0013_guest_pages.sql` in order for a fresh database.
- Confirm Clerk-to-Supabase auth and RLS behavior before inviting real users.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

Liveblocks:

- Use the public key as a build variable.
- Use the secret key as a runtime secret.

Anthropic:

- Use `ANTHROPIC_API_KEY` as a runtime secret.
- Set `ANTHROPIC_MODEL` to the model you want the Peace Engine to use.

## Worker Deploy Fallback

The OpenNext Worker deployment is still available for a future custom domain or Worker-only deployment:

```bash
pnpm run deploy:worker
```

Use the Pages deploy while `https://themissingpeace.pages.dev` is the URL you want people to visit.

## First Deploy Checklist

- Cloudflare Pages project `themissingpeace` exists.
- `pnpm run pages:build` completes locally or in Cloudflare.
- Pages output directory is `.open-next/pages`.
- Compatibility flag includes `nodejs_compat`.
- Build variables are present.
- Runtime secrets are present.
- Supabase migrations are applied.
- Clerk webhook points to `https://themissingpeace.pages.dev/api/webhooks/clerk`.
- `NEXT_PUBLIC_APP_URL` is `https://themissingpeace.pages.dev`.
