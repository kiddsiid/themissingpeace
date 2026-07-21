# 05 — Permission Model

**Purpose:** define roles, the capability map, the RLS posture, the couple-vs-planner separation, and the defense-in-depth work still open. Permissions must be based on **workspace membership and role**, never on editable user-profile metadata (directive "Data & Engine Architecture").

---

## 1. Roles

From the schema `member_role` enum and `permissions.ts`:

`owner` · `partner` · `planner` · `collaborator` · `contributor` · `viewer` · `admin`

- **owner / partner** — the couple. Full planning capability. `partner_label` on `workspace_members` and the two labels on `wedding_profiles` are **editable** (fiancé/fiancée/spouse/partner/custom) — a directive requirement, already modeled.
- **planner** — professional planner with full planning capability inside a client workspace, but a **different experience** (portfolio, not couple dashboard).
- **collaborator** — trusted helper: board/comment/vote/complete-assigned, view. No full plan edit.
- **contributor** — narrow: category-level budget visibility only (`budget.view_granted`), comment, upload, view. Good fit for a parent contributing money without seeing everything.
- **viewer** — read-only.
- **admin** — platform support: **no wedding-data access without explicit temporary consent** (already encoded as empty caps). Keep this discipline.

## 2. Capability map (from `src/lib/auth/permissions.ts`)

Capabilities: `workspace.delete`, `workspace.billing`, `members.manage`, `plan.full` (tasks/vendors/documents/timeline/guests/budget), `board.add`, `comment`, `vote`, `task.complete_assigned`, `budget.view_granted` (category-level only), `document.upload`, `view`.

`can(role, cap)` and `canPoofInto(role, target)` gate behavior; `plan.full` roles can Poof into anything, `board.add` roles only into task/decision. **This is a good foundation and should be the single source for both UI gating and server-action checks.**

**Additions needed for the two experiences & new modules:**
- `feast.edit`, `atmosphere.edit`, `atelier.edit` (fold into `plan.full` or gate separately if planners get partial creative access).
- `weaver.act` (approve/dismiss/edit/defer a Weaver insight) — who may act on recommendations.
- `decision.approve` (already implied by `decision_approvals`; make it an explicit capability).
- Planner-scoped: `portfolio.view`, `client.enter`, `template.manage`, `brief.generate`.
- `peace_note.*` is deliberately **outside** the normal capability grid (see §4).

## 3. Enforcement — two walls, one of them not yet proven

**Wall 1 (works today):** every page/server action resolves the active Clerk user+org to an active `workspace_members` row via `requireActiveWorkspace()` / `requireWorkspaceMember()` (`src/lib/workspace/current.ts`) and checks `can(role, cap)`. All Supabase access uses the **service-role** client **scoped by the resolved workspace**. HANDOFF confirms this is the real enforcement today and works end-to-end.

**Wall 2 (written, not proven):** Clerk-JWT RLS. `0001_init.sql` ships `auth_workspace_ids()` + membership policies on every workspace table and stricter Peace Notes policies. `0002` used a per-transaction GUC that **provably does not hold over PostgREST** (documented failure in HANDOFF: the GUC set in one request is gone by the next query). `0003_clerk_jwt_rls.sql` switches `auth_workspace_ids()` to read the Clerk user id from `auth.jwt()` — the correct approach — but requires: (a) Clerk's Supabase integration enabled, (b) Supabase third-party Clerk auth enabled, (c) `0003` run, and (d) a real signed-in-token test. As found, `supabaseForUser()` (the RLS client) is **unused by pages**.

**Required Phase 1/Phase 8 work:**
1. Complete the Clerk↔Supabase third-party-auth setup and run `0003`.
2. Route reads through `supabaseForUser()` where practical so RLS is actually exercised (defense-in-depth behind Wall 1).
3. Add an **explicit unauthorized-access test** (directive: "test unauthorized access explicitly"): User A must not read/write User B's workspace via a raw token. This is a launch gate, not optional.
4. Keep service credentials server-only; never expose the service-role key to the browser.

## 4. Peace Notes — stricter than everything else (keep it that way)

Peace Notes have their own RLS policy: visible only to the author, or to a partner when `shared_with_partner`, or to a planner only when `planner_access` or a per-type grant exists. The **locked body is never selected into a response** until `peace_note_is_open()` passes; bodies are envelope-encrypted (`body_encrypted bytea`). The service layer must gate decryption. **Do not leak locked bodies** (HANDOFF's explicit warning). Peace Notes are also excluded from the engine snapshot and Weaver context (`run.ts` `boundaries.peaceNotesExcluded`). This is a genuinely careful design — preserve it exactly.

## 5. Couple vs. Planner — two experiences, one permission spine

The directive's "Two-Part Product System" requires **role-specific navigation, dashboards, language, and workflows on the same shared records** — not the couple UI with planner buttons bolted on. The permission model supports this; the *experience* layer does not exist yet.

- **Shared spine:** same `workspaces`, `workspace_members`, roles, RLS. A planner in a client workspace is a `planner`-role member of that workspace — they see the **same records**, never a duplicate/disconnected copy (directive requirement).
- **Couple Experience (`app/(app)`):** spacious, emotional, progressive disclosure, fewer operational controls. Roles: owner/partner (+ collaborator/contributor/viewer as guests of the workspace).
- **Planner Experience (`app/(planner)`):** a **portfolio** across many client workspaces (org switch), cross-wedding attention (deadlines, vendor gaps, approvals, budget pressure, timeline risk), enter a client workspace and see the couple's view + Compass + open decisions, prepare briefs, manage deadlines, return without losing context, reusable templates. Needs: a planner-org concept, `client_links`, `templates`, and `portfolio.*`/`client.enter`/`template.manage`/`brief.generate` capabilities (data model §3, §Planner).
- **Every shared record shows** who created it, who can edit it, who can approve it, and what else it affects (directive requirement) — backed by `created_by`, the capability map, `decision_approvals`, and `ripple_events`.

## 6. Summary posture

The **role and capability model is well-designed and directive-compliant in shape.** The open work is: (1) **prove RLS** (Wall 2) with a real token test — the top security gate; (2) add the **planner-scoped capabilities and org model** for the second experience; (3) add **Weaver-action** and **creative-module** capabilities; (4) keep **Peace Notes** on its stricter, encryption-gated path.
