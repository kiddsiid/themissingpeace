# Deploying The Missing Peace — GitHub → Cloudflare Workers

The repo is already configured for Cloudflare (OpenNext adapter): `wrangler.jsonc`,
`open-next.config.ts`, and the `deploy`/`preview` scripts are in place. Three stages,
~20 minutes. Goodbye, localhost.

## 1. Push to GitHub (one double-click)

Run **`push-to-github.bat`**. It commits everything (`.env.local` is gitignored — your keys
never leave your machine) and creates a private repo via GitHub CLI.
No GitHub CLI? `winget install GitHub.cli`, then run it again.

## 2. Connect the repo to Cloudflare (push-to-deploy, like the other pages)

1. Dashboard → **Workers & Pages → Create → Workers → Import a repository**, pick
   `the-missing-peace` (authorize GitHub the first time).
2. Build command: `npx opennextjs-cloudflare build` · Deploy command: `npx wrangler deploy`
   (Cloudflare usually detects both from the repo config).
3. **Build variables** (Settings → Builds → Variables — needed at BUILD time because
   `NEXT_PUBLIC_*` values are inlined into the pages):
   - `NEXT_PUBLIC_APP_URL` → `https://the-missing-peace.<your-subdomain>.workers.dev`
     (update once you know the exact URL, then redeploy)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`
4. **Runtime secrets** (Worker → Settings → Variables & Secrets → add as *Secret*):
   - `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LIVEBLOCKS_SECRET_KEY`
   - `ANTHROPIC_API_KEY`, and `ANTHROPIC_MODEL` (plain variable is fine)
5. Deploy. Every `git push` now builds and ships automatically (Workers Builds).

*Prefer terminal? `pnpm install` then `pnpm run deploy` deploys straight from your machine —
same result, no GitHub needed. And `pnpm run preview` runs the app locally in the real
Workers runtime before you ship.*

## 3. Point the services at production

**Clerk** (dashboard.clerk.com):
- Dev keys (`pk_test_/sk_test_`) work for previewing on the workers.dev URL. For real
  guests, create a **production instance**, add your domain, swap the two Clerk keys.
- **Webhook** (replaces the ngrok tunnel): endpoint
  `https://YOUR-URL/api/webhooks/clerk` with user/organization/membership events; put the
  signing secret in the Worker as `CLERK_WEBHOOK_SECRET`.

**Supabase**: nothing URL-specific — the app talks to it server-side. Make sure migrations
**0001 → 0013** are run. Before real users: Clerk↔Supabase third-party auth + `0003` RLS
hardening (HANDOFF.md "Critical RLS Note").

**After first deploy**: set `NEXT_PUBLIC_APP_URL` to the real URL (build variable) and
redeploy — the Website Studio share links use it. Then publish in `/website`: your guests'
links (`/w/your-slug/...`) are live on the internet. ✦

## Custom domain (optional)
Worker → Settings → Domains & Routes → add e.g. `themissingpeace.app` (DNS is instant if
the domain is on Cloudflare). Update `NEXT_PUBLIC_APP_URL` + Clerk domain to match.

## Notes
- The Worker needs `nodejs_compat` (already set in wrangler.jsonc) — don't remove it.
- File uploads are capped at 10MB by next.config; Workers request limits are well above that.
- If a build fails on Workers Builds, check that Build variables include ALL `NEXT_PUBLIC_*`
  values — missing ones bake `undefined` into the client bundle.
