# The Missing Peace — Design Source of Truth

This folder is the **canonical latest design + spec** for the One Engine redesign
(from the deployed prototype at themissingpeace.pages.dev, uploaded 2026-07-22).
Older, superseded design/spec artifacts were moved to `docs/_archive/`.

The Claude Design export in `prototype/` is the vision. Every phase since has been
framework for that one product, and from 2026-07-25 there is nothing else: every update,
improvement, tweak and polish serves it. Documents in this folder build on each other —
new findings extend the spec they belong to rather than starting a parallel one.

- **One-Engine-Redesign-Plan.md** — the master redesign spec (§1–28). **§26 is the single
  canonical backlog**: the ticket map MP-001…MP-020, the §26.1 phase gate, the §26.2 parity
  fold-in, and the §26.3 build stamp.
- **Feast-Studio-Redesign-Plan.md** — the Feast Studio deep spec. **Built in Phase 5, kept,
  now in polish.**
- **Feedback-and-Revisions.docx** — owner feedback + revisions to fold in.
- **living-canvas-handoff-README.md** — the Living Canvas design handoff.
- **wedding-state.reference.js** — the prototype's shared state model (reference for the domain layer).

## Build order (owner-approved; revised 2026-07-25)

Foundation → Compass + Peace Engine → Living Canvas shell → Atmosphere/Atelier →
connected planning modules → collaboration.

**Revision, 2026-07-25.** The previous version of this line read *"Skip Feast Studio and
don't modify the current Living Canvas until the build is complete"*, and the Feast entry
above was marked *"Deferred: not being built yet, per owner."* Phase 5 built it anyway —
that is the off-plan step the provenance trace found. It does not get parked now. Per the
owner: it was already worked on, so it gets brought to its best. Feast Studio ships as a
room inside the Living Canvas, and its live work is MP-008 (Feast Canvas), MP-009
(Hospitality intelligence) and MP-010 (Caterer brief). The Living Canvas itself is open
for work under MP-007. The sequence above still governs anything not yet started.

## Gate

No phase closes without §26.1: the nav surface re-read after any phase that adds a route,
a prototype-vs-app diff in both directions for every section the phase touched, and a
deploy confirmed at the URL — the live page and its build stamp, never the build log.
When the plan and a phase document disagree, ask before building.
