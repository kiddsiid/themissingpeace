'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { runPeaceEngine } from '@/lib/engine/run';
import { requireActiveWorkspace } from '@/lib/workspace/current';

export async function runPeaceEngineAction() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to run the Peace Engine');

  await runPeaceEngine({ workspaceId: workspace.id, actorUserId: workspace.userId, triggerType: 'manual' });
  revalidatePath('/peace-center');
}
