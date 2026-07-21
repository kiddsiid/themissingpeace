# 06 — Risk Register

**Purpose:** rank the technical, product, and delivery risks with concrete mitigations and the phase that owns each. Severity = likelihood × impact on the Definition of Done.

Legend — **Sev:** 🔴 high · 🟠 medium · 🟡 low.

---

## Technical & security

| ID | Risk | Sev | Mitigation | Owner phase |
|---|---|---|---|---|
| R-1 | **Secrets exposure.** `.env.local` sits in the working folder with live Clerk/Supabase/Anthropic keys; a stray commit leaks them. | 🔴 | Confirm `.env.local` is git-ignored; scan history; rotate any key ever pushed; keep service-role key server-only; use Cloudflare build-vs-runtime env split (NEXT_PUBLIC_* build-time, secrets on the Worker). | 1, 8 |
| R-2 | **RLS unproven.** Multi-tenant isolation currently rests on service-layer scoping alone; Clerk-JWT RLS (0003) is written but not exercised (`supabaseForUser()` unused). | 🔴 | Complete Clerk↔Supabase third-party auth; run 0003; route reads through the RLS client; add an explicit User-A-cannot-see-User-B token test as a launch gate. | 1, 8 |
| R-3 | **Two divergent codebases.** Emergent FastAPI/Mongo + CRA vs. local Next/Supabase. Ongoing edits to both guarantees drift and doubles the attack surface. | 🔴 | Adopt local Next.js as sole source of truth; archive Emergent on a tagged branch; one repo of record; stop dual editing (Audit A-0). | 0→1 |
| R-4 | **Weaver silently acting / hallucinating facts.** If AI output is trusted for numbers or writes records, it violates the bounded-AI rule. | 🔴 | Keep the deterministic/AI split hard; Weaver returns cited, confidence-tagged suggestions only; user must approve/dismiss/edit/defer; full audit trail; never mutate Compass/budget/guests/menu/timeline. | 2+ |
| R-5 | **Mount-staleness corruption (documented).** The Cowork sandbox mount served stale/truncated sizes for files edited via file tools; past folder moves truncated Codex files. | 🟠 | Never commit from the sandbox; commit on the owner's machine; verify with an esbuild parse sweep against freshly staged copies; treat sudden mass "Unexpected end of file" as cache, not corruption. | all |
| R-6 | **No integration/RLS/E2E/a11y/perf tests.** 27 unit tests cover pure logic only; the DoD demands evidence across security, a11y, and performance. | 🟠 | Add integration + RLS authorization tests, component/E2E (Playwright), axe a11y checks, and Web-Vitals/perf runs before launch. | 6, 8 |
| R-7 | **3D/motion performance regressions.** Adding GSAP + Three.js/R3F can blow LCP<2.5s / INP<200ms / CLS<0.1 on low-end mobile. | 🟠 | Lazy-load heavy scenes; Draco/KTX2 compression; static/simplified fallbacks; reduced-motion support; measure on real low-powered devices, not the dev machine. | 7 |
| R-8 | **Ripple layer absent.** The product's central promise (visible, explainable ripples) has no `ripple_events` persistence or explainable UI. | 🟠 | Build `ripple_events` + ripple service + explainable UI early; wire module writes to emit ripples. | 2, 4 |
| R-9 | **Cloudflare/OpenNext runtime edge cases.** Node APIs (e.g. `readFileSync` in `peacekeeper.ts`) and body limits behave differently on Workers. | 🟡 | Test in the real workerd runtime (`pnpm preview`); move prompt loading to build-time imports; validate storage/signed-URL flows on Workers. | 1, 8 |
| R-10 | **Live DB empty / never load-tested.** Engine unexercised at real multi-tenant volume. | 🟡 | Seed realistic fixtures; load-test the engine snapshot query (it fans out 9 selects per run); add indexes as needed. | 3, 8 |
| R-12 | **Path ambiguity.** HANDOFF references `...\TMP`; the connected folder is `...\The Missing Peace`. Work could land in the wrong tree. | 🟡 | Confirm the canonical working path before Phase 1; update docs/scripts to match. | 0→1 |

## Product & trust

| ID | Risk | Sev | Mitigation | Owner phase |
|---|---|---|---|---|
| R-13 | **Prototype implies fake persistence/AI.** Standalone `localStorage` HTML can look like a saving product; directive forbids fake states/claims. | 🔴 | Replace with demo mode over real components + demo adapter; always-visible seeded/real distinction; no fabricated testimonials/counts/AI. | 6 |
| R-14 | **Poetic-but-opaque language.** Branded metaphors ("The dream, bottled") can block comprehension for non-native/non-wedding-savvy users. | 🟠 | Enforce the Language & Content System: one poetic idea per screen paired with a plain-English explanation; define every branded term on first use; direct language for questions/buttons/warnings/outputs. | 2, 6 |
| R-15 | **Couple UI with planner buttons.** Shipping one shell for both roles violates the two-experience requirement and confuses both audiences. | 🟠 | Build role-specific `(app)` and `(planner)` experiences on the shared spine; distinct nav/dashboards/language; planner never gets a duplicate copy of the plan. | 3+ |
| R-16 | **Dream Walk stays a form.** If the redesign slips, the first-touch "gravitational center" moment is lost. | 🟠 | Prioritize the Dream Walk redesign in Phase 2; live world-response + earned Compass reveal + plain-English rules. | 2 |
| R-17 | **Scope/expectation gap.** The directive reads as "rebuild"; the reality is "harden + close gaps." Misalignment could drive a wasteful from-scratch rebuild. | 🟠 | Get explicit sign-off on preserve-and-harden at the Phase 0 gate; measure progress by gaps closed, not lines rewritten. | 0 |
| R-18 | **Early-access/payments creep.** Building payments now diverts from the engine milestone. | 🟡 | Reservations may collect an email only; no payment processing in the core milestone; no false scarcity. | 6 |

## Delivery & process

| ID | Risk | Sev | Mitigation | Owner phase |
|---|---|---|---|---|
| R-19 | **Skipping phase gates.** The directive mandates gated phases with evidence; skipping ships unverified claims. | 🟠 | Enforce each gate's end-of-phase report (built/changed/preserved/tested/perf/a11y/evidence/risks/next); no phase starts before the prior gate passes. | all |
| R-20 | **Claude/Codex handoff drift.** Two agents editing without inspection can overwrite each other (already happened per HANDOFF). | 🟠 | Inspect before editing; small phases; keep HANDOFF current; diff before overwrite; one repo of record. | all |
| R-21 | **Analytics without consent.** Adding heatmaps/behavioral tracking without disclosure breaches the directive and privacy norms. | 🟡 | Define the event taxonomy first; privacy-conscious analytics; no heatmaps/behavioral tracking without disclosure, consent, and a stated purpose. | 8 |

## The five that must not reach launch
1. **R-1 secrets** and **R-2 RLS** — security.
2. **R-4 bounded Weaver** — trust and correctness.
3. **R-13 truthful prototype** — the directive's honesty non-negotiable.
4. **R-3 one codebase** — everything else compounds if this stays open.
