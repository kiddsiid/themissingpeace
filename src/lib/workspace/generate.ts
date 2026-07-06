// "Generate Workspace" (Build Plan v2 §7 Phase 1). Runs after Dream + onboarding:
// seeds default boards/collections/budget categories/decision log/document folders,
// then fires the first Peace Engine run. Uses the Claude-owned seed data.
import { supabaseAdmin } from '@/lib/supabase/admin';
import boardsSeed from '@/lib/seed/boards.json';
import budgetSeed from '@/lib/seed/budget-categories.json';

export interface GenerateOpts {
  workspaceId: string;
  enableHoneymoon?: boolean;
  enablePrewedding?: boolean;
}

// Seeds the workspace. Idempotent-ish: intended to run once at creation.
export async function generateWorkspace(opts: GenerateOpts) {
  const db = supabaseAdmin();
  const { workspaceId, enableHoneymoon, enablePrewedding } = opts;

  // 1) Boards (skip optional ones unless their module is enabled) + collections.
  const boards = boardsSeed.boards.filter((b) =>
    b.type === 'honeymoon' ? !!enableHoneymoon : b.type === 'prewedding' ? !!enablePrewedding : true
  );
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i];
    const { data: board, error } = await db
      .from('boards')
      .insert({ workspace_id: workspaceId, type: b.type, title: b.title, is_optional: b.optional, sort: i })
      .select('id')
      .single();
    if (error) throw error;
    const collections = boardsSeed.collections.map((name, sort) => ({ board_id: board!.id, name, sort }));
    await db.from('board_collections').insert(collections);
  }

  // 2) Budget + categories.
  await db.from('budgets').insert({ workspace_id: workspaceId }).select().maybeSingle();
  const cats = budgetSeed.categories
    .filter((c) => (c === 'Honeymoon' ? !!enableHoneymoon : c === 'Pre-wedding events' ? !!enablePrewedding : true))
    .map((name, sort) => ({ workspace_id: workspaceId, name, sort }));
  await db.from('budget_categories').insert(cats);

  // 3) Document folders + decision log are represented by enums, so no rows needed at seed time.
  //    (Documents pick a folder on upload; decisions are created as the couple goes.)

  // 4) TODO (Codex): seed planning_milestones from a roadmap template keyed by
  //    wedding_profiles.planning_stage + wedding date, then fire the first engine run:
  //    await runPeaceEngine({ workspaceId, trigger: 'onboarding' });
}
