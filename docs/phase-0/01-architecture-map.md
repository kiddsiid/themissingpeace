# 01 — Architecture Map

**Purpose:** define the target layered architecture and the hard boundaries between the seven concerns the directive names (public marketing, demo, authenticated app, server-side engine, data/storage, AI, analytics/observability). This is the *target*; §5 notes where the current code already matches it and where it does not.

---

## 1. The layers (target)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  A. PUBLIC MARKETING (cinematic)          B. DEMO MODE (seeded)            │
│  app/(marketing)/*  — GSAP scroll story   app/(demo)/*  — real components, │
│  Threshold→Dream→Compass→Ripple→Shared     fixture data via demo adapter    │
│  →Engine→Invitation. No auth. SEO.         Clearly labelled "seeded".       │
└───────────────┬──────────────────────────────────┬────────────────────────┘
                │ begin Dream Walk / early access    │ same React components
                ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  C. AUTHENTICATED APP  (Clerk-gated, app shell)                            │
│  Two role-specific experiences on ONE engine:                             │
│    C1. Couple Experience   app/(app)/*      (spacious, emotional)          │
│    C2. Planner Experience  app/(planner)/*  (portfolio, operational)      │
│  Persistent Compass access · presence · mobile drawer · command palette   │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ Server Actions / Route Handlers (never direct DB from client)
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  D. SERVER-SIDE ENGINE SERVICES                                            │
│   D1. Deterministic rule pack     src/lib/engine/rules.ts (facts, exact)   │
│   D2. Compass service             src/lib/engine/compass.ts                │
│   D3. Peace/Weaver orchestrator   src/lib/engine/run.ts                    │
│   D4. Ripple service (NEW)        src/lib/engine/ripple.ts  ← to build     │
│   D5. Money Map intelligence      src/lib/engine/money-map.ts + language   │
│   D6. Permissions                 src/lib/auth/permissions.ts (+ RLS)      │
│   D7. Workspace bootstrap/sync    src/lib/workspace/*                      │
└───────┬───────────────────────┬───────────────────────┬───────────────────┘
        ▼                       ▼                       ▼
┌───────────────┐   ┌────────────────────────┐   ┌───────────────────────────┐
│ E. DATA/STORE │   │ F. AI SERVICES         │   │ G. ANALYTICS/OBSERVABILITY │
│ Supabase PG   │   │ Anthropic (Weaver)     │   │ event taxonomy, Web Vitals,│
│ (system of    │   │ deterministic-guarded, │   │ engine latency, error rate,│
│ record) +     │   │ cited, bounded,        │   │ Cloudflare observability   │
│ Storage       │   │ audit-trailed          │   │                            │
│ Liveblocks    │   └────────────────────────┘   └───────────────────────────┘
│ (ephemeral:   │
│ presence,     │   Auth spine: Clerk (users + organizations=workspaces)
│ board pos.)   │   → synced into Supabase users / workspaces / workspace_members
└───────────────┘
```

## 2. Boundary rules (non-negotiable)

1. **Postgres/Supabase is the system of record.** Liveblocks holds only *ephemeral* state (live cursors, presence, in-flight board positions). Anything that must survive a refresh is written to Supabase via a server action. `localStorage` is allowed **only** for anonymous Dream Walk progress and demo mode (directive #7).
2. **The browser never talks to the database directly with privileged credentials.** All writes go through Server Actions / Route Handlers that call `requireActiveWorkspace()` / `requireWorkspaceMember()` and check capabilities. The service-role key stays server-side. RLS is the second wall behind that.
3. **Deterministic vs. AI is a hard split.** All exact facts — totals, dates, counts, budget math, dietary tallies, guest counts — come from D1 (`rules.ts`) and pure functions. The AI layer (F) only interprets, explains, drafts, and prioritizes. Weaver may never silently mutate the Compass, budget, guests, menu, timeline, or any consequential record (directive "Weaver AI").
4. **Every module reads from and writes to the same canonical state** (E), and every meaningful change is capable of emitting a **ripple event / recommendation / risk / task** (directive #4). No module keeps a private store of truth.
5. **Demo mode uses the real components** (C) with a **demo adapter** feeding fixtures — it must never imply seeded data is persisted (directive #5/#21).
6. **Marketing (A) and demo (B) are unauthenticated and separately indexable;** the app (C) is Clerk-gated and `noindex`. Preview deployments must not compete with production in search (directive "SEO").

## 3. Data-flow of the core loop

`Dream Walk (C) → dreams.responses_json (E) → Compass service (D2) → wedding_compass (E) → Generate Workspace seed (D7) → first Peace Engine run (D3): snapshot (E) → deterministic facts+risks (D1) → Weaver interpret (F) → planning_recommendations / planning_risks / ripple_events (E) → Peace Center + module surfaces render Next Best Actions & ripples (C).`

This loop **exists today** end-to-end for the Dream→Compass→Peace Center→recommendations path. The **ripple_events** persistence and the **explainable ripple UI** are the main missing links (see data model §Additions and route inventory).

## 4. Proposed folder structure (target boundaries)

The directive asks for clear boundaries and explicitly forbids "one enormous page component or one giant shared state object." Target:

```
app/
  (marketing)/            A — cinematic public story (GSAP)
  (demo)/                 B — seeded demo (real components + demo adapter)
  (app)/                  C1 — Couple Experience (shell + modules)
  (planner)/              C2 — Planner Experience (portfolio + client workspace)
  w/[slug]/               public guest surfaces (website, RSVP, photos)
  print/[kind]/           printables
  api/                    route handlers (liveblocks-auth, webhooks, exports)
src/
  design-system/          tokens, primitives (Button, Card, Arch, DreamCloud…)
  components/             shared UI
  components/<module>/    module-specific UI (board, seating, feast, atmosphere, atelier…)
  motion/                 Framer Motion presets + GSAP scroll scenes (public)
  three/                  R3F scenes (threshold, studio, atmosphere) — lazy, with fallbacks
  lib/engine/             D1–D5 engine services (deterministic + orchestration + ripple)
  lib/auth/               D6 permissions
  lib/workspace/          D7 bootstrap/sync/current
  lib/supabase/           admin + rls clients, storage
  lib/ai/                 F — Weaver service, prompts, schemas, citations
  lib/analytics/          G — event taxonomy + emit
  lib/demo/               demo adapter + fixtures
  lib/seed/               production seed data (boards, categories, prompts)
supabase/migrations/      E — schema (append-only, ordered)
tests/                    unit + (new) integration/RLS/a11y fixtures
```

Most `src/lib/*` boundaries **already exist** in this shape — the additions are `design-system/`, `motion/`, `three/`, `lib/ai/`, `lib/analytics/`, `lib/demo/`, and the `(marketing)`/`(demo)`/`(planner)` route groups.

## 5. Where current code matches / diverges

| Concern | Target | Current state |
|---|---|---|
| System of record | Supabase PG | ✅ matches (60 tables, migrations) |
| Ephemeral collab | Liveblocks only | ✅ board presence/positions via Liveblocks |
| Server-action writes | all writes gated server-side | ✅ `planning/actions.ts`, module `actions.ts` use `requireActiveWorkspace` |
| RLS second wall | proven Clerk-JWT RLS | ⚠️ written (0003) but **unproven**; app relies on service-layer scoping |
| Deterministic/AI split | hard boundary | ✅ `rules.ts` vs `peacekeeper.ts` |
| Ripple persistence + UI | `ripple_events` + explainable UI | ❌ not built (recommendations/risks exist; explicit ripples do not) |
| Marketing/demo/app separation | route groups (marketing)/(demo)/(app)/(planner) | ⚠️ app exists; marketing is a separate HTML site; demo is standalone HTML; no planner route group |
| AI service maturity | cited, bounded, audit-trailed, all states | ⚠️ single JSON call; states/citations/audit incomplete |
| Analytics/observability | event taxonomy + Web Vitals | ❌ not present |
| Motion/3D | GSAP (public) + Framer (app) + R3F (select) | ⚠️ Framer present; **no GSAP, no Three.js** yet (Phase 7) |
| Design system | tokenized primitives | ⚠️ tokens exist in Tailwind/globals; not yet a named primitive library |

**Reading of the table:** the *engine and data* half of the architecture is largely in place; the *experience, safety-proof, and observability* halves are the build ahead.
