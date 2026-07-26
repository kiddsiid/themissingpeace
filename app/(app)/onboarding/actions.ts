'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildCompass, type DreamResponses } from '@/lib/engine/compass';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser, ensureAppUser } from '@/lib/auth/session';
import { createWorkspaceWithMember, createWorkspaceWithOwner, firstActiveWorkspaceId } from '@/lib/workspace/create';
import { generateWorkspace } from '@/lib/workspace/generate';
import { track } from '@/lib/analytics';
import { compassSentence, compassShort, type CloudPriorities } from '@/lib/engine/dream-clouds';
import { ACTIVE_WORKSPACE_COOKIE } from '@/lib/workspace/current';

type DB = ReturnType<typeof supabaseAdmin>;

export interface OnboardingInput {
  workspaceId: string;
  partnerOneLabel?: string;
  partnerTwoLabel?: string;
  dateStatus?: 'known' | 'range' | 'none';
  weddingDate?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  planningStage?: string;
  guestEstimate?: number;
  guestMax?: number;
  budgetTotal?: number;
  budgetConfidence?: 'firm' | 'flexible' | 'unknown';
  enableHoneymoon?: boolean;
  enablePrewedding?: boolean;
  dream: DreamResponses;
}

// The current signed-in user's public.users.id (Supabase Auth identity).
async function requireUserId(): Promise<string> {
  const authUser = await getSessionUser();
  if (!authUser) throw new Error('Unauthorized');
  return ensureAppUser(authUser);
}

async function fallbackSummarize(dream: DreamResponses) {
  if (dream.cloudPriorities && Object.keys(dream.cloudPriorities).length) {
    return {
      summary: compassSentence(dream.cloudPriorities as CloudPriorities),
      tone: compassShort(dream.cloudPriorities as CloudPriorities),
    };
  }
  const top = (dream.priorities ?? []).slice(0, 3).join(', ') || 'what matters most to you';
  const meaning = dream.sharedMeaning || dream.meaning;
  const tone = [...(dream.priorities ?? []), ...(dream.planningValues ?? [])].slice(0, 4).join(', ') || 'calm, personal';
  return { summary: meaning ? `${meaning} The plan should stay centered on ${top}.` : `A wedding centered on ${top}.`, tone };
}

function seasonRange(season?: string, year?: string): { start?: string; end?: string } {
  const parsed = Number(year);
  if (!season || !Number.isInteger(parsed)) return {};
  const value = season.toLowerCase();
  if (value === 'spring') return { start: `${parsed}-03-01`, end: `${parsed}-05-31` };
  if (value === 'summer') return { start: `${parsed}-06-01`, end: `${parsed}-08-31` };
  if (value === 'fall') return { start: `${parsed}-09-01`, end: `${parsed}-11-30` };
  if (value === 'winter') return { start: `${parsed}-12-01`, end: `${parsed + 1}-02-28` };
  return {};
}

async function applyOnboarding(db: DB, workspaceId: string, userId: string, input: OnboardingInput) {
  await db.from('wedding_profiles').upsert({
    workspace_id: workspaceId,
    partner_one_label: input.partnerOneLabel || 'Partner One',
    partner_two_label: input.partnerTwoLabel || 'Partner Two',
    date_status: input.dateStatus ?? 'none',
    wedding_date: input.dateStatus === 'known' ? input.weddingDate || null : null,
    date_range_start: input.dateStatus === 'range' ? input.dateRangeStart ?? null : null,
    date_range_end: input.dateStatus === 'range' ? input.dateRangeEnd ?? null : null,
    planning_stage: input.planningStage || 'just_engaged',
    guest_estimate: input.guestEstimate ?? null,
    guest_max: input.guestMax ?? null,
    budget_total: input.budgetTotal ?? null,
    budget_confidence: input.budgetConfidence ?? 'unknown',
    honeymoon_enabled: !!input.enableHoneymoon,
  }, { onConflict: 'workspace_id' });

  const { data: dreamRow, error: dreamError } = await db.from('dreams')
    .insert({ workspace_id: workspaceId, responses_json: input.dream, created_by: userId })
    .select('id')
    .single();
  if (dreamError) throw dreamError;

  const compass = await buildCompass(input.dream, fallbackSummarize);
  await db.from('wedding_compass').upsert({
    workspace_id: workspaceId,
    dream_id: dreamRow.id,
    summary: compass.summary,
    tone: compass.tone,
    priorities_json: compass.priorities,
    non_negotiables_json: compass.nonNegotiables,
    avoid_json: compass.avoid,
    cultural_values_json: compass.culturalValues,
    traditions_json: compass.traditions,
    version: 1,
    updated_by: userId,
  }, { onConflict: 'workspace_id' });

  await generateWorkspace({ workspaceId, enableHoneymoon: input.enableHoneymoon, enablePrewedding: input.enablePrewedding });
  await db.from('audit_events').insert({ workspace_id: workspaceId, actor_id: userId, action: 'dream_walk_complete', entity_type: 'workspace', entity_id: workspaceId });
}

export async function completeOnboarding(input: OnboardingInput) {
  const userId = await requireUserId();
  const db = supabaseAdmin();
  await applyOnboarding(db, input.workspaceId, userId, input);
}

function list(formData: FormData, key: string): string[] {
  const values = formData.getAll(key).map(String).filter(Boolean);
  return [...new Set(values.flatMap((value) => value.split(/[,\n]/)).map((value) => value.trim()).filter(Boolean))];
}

function num(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cloudPriorities(formData: FormData): Record<string, number> {
  const raw = text(formData, 'cloudPriorities');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => Number.isFinite(Number(value)))
        .map(([key, value]) => [key, Math.max(0.04, Math.min(1, Number(value)))]),
    );
  } catch {
    return {};
  }
}

// Completes the Dream Walk. By this point the user has created their profile (Supabase
// Auth) and a workspace exists (from the Create-profile step); we resolve or create it,
// then apply the Dream to it. No Clerk org — the workspace is Postgres-native.
export async function createWorkspaceFromOnboarding(formData: FormData) {
  const userId = await requireUserId();
  const db = supabaseAdmin();

  const name = String(formData.get('workspaceName') || 'Our Wedding').trim() || 'Our Wedding';
  let workspaceId = await firstActiveWorkspaceId(userId);
  if (!workspaceId) {
    workspaceId = await createWorkspaceWithOwner(userId, name);
    track('workspace_created', { source: 'onboarding' }, { workspaceId, userId, surface: 'server' });
  }

  const dateStatus = (String(formData.get('dateStatus') || 'none') as 'known' | 'range' | 'none');
  const dateSeason = text(formData, 'dateSeason');
  const dateYear = text(formData, 'dateYear');
  const desiredYear = text(formData, 'desiredYear');
  const dateRange = seasonRange(dateSeason, dateYear);
  const dream: DreamResponses = {
    priorities: list(formData, 'priorities'),
    creatorRole: (String(formData.get('creatorRole') || 'couple') as 'couple' | 'planner' | 'dreamer'),
    partnerOneReflection: text(formData, 'partnerOneReflection'),
    partnerTwoReflection: text(formData, 'partnerTwoReflection'),
    sharedMeaning: text(formData, 'sharedMeaning'),
    meaning: text(formData, 'meaning'),
    nonNegotiables: list(formData, 'nonNegotiables'),
    avoid: list(formData, 'avoid'),
    culturalValues: list(formData, 'culturalValues'),
    traditions: list(formData, 'traditions'),
    planningValues: list(formData, 'planningValues'),
    hospitalityMeaning: text(formData, 'hospitalityMeaning'),
    musicAtmosphere: text(formData, 'musicAtmosphere'),
    familyMeaning: text(formData, 'familyMeaning'),
    budgetValues: text(formData, 'budgetValues'),
    dateSeason,
    dateYear,
    desiredYear,
    cloudPriorities: cloudPriorities(formData),
    light: text(formData, 'light'),
    guestScale: text(formData, 'guestScale'),
  };

  await applyOnboarding(db, workspaceId, userId, {
    workspaceId,
    partnerOneLabel: text(formData, 'partnerOneLabel'),
    partnerTwoLabel: text(formData, 'partnerTwoLabel'),
    dateStatus,
    weddingDate: text(formData, 'weddingDate'),
    dateRangeStart: dateRange.start,
    dateRangeEnd: dateRange.end,
    planningStage: String(formData.get('planningStage') || 'just_engaged'),
    guestEstimate: num(formData.get('guestEstimate')),
    guestMax: num(formData.get('guestMax')),
    budgetTotal: num(formData.get('budgetTotal')),
    budgetConfidence: (String(formData.get('budgetConfidence') || 'unknown') as 'firm' | 'flexible' | 'unknown'),
    enableHoneymoon: formData.get('enableHoneymoon') === 'on',
    dream,
  });

  track('dream_walk_completed', { creatorRole: dream.creatorRole, stepsCompleted: 3 }, { workspaceId, userId, surface: 'server' });
  track('compass_revealed', {}, { workspaceId, userId, surface: 'server' });

  redirect('/dream?reveal=1');
}

export async function createPlannerWorkspaceFromWalk(formData: FormData) {
  const userId = await requireUserId();
  const db = supabaseAdmin();
  const partnerOne = text(formData, 'partnerOneLabel') || 'Partner One';
  const partnerTwo = text(formData, 'partnerTwoLabel') || 'Partner Two';
  const workspaceName = text(formData, 'workspaceName') || `${partnerOne} & ${partnerTwo}`;
  const workspaceId = await createWorkspaceWithMember(userId, workspaceName, 'planner');
  const priorities = cloudPriorities(formData);
  const dateRange = seasonRange(text(formData, 'dateSeason'), text(formData, 'dateYear'));
  const dream: DreamResponses = {
    creatorRole: 'planner',
    partnerOneReflection: text(formData, 'coupleFeeling'),
    sharedMeaning: compassSentence(priorities),
    priorities: list(formData, 'priorities'),
    cloudPriorities: priorities,
    dateSeason: text(formData, 'dateSeason'),
    dateYear: text(formData, 'dateYear'),
    light: text(formData, 'light'),
    guestScale: text(formData, 'guestScale'),
    planningValues: ['Carry the couple’s feeling into every decision'],
  };

  await applyOnboarding(db, workspaceId, userId, {
    workspaceId,
    partnerOneLabel: partnerOne,
    partnerTwoLabel: partnerTwo,
    dateStatus: 'range',
    dateRangeStart: dateRange.start,
    dateRangeEnd: dateRange.end,
    planningStage: text(formData, 'planningStage') || 'just_engaged',
    guestEstimate: num(formData.get('guestEstimate')),
    guestMax: num(formData.get('guestMax')),
    budgetConfidence: 'unknown',
    dream,
  });

  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  track('workspace_created', { source: 'onboarding' }, { workspaceId, userId, surface: 'server' });
  track('dream_walk_completed', { creatorRole: 'planner', stepsCompleted: 3 }, { workspaceId, userId, surface: 'server' });
  track('compass_revealed', {}, { workspaceId, userId, surface: 'server' });
  redirect('/planner?created=1');
}
