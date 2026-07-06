# Credentials setup — getting the keys for `.env.local`

Fill these into `.env.local` (copy from `.env.example`). Order = fastest path to unblock Codex.
**Blocking for the next pass:** Supabase, Clerk, Liveblocks, Anthropic. The rest can wait.

---

## 1) Supabase  (database + storage)  ⏱ ~10 min
1. Go to https://supabase.com → sign in → **New project**. Pick an org, name it
   (e.g. "the-missing-peace"), set a strong **database password** (save it), choose a region, create.
   Wait ~2 min for it to provision.
2. **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   Dashboard → **Project Settings → Data API** (or the **Connect** button up top) → copy *Project URL*.
3. **Keys** → Dashboard → **Project Settings → API Keys**. Supabase has TWO key systems right now:
   - **Easiest (matches the current code):** open the **Legacy API Keys** tab and copy:
     - `anon` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`  (full access — server only, never ship to client)
   - **New keys** (legacy deprecates end of 2026): the **API Keys** tab has `publishable` (`sb_publishable_…`)
     and `secret` (`sb_secret_…`). If you use these, paste publishable → the ANON var and a secret key →
     the SERVICE_ROLE var. (Same code works; only the values differ.)
4. **Run the migrations.** Dashboard → **SQL Editor** → New query → paste the contents of
   `supabase/migrations/0001_init.sql`, run; then do the same with `0002_rls_helper.sql`.
   (Or with the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.)
5. (Later, for uploads) **Storage** → create a **private** bucket (e.g. `uploads`) — used in Phase 2.

## 2) Clerk  (auth; orgs = workspaces)  ⏱ ~10 min
1. Go to https://clerk.com → **Create application** → choose sign-in methods (email is fine) → create.
2. **Keys** → Dashboard → **API keys**:
   - Publishable (`pk_test_…`) → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret (`sk_test_…`) → `CLERK_SECRET_KEY`
3. **Enable Organizations** (required — orgs map to workspaces): Dashboard → **Organizations** (or
   **Configure → Organizations Settings**) → toggle **Enable organizations**.
4. **Webhook** (so users/orgs sync into Postgres) → Dashboard → **Webhooks → Add Endpoint**:
   - Endpoint URL: `https://<your-app-url>/api/webhooks/clerk`
     (local dev has no public URL — use a tunnel like `ngrok http 3000` or Clerk's dev tunnel, and use
     that https URL; or skip the webhook at first and manually insert one `users` + `workspaces` row to test.)
   - Subscribe to events: `user.created`, `user.updated`, `organization.created`, `organization.updated`,
     `organizationMembership.created`, `organizationMembership.updated`.
   - Create it, open it, copy the **Signing secret** (`whsec_…`) → `CLERK_WEBHOOK_SECRET`.

## 3) Liveblocks  (realtime board)  ⏱ ~5 min
1. Go to https://liveblocks.io → sign up → **Create project**.
2. Project → **API keys**:
   - Public key (`pk_…`) → `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`
   - Secret key (`sk_…`) → `LIVEBLOCKS_SECRET_KEY`

## 4) Anthropic  (the Peacekeeper AI)  ⏱ ~5 min
1. Go to https://console.anthropic.com → sign in.
2. Add a payment method / credits (Billing) — the API needs an active balance.
3. **API keys → Create key** → copy (`sk-ant-…`) → `ANTHROPIC_API_KEY`.

---

## Useful but NOT blocking the next pass
- **Resend** (email) → https://resend.com → **API Keys → Create** → `RESEND_API_KEY`.
  For real sending, verify a domain (Domains tab); test sending works without it.
- **Twilio** (optional SMS) → https://twilio.com/console → copy **Account SID** + **Auth Token**;
  buy a phone number to actually send → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
- **Google Maps** (venue/destination places) → https://console.cloud.google.com → new project →
  **APIs & Services → Library → enable "Places API"** → **Credentials → Create API key** →
  restrict it (HTTP referrers + Places API) → `GOOGLE_MAPS_API_KEY`.
- **Peace Notes encryption key** (`PEACE_NOTES_KMS_KEY_ID`) — only needed when the Peace Notes module
  (Phase 3) is built. Options: a key in **Supabase Vault**, or a cloud KMS key id (AWS KMS / GCP KMS).
  For early dev you can set any placeholder and use a local symmetric key; do NOT ship Peace Notes to real
  users until this is a managed key (bodies are encrypted at rest — Build Plan v2 §4.3a).

---

## Minimum to unblock Codex right now
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ run both
migrations), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (+ enable Organizations),
`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`, `LIVEBLOCKS_SECRET_KEY`, `ANTHROPIC_API_KEY`.
Clerk webhook + the "useful" group can follow.
