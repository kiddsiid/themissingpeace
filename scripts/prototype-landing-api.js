/* The Missing Peace — landing API (inlined into the generated _worker.js by
   scripts/prepare-prototype-pages.mjs — do not deploy this file on its own).

   Endpoints (all same-origin, JSON):
     GET  /api/config           -> { stripeConfigured, offers } (display-safe subset)
     POST /api/lead             -> save a lead / compass / consents / utm (D1)
     POST /api/event            -> first-party analytics event (D1)
     POST /api/checkout         -> create a real Stripe Checkout Session (server-side)
     GET  /api/checkout-status  -> verify a session server-side (success page state)
     POST /api/stripe-webhook   -> Stripe webhook (signature verified, WebCrypto)

   Environment (Cloudflare Pages project):
     DB                     - D1 binding (required for lead/event storage)
     STRIPE_SECRET_KEY      - secret; when absent, checkout reports fallback:"reserve"
     STRIPE_WEBHOOK_SECRET  - secret; required to accept webhooks
     STRIPE_PRICE_<OFFERID> - optional Stripe Price id per offer (e.g.
                              STRIPE_PRICE_FOUNDING_COUPLE); otherwise price_data
                              from the build-time LANDING_CONFIG is used.
   Card data never touches this origin: payment happens on Stripe-hosted Checkout,
   and confirmation is only trusted via checkout-status retrieval + the webhook. */

const API_JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function apiJson(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: API_JSON_HEADERS });
}

function apiError(status, code, message, fields) {
  return apiJson({ ok: false, error: { code: code, message: message, fields: fields || undefined } }, status);
}

function randomId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let s = '';
  for (const b of bytes) s += 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31];
  return (prefix ? prefix + '_' : '') + s;
}

function isEmail(v) {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function clip(v, n) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, n) : null;
}

async function readJsonBody(request, maxBytes) {
  const text = await request.text();
  if (text.length > (maxBytes || 32768)) throw new Error('too_large');
  return JSON.parse(text || '{}');
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '');
  try {
    if (path === '/api/config' && request.method === 'GET') return apiConfig(env);
    if (path === '/api/lead' && request.method === 'POST') return apiLead(request, env);
    if (path === '/api/event' && request.method === 'POST') return apiEvent(request, env);
    if (path === '/api/checkout' && request.method === 'POST') return apiCheckout(request, env, url);
    if (path === '/api/checkout-status' && request.method === 'GET') return apiCheckoutStatus(env, url);
    if (path === '/api/stripe-webhook' && request.method === 'POST') return apiStripeWebhook(request, env);
  } catch (err) {
    if (err && err.message === 'too_large') return apiError(413, 'too_large', 'Request body too large.');
    if (err instanceof SyntaxError) return apiError(400, 'bad_json', 'Body must be valid JSON.');
    console.error('api error', path, err && err.stack ? err.stack : err);
    return apiError(500, 'server_error', 'Something went wrong on our side. Please try again.');
  }
  return apiError(404, 'not_found', 'Unknown API endpoint.');
}

function stripeConfigured(env) {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function apiConfig(env) {
  const offers = {};
  for (const [id, o] of Object.entries(LANDING_CONFIG.offers || {})) {
    offers[id] = {
      active: !!o.active, name: o.name, priceCents: o.priceCents, currency: o.currency,
      billingType: o.billingType, billingLabel: o.billingLabel,
    };
  }
  return apiJson({ ok: true, stripeConfigured: stripeConfigured(env), offers: offers });
}

/* ---------------------------- leads ---------------------------- */

async function apiLead(request, env) {
  const b = await readJsonBody(request, 32768);
  const fields = {};
  const firstName = clip(b.firstName, 80);
  if (!firstName) fields.firstName = 'Please tell us your first name.';
  if (!isEmail(b.email)) fields.email = 'That email address does not look complete.';
  if (b.consentDelivery !== true) fields.consentDelivery = 'We need your permission to email you your Compass.';
  if (b.partnerEmail && !isEmail(b.partnerEmail)) fields.partnerEmail = 'That email address does not look complete.';
  if (Object.keys(fields).length) return apiError(422, 'validation', 'A detail or two needs attention.', fields);

  if (!env.DB) return apiError(503, 'no_storage', 'Saving is not configured yet on this deployment.');

  const email = b.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const refCode = randomId('mp');
  const compass = b.compass ? JSON.stringify(b.compass).slice(0, 8000) : null;
  const utm = b.utm ? JSON.stringify(b.utm).slice(0, 2000) : null;
  const offerInterest = clip(b.offerInterest, 40);

  await env.DB.prepare(
    `INSERT INTO leads (id, first_name, email, partner_email, wedding_date, planning_stage,
       consent_delivery, consent_marketing, compass, utm, referrer_code, ref_code, offer_interest, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'lead', ?14, ?14)
     ON CONFLICT(email) DO UPDATE SET
       first_name = excluded.first_name,
       partner_email = COALESCE(excluded.partner_email, leads.partner_email),
       wedding_date = COALESCE(excluded.wedding_date, leads.wedding_date),
       planning_stage = COALESCE(excluded.planning_stage, leads.planning_stage),
       consent_delivery = excluded.consent_delivery,
       consent_marketing = excluded.consent_marketing,
       compass = COALESCE(excluded.compass, leads.compass),
       utm = COALESCE(excluded.utm, leads.utm),
       offer_interest = COALESCE(excluded.offer_interest, leads.offer_interest),
       updated_at = excluded.updated_at`
  ).bind(
    randomId('ld'), firstName, email,
    b.partnerEmail ? b.partnerEmail.trim().toLowerCase() : null,
    clip(b.weddingDate, 40), clip(b.planningStage, 60),
    1, b.consentMarketing === true ? 1 : 0,
    compass, utm, clip(b.ref, 40), refCode, offerInterest, now
  ).run();

  const row = await env.DB.prepare('SELECT ref_code FROM leads WHERE email = ?1').bind(email).first();
  return apiJson({ ok: true, refCode: (row && row.ref_code) || refCode });
}

/* ---------------------------- events ---------------------------- */

const KNOWN_EVENTS = new Set([
  'page_view', 'dream_walk_started', 'dream_walk_completed', 'compass_revealed',
  'compass_shared', 'email_submitted', 'checkout_started', 'checkout_fallback_reserved',
  'payment_completed', 'checkout_cancelled', 'checkout_failed', 'demo_opened',
]);

async function apiEvent(request, env) {
  const b = await readJsonBody(request, 8192);
  const event = clip(b.event, 60);
  if (!event || !KNOWN_EVENTS.has(event)) return apiError(422, 'unknown_event', 'Unknown event name.');
  if (!env.DB) return apiJson({ ok: true, stored: false });
  await env.DB.prepare(
    'INSERT INTO events (sid, event, props, url, utm, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  ).bind(
    clip(b.sid, 60), event,
    b.props ? JSON.stringify(b.props).slice(0, 2000) : null,
    clip(b.url, 500),
    b.utm ? JSON.stringify(b.utm).slice(0, 2000) : null,
    new Date().toISOString()
  ).run();
  return apiJson({ ok: true, stored: true });
}

/* ---------------------------- Stripe ---------------------------- */

function offerPriceEnvKey(offerId) {
  return 'STRIPE_PRICE_' + offerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

async function stripeRequest(env, method, path, params) {
  const init = {
    method: method,
    headers: {
      authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
  };
  if (params) init.body = new URLSearchParams(params).toString();
  const res = await fetch('https://api.stripe.com' + path, init);
  const data = await res.json();
  if (!res.ok) {
    const msg = data && data.error && data.error.message ? data.error.message : 'Stripe request failed';
    const err = new Error(msg);
    err.stripe = true;
    throw err;
  }
  return data;
}

async function apiCheckout(request, env, url) {
  const b = await readJsonBody(request, 8192);
  const offerId = clip(b.offerId, 60);
  const offer = offerId ? (LANDING_CONFIG.offers || {})[offerId] : null;
  if (!offer || !offer.active) return apiError(422, 'unknown_offer', 'That offer is not available.');
  if (b.email && !isEmail(b.email)) return apiError(422, 'validation', 'That email address does not look complete.', { email: 'That email address does not look complete.' });

  if (!stripeConfigured(env)) {
    // Honest dormant mode: no payment is simulated. The client falls back to a
    // free, non-binding reservation stored as a lead.
    return apiJson({ ok: true, fallback: 'reserve', reason: 'payments_not_configured' });
  }

  const origin = url.origin;
  const params = {
    mode: offer.stripeMode || 'payment',
    'success_url': origin + LANDING_CONFIG.checkout.successPath + '&session_id={CHECKOUT_SESSION_ID}',
    'cancel_url': origin + LANDING_CONFIG.checkout.cancelPath + '&offer=' + encodeURIComponent(offerId),
    'metadata[offer_id]': offerId,
    'allow_promotion_codes': 'true',
  };
  if (b.email) params['customer_email'] = b.email.trim().toLowerCase();
  if (b.leadRef) params['metadata[lead_ref]'] = clip(b.leadRef, 60) || '';
  if (b.utmSource) params['metadata[utm_source]'] = clip(b.utmSource, 100) || '';

  const priceId = env[offerPriceEnvKey(offerId)];
  if (priceId) {
    params['line_items[0][price]'] = priceId;
  } else {
    params['line_items[0][price_data][currency]'] = offer.currency;
    params['line_items[0][price_data][unit_amount]'] = String(offer.priceCents);
    params['line_items[0][price_data][product_data][name]'] = LANDING_CONFIG.site.name + ' — ' + offer.name + ' (early access)';
  }
  params['line_items[0][quantity]'] = '1';

  try {
    const session = await stripeRequest(env, 'POST', '/v1/checkout/sessions', params);
    return apiJson({ ok: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    if (err.stripe) return apiError(502, 'stripe_error', 'Our payment provider could not start checkout. Nothing was charged — please try again.');
    throw err;
  }
}

async function apiCheckoutStatus(env, url) {
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return apiError(422, 'bad_session', 'Missing or malformed session id.');
  if (!stripeConfigured(env)) return apiError(409, 'not_configured', 'Payments are not configured.');
  try {
    const session = await stripeRequest(env, 'GET', '/v1/checkout/sessions/' + sessionId, null);
    return apiJson({
      ok: true,
      status: session.status,                    // open | complete | expired
      paymentStatus: session.payment_status,     // paid | unpaid | no_payment_required
      offerId: (session.metadata && session.metadata.offer_id) || null,
      customerEmail: (session.customer_details && session.customer_details.email) || session.customer_email || null,
    });
  } catch (err) {
    if (err.stripe) return apiError(502, 'stripe_error', 'Could not verify the payment session.');
    throw err;
  }
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;
  const parts = {};
  for (const kv of header.split(',')) {
    const i = kv.indexOf('=');
    if (i > 0) {
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (k === 'v1') (parts.v1 = parts.v1 || []).push(v);
      else parts[k] = v;
    }
  }
  if (!parts.t || !parts.v1 || !parts.v1.length) return false;
  const tolerance = 5 * 60;
  const ts = Number(parts.t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > tolerance) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(parts.t + '.' + payload));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  for (const candidate of parts.v1) {
    if (candidate.length === expected.length) {
      let diff = 0;
      for (let i = 0; i < expected.length; i++) diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
      if (diff === 0) return true;
    }
  }
  return false;
}

async function apiStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return apiError(409, 'not_configured', 'Webhook secret not configured.');
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return apiError(400, 'bad_signature', 'Signature verification failed.');

  let event;
  try { event = JSON.parse(payload); } catch { return apiError(400, 'bad_json', 'Invalid payload.'); }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data && event.data.object ? event.data.object : {};
    const email = (s.customer_details && s.customer_details.email) || s.customer_email || null;
    if (env.DB) {
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO orders (id, stripe_session_id, offer_id, email, amount_total, currency, payment_status, raw, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(stripe_session_id) DO UPDATE SET payment_status = excluded.payment_status`
      ).bind(
        randomId('or'), s.id || null,
        (s.metadata && s.metadata.offer_id) || null,
        email ? email.toLowerCase() : null,
        typeof s.amount_total === 'number' ? s.amount_total : null,
        s.currency || null,
        s.payment_status || 'paid',
        JSON.stringify(s).slice(0, 16000), now
      ).run();
      if (email) {
        await env.DB.prepare(
          "UPDATE leads SET status = 'founding-member', updated_at = ?2 WHERE email = ?1"
        ).bind(email.toLowerCase(), now).run();
      }
      await env.DB.prepare(
        'INSERT INTO events (sid, event, props, url, utm, created_at) VALUES (NULL, ?1, ?2, NULL, NULL, ?3)'
      ).bind('payment_completed', JSON.stringify({ offerId: (s.metadata && s.metadata.offer_id) || null, sessionId: s.id }), now).run();
    }
  }
  return apiJson({ ok: true, received: true });
}
