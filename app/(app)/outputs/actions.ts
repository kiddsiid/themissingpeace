'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { stableSourceHash } from '@/lib/outputs/freshness';
import { isOutputKind, type OutputKind } from '@/lib/outputs/kinds';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';

export async function getOutputSourceSnapshot(workspaceId: string, kind: OutputKind): Promise<Record<string, unknown>> {
  const db = supabaseAdmin();
  if (['escort-cards', 'place-cards', 'table-numbers', 'seating-sign'].includes(kind)) {
    const { data: chart } = await db.from('seating_charts').select('id').eq('workspace_id', workspaceId).eq('kind', 'reception').maybeSingle();
    if (!chart) return { chart: null, tables: [], assignments: [], guests: [] };
    const [tables, assignments, guests] = await Promise.all([
      db.from('seating_tables').select('id, label, shape, capacity, sort').eq('chart_id', chart.id).order('sort'),
      db.from('seat_assignments').select('table_id, guest_id, seat_index').eq('chart_id', chart.id).order('seat_index'),
      db.from('guests').select('id, first_name, last_name, meal_choice, rsvp_status').eq('workspace_id', workspaceId).order('id'),
    ]);
    return {
      chart: chart.id,
      tables: tables.data ?? [],
      assignments: assignments.data ?? [],
      guests: guests.data ?? [],
    };
  }
  if (kind === 'menu') {
    const [guests, scenes, dishes] = await Promise.all([
      db.from('guests').select('id, meal_choice, dietary, rsvp_status').eq('workspace_id', workspaceId).order('id'),
      db.from('meal_scenes').select('id, title, ordinal, service_style, status, version').eq('workspace_id', workspaceId).order('ordinal'),
      db.from('dishes').select('id, scene_id, name, role, status, version').eq('workspace_id', workspaceId).order('id'),
    ]);
    return { guests: guests.data ?? [], scenes: scenes.data ?? [], dishes: dishes.data ?? [] };
  }
  if (kind === 'caterer-brief') {
    const [plan, scenes, dishes, requirements, assessments, evidence] = await Promise.all([
      db.from('feast_plans').select('*').eq('workspace_id', workspaceId).maybeSingle(),
      db.from('meal_scenes').select('*').eq('workspace_id', workspaceId).order('ordinal'),
      db.from('dishes').select('*').eq('workspace_id', workspaceId).order('id'),
      db.from('guest_requirements').select('*').eq('workspace_id', workspaceId).order('id'),
      db.from('dish_assessments').select('*').eq('workspace_id', workspaceId).order('id'),
      db.from('confirmation_evidence').select('*').eq('workspace_id', workspaceId).order('id'),
    ]);
    return {
      plan: plan.data,
      scenes: scenes.data ?? [],
      dishes: dishes.data ?? [],
      requirements: requirements.data ?? [],
      assessments: assessments.data ?? [],
      evidence: evidence.data ?? [],
    };
  }
  if (kind === 'document-index') {
    const { data } = await db
      .from('documents')
      .select('id, folder, title, contract_status, due_date, linked_vendor_id, linked_decision_id, upload_id')
      .eq('workspace_id', workspaceId)
      .order('id');
    return { documents: data ?? [] };
  }
  const [profile, compass, atmosphere] = await Promise.all([
    db.from('wedding_profiles').select('partner_one_label, partner_two_label, wedding_date, date_status').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('wedding_compass').select('summary, tone, version').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('atmosphere_plans').select('palette_json, version').eq('workspace_id', workspaceId).maybeSingle(),
  ]);
  return {
    profile: profile.data,
    compass: compass.data,
    atmosphere: atmosphere.data,
    kind,
  };
}

export async function outputSourceHash(workspaceId: string, kind: OutputKind): Promise<string> {
  return stableSourceHash(await getOutputSourceSnapshot(workspaceId, kind));
}

export async function regenerateOutput(formData: FormData) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to generate outputs');
  const kind = String(formData.get('kind') || '');
  if (!isOutputKind(kind)) throw new Error('Unknown output kind');
  const db = supabaseAdmin();
  const snapshot = await getOutputSourceSnapshot(workspace.id, kind);
  const sourceHash = stableSourceHash(snapshot);
  const { data: latest } = await db
    .from('output_versions')
    .select('version')
    .eq('workspace_id', workspace.id)
    .eq('output_kind', kind)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db.from('output_versions').insert({
    workspace_id: workspace.id,
    output_kind: kind,
    payload_json: snapshot,
    source_hash: sourceHash,
    is_stale: false,
    version: Number(latest?.version ?? 0) + 1,
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/printables');
}

export async function markOutputsStale(workspaceId: string, kinds: OutputKind[]) {
  if (!kinds.length) return;
  const { error } = await supabaseAdmin()
    .from('output_versions')
    .update({ is_stale: true })
    .eq('workspace_id', workspaceId)
    .in('output_kind', kinds)
    .eq('is_stale', false);
  if (error) throw error;
  revalidatePath('/printables');
}

export async function markSeatingOutputsStale(workspaceId: string) {
  return markOutputsStale(workspaceId, ['escort-cards', 'place-cards', 'table-numbers', 'seating-sign']);
}

export async function markGuestOutputsStale(workspaceId: string) {
  return markOutputsStale(workspaceId, ['escort-cards', 'place-cards', 'seating-sign', 'menu']);
}
