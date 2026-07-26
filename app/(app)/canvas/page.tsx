import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard } from '@/lib/canvas/store';
import { feastProgress, feastPlanProgress, atmosphereProgress, atelierProgress } from '@/lib/canvas/progress';
import { LivingCanvas } from './LivingCanvas';
import { supabaseAdmin } from '@/lib/supabase/admin';

// The Living Canvas hub — the doorway that replaces `/board` in the nav.
// Loads the shared board slice, derives per-room progress, and hands a plain
// snapshot to the client hub (rooms, dreams, peace summary).
export default async function CanvasPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });
  const db = supabaseAdmin();
  const [compassRes, insightsRes, ripplesRes, feastScenesRes, feastDishesRes] = await Promise.all([
    db.from('wedding_compass').select('summary').eq('workspace_id', workspace.id).maybeSingle(),
    db.from('planning_recommendations').select('id, title, reason, description, source').eq('workspace_id', workspace.id).eq('status', 'new').order('created_at', { ascending: false }).limit(3),
    db.from('ripple_events').select('id, summary, created_at').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(3),
    db.from('meal_scenes').select('id, status').eq('workspace_id', workspace.id).order('ordinal'),
    db.from('dishes').select('scene_id').eq('workspace_id', workspace.id),
  ]);

  const feast = feastScenesRes.data?.length
    ? feastPlanProgress(feastScenesRes.data, feastDishesRes.data ?? [])
    : feastProgress(board);
  const atmosphere = atmosphereProgress(board, context.weddingPalette);
  const atelier = atelierProgress(board);

  // Creative-readiness proxy for the header Peace pill (links to Peace Center for
  // the full score). Mean of the three room rings.
  const score = Math.round((feast.pct + atmosphere.pct + atelier.pct) / 3);
  const band = score >= 85 ? 'Peaceful' : score >= 60 ? 'Settling' : score >= 35 ? 'Stirring' : 'Building';

  return (
    <LivingCanvas
      projectName={context.projectName}
      compassSentence={compassRes.data?.summary || context.compassSentence}
      palette={board.palette.colors}
      approverRoles={context.approverRoles}
      inspirations={board.inspirations}
      progress={{ feast, atmosphere, atelier }}
      peace={{ score, band }}
      peaceInsights={(insightsRes.data ?? []).map((insight: any) => ({
        id: insight.id,
        title: insight.title,
        reason: insight.reason || insight.description || 'Grounded in your current plan.',
        source: insight.source || 'deterministic',
      }))}
      recentRipples={(ripplesRes.data ?? []).map((ripple: any) => ({
        id: ripple.id,
        summary: ripple.summary || 'A change moved through the plan.',
      }))}
    />
  );
}
