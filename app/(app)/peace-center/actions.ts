'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { runPeaceEngine } from '@/lib/engine/run';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { track } from '@/lib/analytics';

export async function runPeaceEngineAction() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to run the Peace Engine');

  await runPeaceEngine({ workspaceId: workspace.id, actorUserId: workspace.userId, triggerType: 'manual' });
  revalidatePath('/peace-center');
}

const INSIGHT_STATES = new Set(['accepted', 'dismissed', 'deferred', 'completed', 'new']);

/**
 * Weaver insight lifecycle (P5). Persists the recommendation's status with who/when,
 * writes an audit_events row, and fires the appropriate analytics event. Called
 * directly from the InsightActions client component.
 */
export async function setRecommendationStatus(recommendationId: string, status: string) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to act on insights');
  if (!recommendationId || !INSIGHT_STATES.has(status)) throw new Error('Invalid insight action');

  const db = supabaseAdmin();
  const { data: rec, error } = await db
    .from('planning_recommendations')
    .update({ status, acted_by: workspace.userId, acted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', recommendationId)
    .eq('workspace_id', workspace.id)
    .select('id, recommendation_type')
    .single();
  if (error) throw error;

  // Audit trail: every state transition is recorded.
  await db.from('audit_events').insert({
    workspace_id: workspace.id,
    actor_id: workspace.userId,
    action: `weaver_insight_${status}`,
    entity_type: 'planning_recommendation',
    entity_id: recommendationId,
    meta: { recommendation_type: rec?.recommendation_type ?? null },
  });

  // Analytics (coarse, opt-in, no PII).
  if (status === 'accepted') track('weaver_insight_accepted', { recommendationType: rec?.recommendation_type ?? undefined }, { workspaceId: workspace.id, surface: 'server' });
  if (status === 'completed') track('next_action_completed', {}, { workspaceId: workspace.id, surface: 'server' });

  revalidatePath('/peace-center');
}
