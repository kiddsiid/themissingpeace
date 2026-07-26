# Deploying The Missing Peace

> **Rewritten 2026-07-25. Retargeted to Cloudflare Workers 2026-07-26.** The canonical rule
> lives in `docs/design/One-Engine-Redesign-Plan.md` §26.4 ("Deploy path — what a push
> actually builds") and §26.1(3) (the phase gate). This file is the operational companion;
> if the two ever disagree, §26 wins.
>
> Two earlier claims in this file are now dead and are named so nobody restores them. It
> once said the live URL "should serve the prototype for now" — that was one of the reasons
> the product never reached the live host. And until 2026-07-26 it described a **Cloudflare
> Pages** deploy. The target is now **Cloudflare Workers**, by owner decision.

## What deploys, and when

The deploy is triggered by a **push to GitHub**, not by a command on a laptop.

```text
Repository:        kiddsiid/themissingpeace
Production branch: master
Worker:            themissingpeace
Trigger:           Workers Builds git integration
```

A push to `master` publishes to the Worker's production URL. A push to any other branch
publishes a preview version and Cloudflare posts its URLs as a comment on the pull request.

There are no GitHub Actions in this repository and GitHub Pages is not used.

## Before anything else: disconnect Pages

The Cloudflare **Pages** project `themissingpeace` is wired to the same repository. If it is
still connected when the Worker is connected, one push builds both targets and the older,
misconfigured one publishes over the product — which is the exact failure this migration
exists to end.

Disconnect the Pages project from git first. Delete it or leave it dormant afterwards;
either is fine. Leaving it connected is not.

## Workers Builds settings

These are set on the Worker in the Cloudflare dashboard, not in this repository.

```text
Git repository:                        kiddsiid/themissingpeace
Git branch (production):               master
Build command:                         pnpm run build:worker
Deploy command:                        npx wrangler deploy
Non-production branch deploy command:  npx wrangler versions upload
Root directory:                        /
Non-production branch builds:          enabled
```

The build runs once, in the build step. The two deploy commands then differ only in the
wrangler verb: `deploy` promotes to production, `versions upload` publishes a preview
version without touching production traffic. Do not put `pnpm run deploy:worker` in the
deploy field — it would rebuild, and it leaves the non-production branch no way to upload
without deploying.

Workers Builds ignores any `[build]` / custom-build section in `wrangler.jsonc`. The build
command is a dashboard field and only a dashboard field.

The Worker's shape — name, entrypoint `.open-next/worker.js`, assets directory
`.open-next/assets` with binding `ASSETS`, compatibility date and `nodejs_compat` — lives in
`wrangler.jsonc` at the repository root, in version control, and needs no dashboard
equivalent.

## Build variables and secrets

Every `NEXT_PUBLIC_*` value is inlined into the client bundle at build time, and a Cloudflare
git build does not read `.env.local`. Cloudflare requires these in the **Build variables and
secrets** section specifically; a runtime variable is too late for them.

```text
NEXT_PUBLIC_APP_URL=<the Worker's production URL>
NEXT_PUBLIC_SUPABASE_URL=https://ztgixihhivtharrelmps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
```

Set these as **secrets**, never as plain-text variables — as build secrets, and as runtime
secrets on the Worker:

```text
SUPABASE_SERVICE_ROLE_KEY
LIVEBLOCKS_SECRET_KEY
ANTHROPIC_API_KEY
```

`ANTHROPIC_MODEL` can be an ordinary variable. Clerk variables are dead — no source file
imports `@clerk` or reads a `CLERK_*` value; authentication is Supabase. Stripe secrets
belong only to the prototype project and are set with
`wrangler --cwd cloudflare-prototype pages secret put STRIPE_SECRET_KEY`.

`NEXT_PUBLIC_APP_URL` changes with the target and its new value cannot be known in advance.
A Worker's production URL is `themissingpeace.<subdomain>.workers.dev`, where `<subdomain>`
is the account's own workers.dev subdomain, or a custom domain if one is attached. Read it
off the Worker after the first deploy and set it then. Do not guess it, and do not leave it
pointing at the old `pages.dev` host.

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

**Check the stamp, not the status code.** The target that stood here before the migration
answered *every* path with HTTP 200 and the prototype's landing HTML — `/version`,
`/api/version` and an invented path alike, verified by direct fetch on 2026-07-26. So "the
page loaded" and "it wasn't a 404" are both worthless as evidence. What proves a deploy is
the commit printed on the page. `/api/version` is the sharper of the two probes: the product
answers it with JSON, a static catch-all answers it with HTML, so the content type alone
tells you which one you reached. See One-Engine 26.4, *The catch-all trap*.

**Which URL to open.** For `master`, the Worker's production URL. For any other branch, the
**Branch Preview URL** (`<branch-name>-themissingpeace.<subdomain>.workers.dev`) from the
pull request comment Cloudflare posts, or the Commit Preview URL for one specific version.
Read them off the comment or the Worker's version list — the subdomain is account-specific
and the branch segment is normalised, so a hand-built URL is a guess. If no comment appears,
check that preview URLs are enabled on the Worker and non-production branch builds are
enabled on the build configuration.

To confirm the build also passes the login screen, sign in with the agent admin account.
Its credentials are in `docs/access/` (gitignored, never committed).

## Manual deploys (override, not the gate)

The wrangler scripts still work and are useful for a one-off publish, but they are not
what a phase gate reads.

```bash
pnpm run build:worker      # opennextjs-cloudflare build
pnpm run preview           # build, then run the Worker locally
pnpm run deploy:worker     # build, then opennextjs-cloudflare deploy
pnpm run deploy:product    # alias of deploy:worker
pnpm run prototype:deploy  # publishes the static prototype to themissingpeace-prototype
```

`themissingpeace-prototype` does not exist yet — the hostname does not resolve as of
2026-07-26 — so the prototype has nowhere of its own to live until that project is created.

Product deploy files and scripts: `open-next.config.ts`, `wrangler.jsonc`,
`pnpm run build:worker`, `pnpm run deploy:worker`, `pnpm run deploy:product`.

Prototype files and scripts: `prototype/`, `scripts/prepare-prototype-pages.mjs`,
`cloudflare-prototype/wrangler.jsonc`, `pnpm run prototype:build`,
`pnpm run prototype:deploy`.

## Dead, and not to be extended

| Dead | Was |
| --- | --- |
| `cloudflare-pages/wrangler.jsonc` | the Pages config, `pages_build_output_dir` |
| `scripts/prepare-cloudflare-pages.mjs` | 88 lines of hand-written Pages layout glue |
| `pnpm run pages:build` / `pages:preview` / `pages:deploy` | removed from `package.json` 2026-07-26 |

The two files are still on disk; removing them is housekeeping, not a blocker.

> There is no `pnpm run deploy` script. Earlier revisions of this file documented one; it
> was the alias that published the prototype over the product, and it is gone.
