# 00 — Repository Audit

**Purpose:** identify, from the canonical repository, what to preserve, harden, migrate, or remove before implementation continues.

---

## 1. Canonical repository

The product lives at `C:\Users\siddi\Documents\The Missing Peace` and is published at
`github.com/kiddsiid/themissingpeace`. This is the single repository of record.

The application is a substantial full-stack product on the intended stack: Next.js 15 App Router,
React 19, TypeScript, Tailwind, Clerk, Supabase/Postgres, Liveblocks, Anthropic, OpenNext, and
Cloudflare. It is not a prototype that should be rebuilt from scratch.

**Governing decision:** preserve and harden the existing product. Keep one canonical working path,
one repository, and one product architecture.

## 2. Preserve

- The Supabase schema and ordered migrations.
- The deterministic rule pack and Peace Engine orchestration.
- Money Map intelligence and language safeguards.
- Capability-based permissions and workspace membership checks.
- Seating geometry and Seating Studio.
- Board, Poof, Master Vision, tagging, and mood extraction.
- Guest CRM, public guest surfaces, and printables.
- Workspace bootstrap and Clerk synchronization.
- Design tokens, voice, North Star, Build Plan, and HANDOFF.

## 3. Harden

- Prove the Clerk-token RLS path with explicit cross-workspace authorization tests.
- Mature Weaver into a cited, bounded, auditable suggestion service.
- Add persisted, explainable ripple events.
- Build distinct couple and planner experiences over the same records.
- Add integration, component, accessibility, performance, and deployment-runtime evidence.

## 4. Migrate or rewrite

- Build Feast Studio, Atmosphere Lab, and Atelier as native Next.js modules against the canonical
  schema and shared engine.
- Replace the standalone `localStorage` prototype with a truthful seeded demo using real components.
- Redesign Dream Walk while preserving Compass persistence and the existing engine loop.
- Move prompt loading and runtime-sensitive code onto Cloudflare-compatible paths.

## 5. Repository hygiene

- Keep `.env.local`, generated build output, caches, archives, and deployment artifacts untracked.
- Keep `.env.example` as the only tracked environment template.
- Keep product documentation under `/docs`.
- Keep one product deploy target and one demo target.
- Do not commit from environments known to risk stale or truncated mounts.

## 6. Verification state

- Dependency installation is reproducible from the committed lockfile.
- TypeScript and production build pass.
- Seven Vitest suites currently contain 42 passing tests.
- The esbuild parse sweep covers all TypeScript and TSX files under `app/` and `src/`.
- Integration, RLS, E2E, accessibility, and performance coverage remain launch-gate work.

## 7. Conclusion

The product foundation is strong and on the correct stack. The correct posture is to preserve its
engine and data model, close its security and experience gaps, and replace parallel prototype
behavior with truthful adapters over the real application.
