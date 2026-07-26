# Deploying The Missing Peace

> **Rewritten 2026-07-25.** The canonical rule lives in
> `docs/design/One-Engine-Redesign-Plan.md` §26.4 ("Deploy path — what a push actually
> builds") and §26.1(3) (the phase gate). This file is the operational companion; if the
> two ever disagree, §26 wins.
>
> The previous version of this file said the live URL "should serve the prototype for
> now." That is no longer true and was one of the reasons the product never reached
> `themissingpeace.pages.dev`. From 2026-07-25 the product is the only thing that ships.

## What deploys, and when

The deploy is triggered by a **push to GitHub**, not by a command on a laptop.

```text
Repository:        kiddsiid/themissingpeace
Production branch: master
Trigger:           Cloudflare Pages git integration
```

A push to `master` publishes to `https://themissingpeace.pages.dev`. A push to any other
branch publishes a preview deployment under its own alias. Read that alias off the
Cloudflare deployment or the GitHub deployment status — Cloudflare lowercases the branch
name, replaces non-alphanumeric characters with `-`, and truncates it, so a hand-built
guess will 404.

There are no GitHub Actions in this repository and GitHub Pages is not used.

## The build settings the product needs

These are set on the Cloudflare Pages project, not in this repository.

```text
Root directory:          /                      (repository root)
Build command:           pnpm run pages:build
Build output directory:  .open-next/pages
```

As of 2026-07-25 the project is **still configured for the prototype** — root directory
`cloudflare-prototype`, build command `node ../scripts/prepare-prototype-pages.mjs`,
output `dist`. Until an owner changes it, every push republishes the static prototype over
the product. Changing it needs owner sign-off; it is the open defect recorded in §26.4.

## Confirming a deploy

Never close a phase on a build log. Open the deployment the push produced and check:

```text
/version       the readable build stamp: commit, short commit, branch, build time
/api/version   the same as JSON, cache-control: no-store, for scripted checks
```

Both routes are public — they sit outside the auth guard in
`src/lib/supabase/middleware.ts` — so a deploy is verifiable without signing in. Compare
the short commit against `git log`. A mismatch means the deploy landed somewhere other
than where you thought, whatever the build log said.

To confirm the build also passes the login screen, sign in with the agent admin account.
Its credentials are in `docs/access/` (gitignored, never committed).

## Build variables and secrets

Every `NEXT_PUBLIC_*` value is inlined into the client bundle at build time, and a
Cloudflare git build does not read `.env.local`. Set these as **build variables** on the
Pages project:

```text
NEXT_PUBLIC_APP_URL=https://themissingpeace.pages.dev
NEXT_PUBLIC_SUPABASE_URL=https://ztgixihhivtharrelmps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
```

Set these as **secrets**, never as plain-text variables:

```text
SUPABASE_SERVICE_ROLE_KEY
LIVEBLOCKS_SECRET_KEY
ANTHROPIC_API_KEY
```

`ANTHROPIC_MODEL` can be an ordinary variable. Clerk variables are dead — no source file
imports `@clerk` or reads a `CLERK_*` value; authentication is Supabase. Stripe secrets
belong only to the prototype project and are set with
`wrangler --cwd cloudflare-prototype pages secret put STRIPE_SECRET_KEY`.

## Manual deploys (override, not the gate)

The wrangler scripts still work and are useful for a one-off publish, but they are not
what a phase gate reads.

```bash
pnpm run deploy:product    # = pages:build + wrangler pages deploy --project-name=themissingpeace
pnpm run prototype:deploy  # publishes the static prototype to themissingpeace-prototype
```

`themissingpeace-prototype` does not exist yet — the hostname does not resolve as of
2026-07-25 — so the prototype has nowhere of its own to live until that project is
created.

Product deploy files and scripts: `open-next.config.ts`, `wrangler.jsonc`,
`cloudflare-pages/wrangler.jsonc`, `scripts/prepare-cloudflare-pages.mjs`,
`pnpm run pages:build`, `pnpm run pages:deploy`, `pnpm run deploy:product`.

Prototype files and scripts: `prototype/`, `scripts/prepare-prototype-pages.mjs`,
`cloudflare-prototype/wrangler.jsonc`, `pnpm run prototype:build`,
`pnpm run prototype:deploy`.

> There is no `pnpm run deploy` script. Earlier revisions of this file documented one; it
> was the alias that published the prototype over the product, and it is gone.
