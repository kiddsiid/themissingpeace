'use server';

import { revalidatePath } from 'next/cache';
import { markOutputsStale } from '@/app/(app)/outputs/actions';
import { can } from '@/lib/auth/permissions';
import { track } from '@/lib/analytics/emitter';
import { emitRipple } from '@/lib/engine/ripple';
import { catererBriefSourceHash, buildCatererBriefSnapshot, changedBriefSections } from '@/lib/feast/brief';
import { loadFeastStudio } from '@/lib/feast/store';
import type {
  AssessmentState,
  RequirementCategory,
  Severity,
} from '@/lib/feast/hospitality';
import type {
  DishSource,
  DishStatus,
  EvidenceSource,
  FeastSaveResult,
  SceneStatus,
} from '@/lib/feast/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uploadFile } from '@/lib/supabase/storage';
import { requireActiveWorkspace } from '@/lib/workspace/current';

type Plain = Record<string, unknown>;

export interface FeastPlanPatch {
  intention?: string;
  meal_shape?: string;
  service_feeling?: string;
  emotional_root?: string;
  hospitality_standard?: string;
  guest_count?: number;
  advisory_budget_total_cents?: number | null;
  advisory_budget_per_guest_cents?: number | null;
  status?: string;
}

export interface ScenePatch {
  title?: string;
  purpose?: string;
  planned_at?: string;
  duration_minutes?: number | null;
  service_style?: string;
  mood?: string;
  notes?: string;
  status?: SceneStatus;
}

export interface DishPatch {
  name?: string;
  role?: string;
  ingredients_json?: string[];
  story?: string;
  presentation?: string;
  execution_notes?: string;
  service_style?: string;
  mood?: string;
  advisory_cost_min_cents?: number | null;
  advisory_cost_max_cents?: number | null;
  status?: DishStatus;
  source?: DishSource;
}

export interface RequirementPatch {
  guest_id?: string | null;
  category?: RequirementCategory;
  code?: string;
  severity?: Severity;
  notes?: string;
}

async function requireFeastWrite() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to edit Feast Studio');
  return workspace;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function nullableMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(parsed, 100_000_000));
}

function normalizeCode(value: unknown): string {
  return cleanText(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function cleanPlanPatch(input: FeastPlanPatch): Plain {
  const patch: Plain = {};
  if ('intention' in input) patch.intention = cleanText(input.intention, 500);
  if ('meal_shape' in input) patch.meal_shape = cleanText(input.meal_shape, 80);
  if ('service_feeling' in input) patch.service_feeling = cleanText(input.service_feeling, 120);
  if ('emotional_root' in input) patch.emotional_root = cleanText(input.emotional_root, 120);
  if ('hospitality_standard' in input) patch.hospitality_standard = cleanText(input.hospitality_standard, 80);
  if ('guest_count' in input) patch.guest_count = Math.max(0, Math.min(10_000, Math.round(Number(input.guest_count) || 0)));
  if ('advisory_budget_total_cents' in input) patch.advisory_budget_total_cents = nullableMoney(input.advisory_budget_total_cents);
  if ('advisory_budget_per_guest_cents' in input) patch.advisory_budget_per_guest_cents = nullableMoney(input.advisory_budget_per_guest_cents);
  if ('status' in input && ['draft', 'in_progress', 'ready_for_brief', 'confirmed'].includes(String(input.status))) {
    patch.status = input.status;
  }
  return patch;
}

function cleanScenePatch(input: ScenePatch): Plain {
  const patch: Plain = {};
  if ('title' in input) patch.title = cleanText(input.title, 120) || 'Untitled scene';
  if ('purpose' in input) patch.purpose = cleanText(input.purpose, 600);
  if ('planned_at' in input) patch.planned_at = cleanText(input.planned_at, 120);
  if ('duration_minutes' in input) {
    patch.duration_minutes = input.duration_minutes == null
      ? null
      : Math.max(0, Math.min(1440, Math.round(Number(input.duration_minutes) || 0)));
  }
  if ('service_style' in input) patch.service_style = cleanText(input.service_style, 100);
  if ('mood' in input) patch.mood = cleanText(input.mood, 100);
  if ('notes' in input) patch.notes = cleanText(input.notes, 4000);
  if ('status' in input && ['empty', 'in_progress', 'needs_review', 'ready', 'archived'].includes(String(input.status))) {
    patch.status = input.status;
  }
  return patch;
}

function cleanDishPatch(input: DishPatch): Plain {
  const patch: Plain = {};
  if ('name' in input) patch.name = cleanText(input.name, 140) || 'Untitled dish';
  if ('role' in input) patch.role = cleanText(input.role, 120);
  if ('ingredients_json' in input) {
    patch.ingredients_json = Array.isArray(input.ingredients_json)
      ? input.ingredients_json.map((item) => cleanText(item, 100)).filter(Boolean).slice(0, 80)
      : [];
  }
  if ('story' in input) patch.story = cleanText(input.story, 4000);
  if ('presentation' in input) patch.presentation = cleanText(input.presentation, 2000);
  if ('execution_notes' in input) patch.execution_notes = cleanText(input.execution_notes, 5000);
  if ('service_style' in input) patch.service_style = cleanText(input.service_style, 100);
  if ('mood' in input) patch.mood = cleanText(input.mood, 100);
  if ('advisory_cost_min_cents' in input) patch.advisory_cost_min_cents = nullableMoney(input.advisory_cost_min_cents);
  if ('advisory_cost_max_cents' in input) patch.advisory_cost_max_cents = nullableMoney(input.advisory_cost_max_cents);
  if ('status' in input && ['draft', 'needs_confirmation', 'confirmed'].includes(String(input.status))) patch.status = input.status;
  if ('source' in input && ['manual', 'suggested', 'imported'].includes(String(input.source))) patch.source = input.source;
  return patch;
}

function planProjection(row: Plain): Plain {
  return {
    intention: row.intention ?? '',
    meal_shape: row.meal_shape ?? '',
    service_feeling: row.service_feeling ?? '',
    emotional_root: row.emotional_root ?? '',
    hospitality_standard: row.hospitality_standard ?? '',
    guest_count: Number(row.guest_count ?? 0),
    advisory_budget_total_cents: row.advisory_budget_total_cents ?? null,
    advisory_budget_per_guest_cents: row.advisory_budget_per_guest_cents ?? null,
    status: row.status ?? 'draft',
  };
}

function sceneProjection(row: Plain): Plain {
  return {
    title: row.title ?? '',
    purpose: row.purpose ?? '',
    planned_at: row.planned_at ?? '',
    duration_minutes: row.duration_minutes ?? null,
    service_style: row.service_style ?? '',
    mood: row.mood ?? '',
    notes: row.notes ?? '',
    status: row.status ?? 'empty',
  };
}

function dishProjection(row: Plain): Plain {
  return {
    name: row.name ?? '',
    role: row.role ?? '',
    ingredients_json: row.ingredients_json ?? [],
    story: row.story ?? '',
    presentation: row.presentation ?? '',
    execution_notes: row.execution_notes ?? '',
    service_style: row.service_style ?? '',
    mood: row.mood ?? '',
    advisory_cost_min_cents: row.advisory_cost_min_cents ?? null,
    advisory_cost_max_cents: row.advisory_cost_max_cents ?? null,
    status: row.status ?? 'draft',
    source: row.source ?? 'manual',
  };
}

async function staleFeastOutputs(workspaceId: string) {
  await markOutputsStale(workspaceId, ['menu', 'caterer-brief']);
}

function revalidateFeast() {
  revalidatePath('/canvas/feast');
  revalidatePath('/canvas/feast/flow');
  revalidatePath('/canvas/feast/guests');
  revalidatePath('/canvas/feast/requirements');
  revalidatePath('/canvas/feast/presentation');
  revalidatePath('/canvas/feast/brief');
  revalidatePath('/canvas');
  revalidatePath('/printables');
}

export async function saveFeastPlan(input: {
  patch: FeastPlanPatch;
  expectedVersion: number;
  base: Plain;
  force?: boolean;
}): Promise<FeastSaveResult> {
  const workspace = await requireFeastWrite();
  const clean = cleanPlanPatch(input.patch);
  const db = supabaseAdmin();
  const expected = Math.max(1, Math.round(input.expectedVersion || 1));
  let query = db.from('feast_plans').update({
    ...clean,
    version: expected + 1,
    updated_by: workspace.userId,
    updated_at: new Date().toISOString(),
  }).eq('workspace_id', workspace.id);
  if (!input.force) query = query.eq('version', expected);
  const { data, error } = await query.select('version').maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current, error: currentError } = await db
      .from('feast_plans')
      .select('*')
      .eq('workspace_id', workspace.id)
      .single();
    if (currentError) throw currentError;
    return {
      ok: false,
      conflict: {
        base: input.base,
        mine: { ...input.base, ...clean },
        theirs: planProjection(current as Plain),
        currentVersion: Number(current.version ?? 1),
      },
    };
  }

  if (clean.meal_shape || clean.service_feeling) {
    await emitRipple(workspace.id, {
      sourceType: 'decision',
      category: 'menu',
      changeKind: 'meal_service_updated',
      summary: 'The Feast service plan changed',
      createdBy: workspace.userId,
      impact: [
        { area: 'staffing', note: 'Service staffing assumptions need review.', severity: 'med' },
        { area: 'rentals', note: 'Tableware and service rentals may change.' },
        { area: 'timeline', note: 'Meal timing and transitions may shift.', severity: 'med' },
        { area: 'seating', note: 'Table service and seat flow may need review.' },
        { area: 'budget', note: 'Per-guest service costs may change.', severity: 'med' },
        { area: 'caterer-brief', note: 'A new brief version will be available.', severity: 'high' },
      ],
    });
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true, version: Number(data.version) };
}

export async function createScene(input: {
  title: string;
  kind?: string;
  purpose?: string;
}): Promise<{ id: string; version: number }> {
  const workspace = await requireFeastWrite();
  const db = supabaseAdmin();
  const { data: latest } = await db
    .from('meal_scenes')
    .select('ordinal')
    .eq('workspace_id', workspace.id)
    .order('ordinal', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await db.from('meal_scenes').insert({
    workspace_id: workspace.id,
    title: cleanText(input.title, 120) || 'New scene',
    kind: cleanText(input.kind, 80) || 'custom',
    purpose: cleanText(input.purpose, 600),
    ordinal: Number(latest?.ordinal ?? -1) + 1,
    status: 'empty',
    version: 1,
  }).select('id, version').single();
  if (error) throw error;
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { id: data.id as string, version: Number(data.version) };
}

export async function saveScene(input: {
  id: string;
  patch: ScenePatch;
  expectedVersion: number;
  base: Plain;
  force?: boolean;
}): Promise<FeastSaveResult> {
  const workspace = await requireFeastWrite();
  const db = supabaseAdmin();
  const clean = cleanScenePatch(input.patch);
  const expected = Math.max(1, Math.round(input.expectedVersion || 1));
  let query = db.from('meal_scenes').update({ ...clean, version: expected + 1 })
    .eq('workspace_id', workspace.id)
    .eq('id', input.id);
  if (!input.force) query = query.eq('version', expected);
  const { data, error } = await query.select('version').maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current, error: currentError } = await db
      .from('meal_scenes')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('id', input.id)
      .single();
    if (currentError) throw currentError;
    return {
      ok: false,
      conflict: {
        base: input.base,
        mine: { ...input.base, ...clean },
        theirs: sceneProjection(current as Plain),
        currentVersion: Number(current.version ?? 1),
      },
    };
  }
  if (clean.service_style) {
    await emitRipple(workspace.id, {
      sourceType: 'decision',
      sourceId: input.id,
      category: 'menu',
      changeKind: 'scene_service_updated',
      summary: 'A Feast scene service style changed',
      createdBy: workspace.userId,
    });
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true, version: Number(data.version) };
}

export async function duplicateScene(sceneId: string): Promise<{ id: string }> {
  const workspace = await requireFeastWrite();
  const db = supabaseAdmin();
  const [{ data: source, error: sceneError }, { data: sourceDishes, error: dishesError }, { data: latest }] = await Promise.all([
    db.from('meal_scenes').select('*').eq('workspace_id', workspace.id).eq('id', sceneId).single(),
    db.from('dishes').select('*').eq('workspace_id', workspace.id).eq('scene_id', sceneId),
    db.from('meal_scenes').select('ordinal').eq('workspace_id', workspace.id).order('ordinal', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (sceneError) throw sceneError;
  if (dishesError) throw dishesError;
  const { id: _id, created_at: _createdAt, ...scene } = source as Plain;
  const { data: copy, error } = await db.from('meal_scenes').insert({
    ...scene,
    workspace_id: workspace.id,
    title: `${cleanText(source.title, 100)} copy`,
    ordinal: Number(latest?.ordinal ?? -1) + 1,
    version: 1,
  }).select('id').single();
  if (error) throw error;
  if (sourceDishes?.length) {
    const copies = sourceDishes.map((dish) => {
      const { id: _dishId, created_at: _dishCreatedAt, ...rest } = dish;
      return { ...rest, scene_id: copy.id, version: 1, status: 'draft', created_by: workspace.userId };
    });
    const { error: copyError } = await db.from('dishes').insert(copies);
    if (copyError) throw copyError;
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { id: copy.id as string };
}

export async function archiveScene(sceneId: string, expectedVersion: number): Promise<{ ok: true }> {
  const workspace = await requireFeastWrite();
  const { data, error } = await supabaseAdmin().from('meal_scenes')
    .update({ status: 'archived', version: expectedVersion + 1 })
    .eq('workspace_id', workspace.id)
    .eq('id', sceneId)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This scene changed before it could be archived. Refresh and try again.');
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true };
}

export async function restoreScene(sceneId: string, expectedVersion: number): Promise<{ ok: true }> {
  const workspace = await requireFeastWrite();
  const { data, error } = await supabaseAdmin().from('meal_scenes')
    .update({ status: 'in_progress', version: expectedVersion + 1 })
    .eq('workspace_id', workspace.id)
    .eq('id', sceneId)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This scene changed before it could be restored.');
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true };
}

export async function reorderScenes(
  ordered: Array<{ id: string; version: number }>,
): Promise<{ ok: true; versions: Record<string, number> } | { ok: false; current: Array<{ id: string; version: number; ordinal: number }> }> {
  const workspace = await requireFeastWrite();
  const db = supabaseAdmin();
  const ids = ordered.map((item) => item.id);
  const { data: current, error } = await db.from('meal_scenes')
    .select('id, version, ordinal')
    .eq('workspace_id', workspace.id)
    .in('id', ids);
  if (error) throw error;
  const currentById = new Map((current ?? []).map((scene) => [scene.id as string, scene]));
  const mismatch = ordered.some((item) => Number(currentById.get(item.id)?.version ?? -1) !== item.version);
  if (mismatch) {
    return {
      ok: false,
      current: (current ?? []).map((scene) => ({
        id: scene.id as string,
        version: Number(scene.version),
        ordinal: Number(scene.ordinal),
      })),
    };
  }
  const versions: Record<string, number> = {};
  for (let ordinal = 0; ordinal < ordered.length; ordinal += 1) {
    const item = ordered[ordinal];
    const { data, error: updateError } = await db.from('meal_scenes')
      .update({ ordinal, version: item.version + 1 })
      .eq('workspace_id', workspace.id)
      .eq('id', item.id)
      .eq('version', item.version)
      .select('version')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!data) {
      const { data: latest } = await db.from('meal_scenes').select('id, version, ordinal').eq('workspace_id', workspace.id).in('id', ids);
      return {
        ok: false,
        current: (latest ?? []).map((scene) => ({
          id: scene.id as string,
          version: Number(scene.version),
          ordinal: Number(scene.ordinal),
        })),
      };
    }
    versions[item.id] = Number(data.version);
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true, versions };
}

export async function createDish(input: {
  sceneId: string;
  dish: DishPatch;
}): Promise<{ id: string; version: number }> {
  const workspace = await requireFeastWrite();
  const clean = cleanDishPatch(input.dish);
  if (!clean.name) throw new Error('A dish needs a name');
  const { data: scene, error: sceneError } = await supabaseAdmin()
    .from('meal_scenes')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('id', input.sceneId)
    .single();
  if (sceneError || !scene) throw sceneError ?? new Error('Scene not found');
  const { data, error } = await supabaseAdmin().from('dishes').insert({
    workspace_id: workspace.id,
    scene_id: input.sceneId,
    ...clean,
    status: clean.status ?? 'draft',
    source: clean.source ?? 'manual',
    version: 1,
    created_by: workspace.userId,
  }).select('id, version').single();
  if (error) throw error;
  track('dish_created', {
    source: (clean.source ?? 'manual') as 'manual' | 'suggested' | 'imported',
    requiredStepsCompleted: 1,
  }, { workspaceId: workspace.id, userId: workspace.userId, surface: 'server' });
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { id: data.id as string, version: Number(data.version) };
}

export async function saveDish(input: {
  id: string;
  patch: DishPatch;
  expectedVersion: number;
  base: Plain;
  force?: boolean;
}): Promise<FeastSaveResult> {
  const workspace = await requireFeastWrite();
  const db = supabaseAdmin();
  const clean = cleanDishPatch(input.patch);
  const expected = Math.max(1, Math.round(input.expectedVersion || 1));
  let query = db.from('dishes').update({ ...clean, version: expected + 1 })
    .eq('workspace_id', workspace.id)
    .eq('id', input.id);
  if (!input.force) query = query.eq('version', expected);
  const { data, error } = await query.select('version').maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current, error: currentError } = await db
      .from('dishes')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('id', input.id)
      .single();
    if (currentError) throw currentError;
    track('sync_conflict_encountered', { objectType: 'dish' }, {
      workspaceId: workspace.id,
      userId: workspace.userId,
      surface: 'server',
    });
    return {
      ok: false,
      conflict: {
        base: input.base,
        mine: { ...input.base, ...clean },
        theirs: dishProjection(current as Plain),
        currentVersion: Number(current.version ?? 1),
      },
    };
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true, version: Number(data.version) };
}

export async function createRequirement(input: RequirementPatch): Promise<{ id: string }> {
  const workspace = await requireFeastWrite();
  const category = input.category && ['religious', 'dietary', 'allergy', 'preparation', 'preference'].includes(input.category)
    ? input.category
    : 'dietary';
  const severity = input.severity && ['preference', 'required', 'safety_critical'].includes(input.severity)
    ? input.severity
    : category === 'allergy' ? 'safety_critical' : 'required';
  const code = normalizeCode(input.code);
  if (!code) throw new Error('A requirement needs a name');
  const { data, error } = await supabaseAdmin().from('guest_requirements').insert({
    workspace_id: workspace.id,
    guest_id: input.guest_id || null,
    category,
    code,
    severity,
    notes: cleanText(input.notes, 3000),
  }).select('id').single();
  if (error) throw error;
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { id: data.id as string };
}

export async function saveRequirement(id: string, input: RequirementPatch): Promise<{ ok: true }> {
  const workspace = await requireFeastWrite();
  const patch: Plain = {};
  if ('guest_id' in input) patch.guest_id = input.guest_id || null;
  if (input.category && ['religious', 'dietary', 'allergy', 'preparation', 'preference'].includes(input.category)) patch.category = input.category;
  if (input.severity && ['preference', 'required', 'safety_critical'].includes(input.severity)) patch.severity = input.severity;
  if ('code' in input) patch.code = normalizeCode(input.code);
  if ('notes' in input) patch.notes = cleanText(input.notes, 3000);
  const { error } = await supabaseAdmin().from('guest_requirements')
    .update(patch)
    .eq('workspace_id', workspace.id)
    .eq('id', id);
  if (error) throw error;
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true };
}

export async function deleteRequirement(id: string): Promise<{ ok: true }> {
  const workspace = await requireFeastWrite();
  const db = supabaseAdmin();
  const { data: requirement, error: loadError } = await db.from('guest_requirements')
    .select('code')
    .eq('workspace_id', workspace.id)
    .eq('id', id)
    .single();
  if (loadError) throw loadError;
  const { error } = await db.from('guest_requirements').delete().eq('workspace_id', workspace.id).eq('id', id);
  if (error) throw error;
  const { count } = await db.from('guest_requirements').select('id', { head: true, count: 'exact' })
    .eq('workspace_id', workspace.id)
    .eq('code', requirement.code);
  if (!count) {
    await db.from('dish_assessments').delete().eq('workspace_id', workspace.id).eq('requirement_code', requirement.code);
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true };
}

export async function saveAssessment(input: {
  dishId: string;
  requirementCode: string;
  state: AssessmentState;
  reasoning?: string;
}): Promise<{ ok: true }> {
  const workspace = await requireFeastWrite();
  if (!['unknown', 'ingredient_compatible', 'conflict'].includes(input.state)) {
    throw new Error('Confirmed states require a recorded evidence source');
  }
  const db = supabaseAdmin();
  const [{ data: prior }, { data: requirement }] = await Promise.all([
    db.from('dish_assessments').select('state').eq('workspace_id', workspace.id).eq('dish_id', input.dishId).eq('requirement_code', input.requirementCode).maybeSingle(),
    db.from('guest_requirements').select('category').eq('workspace_id', workspace.id).eq('code', input.requirementCode).limit(1).maybeSingle(),
  ]);
  const { error } = await db.from('dish_assessments').upsert({
    workspace_id: workspace.id,
    dish_id: input.dishId,
    requirement_code: normalizeCode(input.requirementCode),
    state: input.state,
    reasoning: cleanText(input.reasoning, 1200),
    evidence_id: null,
    assessed_by: workspace.role === 'planner' ? 'planner' : 'partner',
    assessed_at: new Date().toISOString(),
  }, { onConflict: 'dish_id,requirement_code' });
  if (error) throw error;
  track('dish_assessment_changed', {
    requirementCategory: String(requirement?.category ?? ''),
    priorState: String(prior?.state ?? 'unknown'),
    newState: input.state,
  }, { workspaceId: workspace.id, userId: workspace.userId, surface: 'server' });
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { ok: true };
}

export async function recordEvidence(formData: FormData): Promise<{ id: string }> {
  const workspace = await requireFeastWrite();
  const dishId = cleanText(formData.get('dish_id'), 80);
  const requirementCode = normalizeCode(formData.get('requirement_code'));
  const sourceType = cleanText(formData.get('source_type'), 40) as EvidenceSource;
  const sourceName = cleanText(formData.get('source_name'), 180);
  const confirmedAt = cleanText(formData.get('confirmed_at'), 40) || new Date().toISOString();
  const expiresAt = cleanText(formData.get('expires_at'), 40) || null;
  const notes = cleanText(formData.get('notes'), 3000);
  if (!dishId || !requirementCode || !sourceName) throw new Error('Evidence needs a dish, requirement, and named source');
  if (!['conversation', 'email_note', 'menu', 'certificate', 'contract', 'other'].includes(sourceType)) {
    throw new Error('Choose a valid evidence source');
  }
  const file = formData.get('attachment');
  let attachmentId: string | null = null;
  if (file instanceof File && file.size > 0) {
    const upload = await uploadFile(workspace.id, file, workspace.userId);
    attachmentId = upload.uploadId;
  }
  const db = supabaseAdmin();
  const { data: evidence, error } = await db.from('confirmation_evidence').insert({
    workspace_id: workspace.id,
    source_type: sourceType,
    source_name: sourceName,
    confirmed_by: workspace.userId,
    confirmed_at: confirmedAt,
    expires_at: expiresAt,
    notes,
    attachment_id: attachmentId,
  }).select('id').single();
  if (error) throw error;
  const state: AssessmentState = sourceType === 'certificate' ? 'certification_documented' : 'vendor_confirmed';
  const { data: prior } = await db.from('dish_assessments').select('state')
    .eq('workspace_id', workspace.id)
    .eq('dish_id', dishId)
    .eq('requirement_code', requirementCode)
    .maybeSingle();
  const { error: assessmentError } = await db.from('dish_assessments').upsert({
    workspace_id: workspace.id,
    dish_id: dishId,
    requirement_code: requirementCode,
    state,
    reasoning: sourceType === 'certificate'
      ? 'Certification evidence recorded for this event.'
      : 'Vendor sourcing/preparation confirmation recorded for this event.',
    evidence_id: evidence.id,
    assessed_by: workspace.role === 'planner' ? 'planner' : 'partner',
    assessed_at: new Date().toISOString(),
  }, { onConflict: 'dish_id,requirement_code' });
  if (assessmentError) throw assessmentError;
  if (prior?.state === 'conflict') {
    const { count } = await db.from('guest_requirements').select('id', { head: true, count: 'exact' })
      .eq('workspace_id', workspace.id)
      .eq('code', requirementCode);
    track('guest_conflict_resolved', {
      resolutionType: sourceType === 'certificate' ? 'certification' : 'vendor_confirmation',
      guestsAffected: count ?? 0,
    }, { workspaceId: workspace.id, userId: workspace.userId, surface: 'server' });
  }
  await staleFeastOutputs(workspace.id);
  revalidateFeast();
  return { id: evidence.id as string };
}

export async function createBriefVersion(): Promise<{
  id: string;
  version: number;
  changedSections: string[];
}> {
  const workspace = await requireFeastWrite();
  const studio = await loadFeastStudio(workspace);
  const snapshot = buildCatererBriefSnapshot(studio);
  track('brief_previewed', {
    readiness: snapshot.readiness.ready,
    openQuestions: snapshot.readiness.open_confirmations.length + snapshot.readiness.conflicts.length,
  }, { workspaceId: workspace.id, userId: workspace.userId, surface: 'server' });
  if (!snapshot.readiness.ready) {
    throw new Error('Resolve safety-critical and certified guest-care gaps before creating a caterer brief version.');
  }
  const latest = studio.briefs[0];
  const version = Number(latest?.version ?? 0) + 1;
  const changedSections = changedBriefSections(snapshot, latest?.snapshot_json);
  const db = supabaseAdmin();
  const { data, error } = await db.from('caterer_brief_versions').insert({
    workspace_id: workspace.id,
    version,
    status: 'finalized',
    snapshot_json: snapshot,
    changed_sections: changedSections,
    created_by: workspace.userId,
  }).select('id, version').single();
  if (error) throw error;

  await db.from('output_versions')
    .update({ is_stale: true })
    .eq('workspace_id', workspace.id)
    .eq('output_kind', 'caterer-brief')
    .eq('is_stale', false);
  const { error: outputError } = await db.from('output_versions').insert({
    workspace_id: workspace.id,
    output_kind: 'caterer-brief',
    payload_json: snapshot,
    source_hash: catererBriefSourceHash(snapshot),
    is_stale: false,
    version,
    created_by: workspace.userId,
  });
  if (outputError) throw outputError;
  track('brief_version_created', {
    version,
    completeness: 100,
    changedSectionCount: changedSections.length,
  }, { workspaceId: workspace.id, userId: workspace.userId, surface: 'server' });
  revalidateFeast();
  return { id: data.id as string, version: Number(data.version), changedSections };
}
