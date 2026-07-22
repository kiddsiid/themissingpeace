# The Missing Peace — Conversion Landing Page

The prototype homepage (`/`) is now a conversion landing page built around the funnel:

**Hero → free Dream Walk (5 questions, inline, no account) → Wedding Compass reveal
(sentence + 3 priorities + ripple example + Peace Center preview + partner invite) →
email capture → engine walkthrough (7 scenes) → Founding offer → Stripe checkout.**

The Maya/Julian/Aria persona picker was **not** deleted — it moved to `/demo`, clearly
labeled as demo mode, linked from the nav, footer, and FAQ. `/dreamwalk` (the in-product
Dream Walk) is untouched; the landing's inline walk writes to the same
`tmp_dream` / `WeddingState` storage, so "Enter the Dream Workspace" continues seamlessly.

New routes: `/` (landing) · `/demo` · `/privacy` · `/terms` — plus API routes under `/api/*`.

## Files

| File | What it is |
|---|---|
| `prototype/Homepage.html` | The landing page (self-contained HTML/CSS/JS, real `<head>` for SEO) |
| `prototype/Demo.html` | Old homepage → demo mode (noindex) |
| `prototype/Privacy.html`, `prototype/Terms.html` | Early-access legal pages |
| `prototype/landing-config.json` | **Single source of truth for the offers** (see below) |
| `prototype/uploads/og-compass.png` | Social share image (1200×630) |
| `scripts/prototype-landing-api.js` | Worker API source (leads, Stripe, analytics) — inlined into `_worker.js` at build |
| `scripts/prepare-prototype-pages.mjs` | Build script: new routes + config/JSON-LD injection + API inlining |
| `cloudflare-prototype/wrangler.jsonc` | Pages config with the D1 binding |

## Configuring the offer

Everything about the offers lives in `prototype/landing-config.json`: name, headline,
price (`priceCents`), currency, billing type/label, Stripe mode (`payment` /
`subscription`), benefits, access timing, cancellation, and refund policy. Edit → rebuild
→ deploy. The page copy, order summary, structured data (JSON-LD), **and** the server-side
checkout amounts are all generated from this one file, so client tampering can't change a
price. Set `"active": false` on an offer to hide it.

## Lead + analytics storage (Cloudflare D1)

A D1 database **`tmp-landing`** (id `b87beb14-b875-4947-bb35-c26861683379`) was created in
your Cloudflare account on 2026-07-21 with tables `leads`, `orders`, `events` (schema
below). The binding (`DB`) is declared in `cloudflare-prototype/wrangler.jsonc`.

> **After your first deploy, verify the binding:** Cloudflare dashboard → Workers & Pages →
> `themissingpeace` → Settings → Bindings. If `DB → tmp-landing` isn't listed, add it there
> once (D1 database binding, name `DB`). Without it, saving falls back to a friendly error
> and nothing breaks — but you won't capture emails.

Query your leads any time:

```
npx wrangler d1 execute tmp-landing --remote --command "SELECT first_name,email,offer_interest,status,created_at FROM leads ORDER BY created_at DESC"
npx wrangler d1 execute tmp-landing --remote --command "SELECT event,COUNT(*) FROM events GROUP BY event"
```

## Stripe — currently dormant, by design

No Stripe keys are configured, so the offer section automatically runs in **free
reservation mode** ("Reserve my founding seat — free", honest copy, lead saved with
`offer_interest`). **No payment is ever simulated.**

To turn real payments on:

1. In Stripe: create the account, get the **secret key** (start with test mode `sk_test_…`).
2. `wrangler --cwd cloudflare-prototype pages secret put STRIPE_SECRET_KEY`
3. In Stripe dashboard → Developers → Webhooks: add endpoint
   `https://themissingpeace.pages.dev/api/stripe-webhook`, subscribe to
   `checkout.session.completed` (and `checkout.session.async_payment_succeeded`), copy the
   signing secret.
4. `wrangler --cwd cloudflare-prototype pages secret put STRIPE_WEBHOOK_SECRET`
5. Redeploy. The page detects configuration via `/api/config` and switches to real
   Stripe Checkout automatically.

Flow: the page never touches cards. `/api/checkout` creates a Checkout Session
server-side (amounts from `landing-config.json`, or set `STRIPE_PRICE_FOUNDING_COUPLE` /
`STRIPE_PRICE_FOUNDING_PLANNER` env vars to use Stripe Price IDs); the visitor pays on
Stripe's hosted page; success returns to `/?checkout=success&session_id=…`, which is
**verified server-side** via `/api/checkout-status`; the webhook (HMAC-verified,
5-minute tolerance, replay-safe) records the order and promotes the lead to
`founding-member`. Cancel/failure paths return with honest states and a retry button.

## Analytics

First-party events (no third-party trackers) POST to `/api/event` → `events` table, and
mirror into `window.dataLayer` so you can add GTM/GA4/Plausible later without touching
code. Events: `page_view`, `dream_walk_started`, `dream_walk_completed`,
`compass_revealed`, `compass_shared`, `email_submitted`, `checkout_started`,
`checkout_fallback_reserved`, `checkout_cancelled`, `checkout_failed`,
`payment_completed` (also logged server-side by the webhook), `demo_opened`.
UTM parameters + `?ref=` referral codes are captured first-touch and stored on the lead;
every saved lead gets its own `ref_code`, which is appended to their Compass share links.

## Build, preview, deploy

```
pnpm run prototype:build     # regenerates .pages-prototype (config + API inlined)
pnpm run prototype:preview   # local preview at :8788 (simulated local D1)
pnpm run prototype:deploy    # deploy to Cloudflare Pages
```

Note: preview/deploy no longer pass the output directory on the CLI — the config's
`pages_build_output_dir` drives it so bindings apply. First local preview: create the
local tables once with
`npx wrangler --cwd cloudflare-prototype d1 execute tmp-landing --local --file schema.sql`
(schema below).

## Schema

```sql
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  partner_email TEXT, wedding_date TEXT, planning_stage TEXT, consent_delivery INTEGER NOT NULL DEFAULT 0,
  consent_marketing INTEGER NOT NULL DEFAULT 0, compass TEXT, utm TEXT, referrer_code TEXT, ref_code TEXT,
  offer_interest TEXT, status TEXT NOT NULL DEFAULT 'lead', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, stripe_session_id TEXT UNIQUE, offer_id TEXT, email TEXT,
  amount_total INTEGER, currency TEXT, payment_status TEXT, raw TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, event TEXT NOT NULL,
  props TEXT, url TEXT, utm TEXT, created_at TEXT NOT NULL);
```

## Honesty guardrails (please keep them)

No testimonials, no member counts, no fake urgency — the page says so explicitly. Early
access is labeled in the header chip, the offer section, the FAQ, the footer, and the
terms. The email actually promised to leads ("we'll send your Compass") **is not wired
yet** — either connect Resend (key already in `.env.example`) to send the Compass email on
`/api/lead`, or soften that copy before launch. That's the one promise on the page ahead
of the build.

## Still open / nice-to-haves

- Compass delivery email (Resend) + partner invitation email.
- `hello@themissingpeace.app` is a placeholder address in `landing-config.json`,
  `Privacy.html`, `Terms.html` — point it at a real inbox.
- If you later want the landing on a custom domain, update `canonicalUrl` in
  `landing-config.json` **and** the `<link rel="canonical">` / OG URLs in `Homepage.html`.
