'use server';

// Server actions for the Feast Studio. Each write follows the repo convention:
// load the board slice → mutate `board.food` → persist → revalidate. All writes
// are guarded by an active workspace + the `plan.full` capability; the guards
// return quietly (never throw) when the caller lacks permission or a workspace,
// so the optimistic client UI stays robust.

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { loadCanvasBoard, saveCanvasBoard } from '@/lib/canvas/store';
import { getActiveWorkspace } from '@/lib/workspace/current';

async function requireFeastWrite() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return null;
  if (!can(workspace.role, 'plan.full')) return null;
  return workspace;
}

/** Toggle a dish's `blessed` flag within its course. */
export async function setDishBlessed(courseId: string, dishId: string, blessed: boolean) {
  const workspace = await requireFeastWrite();
  if (!workspace) return;

  const { board } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });
  const course = board.food.courses.find((c) => c.id === courseId);
  if (!course) return;
  const dish = course.dishes.find((d) => d.id === dishId);
  if (!dish) return;
  dish.blessed = blessed;

  await saveCanvasBoard(workspace.id, board);
  revalidatePath('/canvas/feast');
  revalidatePath('/canvas');
}

/** Toggle a dietary restriction's `verified` flag. */
export async function setRestrictionVerified(restrictionId: string, verified: boolean) {
  const workspace = await requireFeastWrite();
  if (!workspace) return;

  const { board } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });
  const restriction = board.food.restrictions.find((r) => r.id === restrictionId);
  if (!restriction) return;
  restriction.verified = verified;

  await saveCanvasBoard(workspace.id, board);
  revalidatePath('/canvas/feast');
  revalidatePath('/canvas');
}
