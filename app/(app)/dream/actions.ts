'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { buildCompass, type DreamResponses } from '@/lib/engine/compass';

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function list(formData: FormData, key: string): string[] {
  const direct = formData.getAll(key).map(String).filter(Boolean);
  const expanded = direct.flatMap((value) => value.split(/[,\n]/));
  return [...new Set(expanded.map((value) => value.trim()).filter(Boolean))];
}

function num(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

async function fallbackSummarize(dream: DreamResponses) {
  const meaning = dream.sharedMeaning || dream.meaning;
  const priorities = (dream.priorities ?? []).slice(0, 3);
  const values = (dream.planningValues ?? []).slice(0, 2);
  const center = priorities.length ? priorities.join(', ') : 'the people, the feeling, and the peace behind the day';
  const summary = meaning ? `${meaning} The plan should stay centered on ${center}.` : `A wedding centered on ${center}.`;
  const tone = [...priorities, ...values].slice(0, 4).join(', ') || 'calm, personal, intentional';
  return { summary, tone };
}

function seasonRange(season?: string | null, year?: string | null): { start?: string; end?: string } {
  const parsed = Number(year);
  if (!season || !Number.isInteger(parsed)) return {};
  const value = season.toLowerCase();
  if (value === 'spring') return { start: `${parsed}-03-01`, end: `${parsed}-05-31` };
  if (value === 'summer') return { start: `${parsed}-06-01`, end: `${parsed}-08-31` };
  if (value === 'fall') return { start: `${parsed}-09-01`, end: `${parsed}-11-30` };
  if (value === 'winter') return { start: `${parsed}-12-01`, end: `${parsed + 1}-02-28` };
  return {};
}

export async function saveDream(formData: FormData) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to edit the Dream');

  const db = supabaseAdmin();
  const dateStatus = (text(formData, 'date_status') ?? 'none') as 'known' | 'range' | 'none';
  const dateSeason = text(formData, 'date_season');
  const dateYear = text(formData, 'date_year');
  const desiredYear = text(formData, 'desired_year');
  const dateRange = seasonRange(dateSeason, dateYear);
  const dream: DreamResponses = {
    creatorRole: (text(formData, 'creator_role') ?? 'couple') as 'couple' | 'planner',
    partnerOneReflection: text(formData, 'partner_one_reflection') ?? undefined,
    partnerTwoReflection: text(formData, 'partner_two_reflection') ?? undefined,
    sharedMeaning: text(formData, 'shared_meaning') ?? undefined,
    meaning: text(formData, 'meaning') ?? undefined,
    priorities: list(formData, 'priorities'),
    nonNegotiables: list(formData, 'non_negotiables'),
    avoid: list(formData, 'avoid'),
    culturalValues: list(formData, 'cultural_values'),
    traditions: list(formData, 'traditions'),
    planningValues: list(formData, 'planning_values'),
    hospitalityMeaning: text(formData, 'hospitality_meaning') ?? undefined,
    musicAtmosphere: text(formData, 'music_atmosphere') ?? undefined,
    familyMeaning: text(formData, 'family_meaning') ?? undefined,
    budgetValues: text(formData, 'budget_values') ?? undefined,
    dateSeason: dateSeason ?? undefined,
    dateYear: dateYear ?? undefined,
    desiredYear: desiredYear ?? undefined,
  };

  const { error: profileError } = await db.from('wedding_profiles').upsert({
    workspace_id: workspace.id,
    date_status: dateStatus,
    wedding_date: dateStatus === 'known' ? text(formData, 'wedding_date') : null,
    date_range_start: dateStatus === 'range' ? dateRange.start ?? null : null,
    date_range_end: dateStatus === 'range' ? dateRange.end ?? null : null,
    planning_stage: text(formData, 'planning_stage') ?? 'just_engaged',
    guest_estimate: num(formData, 'guest_estimate'),
    guest_max: num(formData, 'guest_max'),
    budget_total: num(formData, 'budget_total'),
    budget_confidence: (text(formData, 'budget_confidence') ?? 'unknown') as 'firm' | 'flexible' | 'unknown',
    honeymoon_enabled: formData.get('honeymoon_enabled') === 'on',
  }, { onConflict: 'workspace_id' });
  if (profileError) throw profileError;

  const { data: dreamRow, error: dreamError } = await db
    .from('dreams')
    .insert({ workspace_id: workspace.id, responses_json: dream, created_by: workspace.userId })
    .select('id')
    .single();
  if (dreamError) throw dreamError;

  const compass = await buildCompass(dream, fallbackSummarize);
  const { error: compassError } = await db.from('wedding_compass').upsert({
    workspace_id: workspace.id,
    dream_id: dreamRow.id,
    summary: compass.summary,
    priorities_json: compass.priorities,
    non_negotiables_json: compass.nonNegotiables,
    avoid_json: compass.avoid,
    cultural_values_json: compass.culturalValues,
    traditions_json: compass.traditions,
    tone: compass.tone,
    updated_by: workspace.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id' });
  if (compassError) throw compassError;

  await db.from('audit_events').insert({
    workspace_id: workspace.id,
    actor_id: workspace.userId,
    action: 'dream_saved',
    entity_type: 'dream',
    entity_id: dreamRow.id,
  });

  revalidatePath('/dream');
  revalidatePath('/peace-center');
}

export async function saveCloudPriority(cloudId: string, priority: number) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) return;
  const db = supabaseAdmin();
  const { data: row } = await db.from('dreams').select('id, responses_json').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!row) return;
  const responses = (row.responses_json ?? {}) as Record<string, any>;
  const map = { ...(responses.cloudPriorities ?? {}) };
  map[cloudId] = Math.max(0, Math.min(1, priority));
  await db.from('dreams').update({ responses_json: { ...responses, cloudPriorities: map } }).eq('id', row.id);
}

export async function approveCompass() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) return;
  const db = supabaseAdmin();
  const { data: row } = await db.from('dreams').select('id, responses_json').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!row) return;
  const responses = (row.responses_json ?? {}) as Record<string, any>;
  await db.from('dreams').update({ responses_json: { ...responses, compassApproved: true, compassApprovedAt: new Date().toISOString() } }).eq('id', row.id);
  revalidatePath('/dream');
  revalidatePath('/peace-center');
}
