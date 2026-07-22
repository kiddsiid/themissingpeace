'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildCompass, type DreamResponses } from '@/lib/engine/compass';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateWorkspace } from '@/lib/workspace/generate';
import { track } from '@/lib/analytics';

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

async function fallbackSummarize(dream: DreamResponses) {
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

async function ensureUser(db: DB, clerkUserId: string): Promise<string> {
  const existing = await db.from('users').select('id').eq('clerk_user_id', clerkUserId).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? '';
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
  const { data, error } = await db
    .from('users')
    .upsert({ clerk_user_id: clerkUserId, email, name, avatar_url: clerkUser.imageUrl ?? null }, { onConflict: 'clerk_user_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
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
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error('Unauthorized');
  const db = supabaseAdmin();
  const userId = await ensureUser(db, clerkUserId);
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

export async function createWorkspaceFromOnboarding(formData: FormData) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error('Unauthorized');
  const db = supabaseAdmin();
  const userId = await ensureUser(db, clerkUserId);

  const name = String(formData.get('workspaceName') || 'Our Wedding').trim() || 'Our Wedding';
  const client = await clerkClient();
  const org = await client.organizations.createOrganization({ name, createdBy: clerkUserId });

  const { data: workspace, error: workspaceError } = await db
    .from('workspaces')
    .upsert({ clerk_org_id: org.id, name, created_by: userId }, { onConflict: 'clerk_org_id' })
    .select('id')
    .single();
  if (workspaceError || !workspace) throw workspaceError ?? new Error('Workspace not created');

  // Analytics (T4): coarse, non-identifying. No-ops unless analytics is enabled.
  track('workspace_created', { source: 'onboarding' }, { workspaceId: workspace.id, userId, surface: 'server' });

  await db.from('workspace_members').upsert(
    { workspace_id: workspace.id, user_id: userId, role: 'owner', status: 'active', invited_by: userId },
    { onConflict: 'workspace_id,user_id' }
  );

  const dateStatus = (String(formData.get('dateStatus') || 'none') as 'known' | 'range' | 'none');
  const dateSeason = text(formData, 'dateSeason');
  const dateYear = text(formData, 'dateYear');
  const desiredYear = text(formData, 'desiredYear');
  const dateRange = seasonRange(dateSeason, dateYear);
  const dream: DreamResponses = {
    priorities: list(formData, 'priorities'),
    creatorRole: (String(formData.get('creatorRole') || 'couple') as 'couple' | 'planner'),
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
  };

  await applyOnboarding(db, workspace.id, userId, {
    workspaceId: workspace.id,
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

  redirect('/dream?reveal=1');
}
