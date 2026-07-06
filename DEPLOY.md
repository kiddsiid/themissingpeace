# Deploying The Missing Peace: GitHub -> Cloudflare Workers

The repo is already configured for Cloudflare Workers through the OpenNext adapter. The important files and scripts are:

- `wrangler.jsonc`
- `open-next.config.ts`
- `pnpm run preview`
- `pnpm run deploy`

Cloudflare's current Next.js guidance uses `@opennextjs/cloudflare`, Wrangler, `nodejs_compat`, and the `.open-next` output. This repo already matches that shape.

## 1. Push The Repo To GitHub

The remote is expected to be:

```text
https://github.com/kiddsiid/the-missing-peace.git
```

If the remote is already connected, commit and push normally:

```bash
git status
git add -A
git commit -m "Update The Missing Peace docs"
git push
```

There is also a Windows helper:

```text
push-to-github.bat
```

That helper stages, commits, and pushes to the existing GitHub remote. It also creates a private GitHub repo through GitHub CLI if no remote exists yet.

## 2. Connect GitHub To Cloudflare

In Cloudflare:

1. Open the Cloudflare dashboard.
2. Go to **Workers & Pages**.
3. Create or import a Worker from a Git repository.
4. Authorize GitHub if Cloudflare asks.
5. Choose `kiddsiid/the-missing-peace`.
6. Set the production branch to `master` unless the repo is later renamed to `main`.

Cloudflare should read `wrangler.jsonc` from the repo root.

Recommended build/deploy settings:

```text
Root directory: /
Build command: pnpm exec opennextjs-cloudflare build
Deploy command: pnpm exec wrangler deploy
```

Cloudflare Workers Builds runs the build command first and the deploy command second. The local `pnpm run deploy` script still works on your machine, but in Cloudflare the split commands make the pipeline easier to read and debug.

```text
Install command: pnpm install
```

## 3. Add Build Variables

Add these in Cloudflare as build variables. The `NEXT_PUBLIC_*` values are needed during the Next.js build because they are inlined into the client bundle.

```text
NEXT_PUBLIC_APP_URL=https://the-missing-peace.<your-subdomain>.workers.dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
```

After the first successful deploy, update `NEXT_PUBLIC_APP_URL` to the real production URL and redeploy. The Wedding Website share links use this value.

## 4. Add Runtime Secrets

Add these as Cloudflare secrets, not plain text variables:

```text
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
LIVEBLOCKS_SECRET_KEY
ANTHROPIC_API_KEY
```

`ANTHROPIC_MODEL` can be a normal variable.

## 5. Verify Production Services

Clerk:

- For real guests, use a Clerk production instance.
- Add the production domain in Clerk.
- Set the webhook endpoint to:

  ```text
  https://YOUR-PRODUCTION-URL/api/webhooks/clerk
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

## 6. First Deploy Checklist

- GitHub repo has the latest `master` branch.
- Cloudflare Worker is connected to the GitHub repo.
- `wrangler.jsonc` is being read from the repo root.
- Build variables are present.
- Runtime secrets are present.
- Supabase migrations are applied.
- Clerk webhook points to production.
- `NEXT_PUBLIC_APP_URL` matches the Cloudflare production URL.

Once that is done, every push to the production branch should trigger a new Cloudflare build and deployment.

## Local Cloudflare Preview

Use this before shipping when you want to test the app in the Cloudflare Workers runtime:

```bash
pnpm run preview
```

Use this for a direct deploy from your machine:

```bash
pnpm run deploy
```

The GitHub-connected Cloudflare flow is still the better ongoing setup because GitHub becomes the source of truth and Cloudflare redeploys automatically after each push.

## Custom Domain

In Cloudflare:

1. Open the Worker.
2. Go to domains and routes.
3. Add the custom domain, such as `themissingpeace.app`.
4. Update `NEXT_PUBLIC_APP_URL` to the custom domain.
5. Add the same domain in Clerk.
6. Redeploy.

## Notes

- Keep `nodejs_compat` in `wrangler.jsonc`; OpenNext needs it for this Next.js app.
- Keep `.open-next/` and `.wrangler/` out of Git. They are generated build artifacts.
- If a Cloudflare build fails, check build variables first. Missing `NEXT_PUBLIC_*` values often cause broken client-side configuration.
- If the deployed app loads but auth, RSVP, uploads, or realtime behavior fails, check runtime secrets and third-party dashboard URLs.
