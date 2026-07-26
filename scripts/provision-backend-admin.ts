import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../src/lib/supabase/admin';
import { ensureAppUser } from '../src/lib/auth/session';
import {
  createWorkspaceWithOwner,
  firstActiveWorkspaceId,
  seedWelcomeBasics,
} from '../src/lib/workspace/create';

loadEnvConfig(process.cwd());

const DEMO_WORKSPACE_NAME = 'Maya & Julian · Admin Test';
const MAYA_PERSONA = {
  name: 'Maya',
  role: 'The dreamer',
  line: 'Started this whole thing. Wants warmth over show.',
};
const JULIAN_PERSONA = {
  name: 'Julian',
  role: 'Her person',
  line: 'Says yes to the big stuff. Guards the dance floor.',
};
const ARIA_PERSONA = {
  name: 'Aria',
  role: 'Wedding planner',
  line: 'Keeps the peace. Protects the Compass they set.',
};

function parseLocalCredentials(source: string): Record<string, string> {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function main() {
const credentialPath = resolve('.env.admin-test.local');
const credentials = parseLocalCredentials(await readFile(credentialPath, 'utf8'));
const enabled = credentials.ENABLE_BACKEND_ADMIN_TEST_ACCOUNT === 'true';
const configuredAuthUserId = credentials.BACKEND_ADMIN_TEST_AUTH_USER_ID?.trim();
const email = credentials.BACKEND_ADMIN_TEST_EMAIL?.trim().toLowerCase();
const retiredEmail = credentials.BACKEND_ADMIN_TEST_RETIRED_EMAIL?.trim().toLowerCase();
const password = credentials.BACKEND_ADMIN_TEST_PASSWORD;

if (!enabled) throw new Error('Backend admin test account provisioning is not enabled.');
if (!email || !password) throw new Error('Backend admin test credentials are incomplete.');
if (password.length < 20) throw new Error('Backend admin test password must be at least 20 characters.');

const db = supabaseAdmin();
const listed = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;

let authUser = configuredAuthUserId
  ? listed.data.users.find((user) => user.id === configuredAuthUserId)
  : listed.data.users.find((user) => user.email?.toLowerCase() === email);

if (configuredAuthUserId && !authUser) {
  throw new Error(`Configured backend admin auth user was not found: ${configuredAuthUserId}`);
}

if (authUser) {
  const updated = await db.auth.admin.updateUserById(authUser.id, {
    email,
    password,
    email_confirm: true,
    app_metadata: {
      ...authUser.app_metadata,
      backend_admin: true,
      test_account: true,
    },
    user_metadata: {
      ...authUser.user_metadata,
      name: MAYA_PERSONA.name,
      persona_role: MAYA_PERSONA.role,
      persona_line: MAYA_PERSONA.line,
    },
  });
  if (updated.error || !updated.data.user) {
    throw updated.error ?? new Error('Backend admin auth user was not updated.');
  }
  authUser = updated.data.user;
} else {
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      backend_admin: true,
      test_account: true,
    },
    user_metadata: {
      name: MAYA_PERSONA.name,
      persona_role: MAYA_PERSONA.role,
      persona_line: MAYA_PERSONA.line,
    },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error('Backend admin auth user was not created.');
  }
  authUser = created.data.user;
}

const authVerifier = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
);
const verifiedLogin = await authVerifier.auth.signInWithPassword({ email, password });
if (verifiedLogin.error || verifiedLogin.data.user?.id !== authUser.id) {
  throw verifiedLogin.error ?? new Error('Backend admin login verification failed.');
}
if (verifiedLogin.data.user.app_metadata?.backend_admin !== true) {
  throw new Error('Verified backend admin session is missing its authorization claim.');
}
await authVerifier.auth.signOut();

let retiredEmailRejected = false;
if (retiredEmail && retiredEmail !== email) {
  const retiredLogin = await authVerifier.auth.signInWithPassword({
    email: retiredEmail,
    password,
  });
  if (!retiredLogin.error) {
    await authVerifier.auth.signOut();
    throw new Error(`Retired backend admin email still signs in: ${retiredEmail}`);
  }
  retiredEmailRejected = true;
}

const appUserId = await ensureAppUser(authUser);
const syncedAppUser = await db
  .from('users')
  .update({ email, name: MAYA_PERSONA.name, display_name: MAYA_PERSONA.name })
  .eq('id', appUserId);
if (syncedAppUser.error) throw syncedAppUser.error;

let workspaceId = await firstActiveWorkspaceId(appUserId);

if (!workspaceId) {
  workspaceId = await createWorkspaceWithOwner(appUserId, DEMO_WORKSPACE_NAME);
} else {
  const membership = await db
    .from('workspace_members')
    .update({ role: 'owner', partner_label: MAYA_PERSONA.role, status: 'active' })
    .eq('workspace_id', workspaceId)
    .eq('user_id', appUserId);
  if (membership.error) throw membership.error;
}

await seedWelcomeBasics(workspaceId, {
  workspaceName: DEMO_WORKSPACE_NAME,
  creatorRole: 'dreamer',
  partnerOneLabel: MAYA_PERSONA.name,
  partnerTwoLabel: JULIAN_PERSONA.name,
});

const renamedWorkspace = await db
  .from('workspaces')
  .update({ name: DEMO_WORKSPACE_NAME })
  .eq('id', workspaceId);
if (renamedWorkspace.error) throw renamedWorkspace.error;

const ownerMembership = await db.from('workspace_members').upsert(
  {
    workspace_id: workspaceId,
    user_id: appUserId,
    role: 'owner',
    partner_label: MAYA_PERSONA.role,
    invited_by: appUserId,
    status: 'active',
  },
  { onConflict: 'workspace_id,user_id' },
);
if (ownerMembership.error) throw ownerMembership.error;

async function ensurePersonaUser(
  key: string,
  persona: { name: string; role: string; line: string },
): Promise<string> {
  const result = await db
    .from('users')
    .upsert(
      {
        clerk_user_id: `admin-test-persona:${key}`,
        name: persona.name,
        display_name: persona.name,
        email: `${key}@themissingpeace.test`,
      },
      { onConflict: 'clerk_user_id' },
    )
    .select('id')
    .single();
  if (result.error || !result.data?.id) {
    throw result.error ?? new Error(`Test persona was not created: ${persona.name}`);
  }
  return result.data.id as string;
}

const julianUserId = await ensurePersonaUser('julian', JULIAN_PERSONA);
const ariaUserId = await ensurePersonaUser('aria', ARIA_PERSONA);
const personaMemberships = await db.from('workspace_members').upsert(
  [
    {
      workspace_id: workspaceId,
      user_id: julianUserId,
      role: 'partner',
      partner_label: JULIAN_PERSONA.role,
      invited_by: appUserId,
      status: 'active',
    },
    {
      workspace_id: workspaceId,
      user_id: ariaUserId,
      role: 'planner',
      partner_label: ARIA_PERSONA.role,
      invited_by: appUserId,
      status: 'active',
    },
  ],
  { onConflict: 'workspace_id,user_id' },
);
if (personaMemberships.error) throw personaMemberships.error;

const profile = await db.from('wedding_profiles').upsert(
  {
    workspace_id: workspaceId,
    partner_one_label: MAYA_PERSONA.name,
    partner_two_label: JULIAN_PERSONA.name,
    date_status: 'range',
    date_range_start: '2027-09-01',
    date_range_end: '2027-11-30',
    planning_stage: 'vendor_booking',
    guest_estimate: 128,
    guest_max: 140,
    budget_total: 42000,
    budget_confidence: 'flexible',
    honeymoon_enabled: true,
  },
  { onConflict: 'workspace_id' },
);
if (profile.error) throw profile.error;

const dreamResponses = {
  creatorRole: 'dreamer',
  partnerOneReflection:
    'If everyone we love is in one room, laughing, the rest is just decoration.',
  partnerTwoReflection:
    'The dance floor should never be empty. That is the memory we want.',
  sharedMeaning:
    'We want the best dinner party we have ever thrown — warm, generous, and never a performance.',
  priorities: [
    'Family & our people',
    'Warmth over show',
    'A shared table',
    'Music & dancing',
    'Soft beauty',
    'Ease & calm',
    'Memory & photos',
  ],
  nonNegotiables: [
    'One long, generous table of food',
    'Music and dancing well past midnight',
    'Time to be fully present',
  ],
  avoid: ['Anything stiff or over-styled', 'A day that feels like a production'],
  culturalValues: ['Hospitality', 'Family traditions', 'Everyone belongs at the table'],
  traditions: ['Moroccan mint tea and sweets before the sendoff'],
  planningValues: ['Warmth over show', 'Protect the feeling before the performance'],
  hospitalityMeaning:
    'Family-style plates passed around slowly, with every guest cared for without having to ask.',
  musicAtmosphere: 'A full dance floor that carries the celebration past midnight.',
  familyMeaning: 'The people we love are the center of the day.',
  budgetValues: 'Spend on hospitality, music, and photographs that remember how it felt.',
  dateSeason: 'Fall',
  dateYear: '2027',
  desiredYear: '2027',
  cloudPriorities: {
    family: 1,
    warmth: 0.96,
    table: 0.9,
    music: 0.84,
    beauty: 0.72,
    ease: 0.8,
    memory: 0.7,
  },
  light: 'Golden hour',
  guestScale: 'intimate',
  compassApproved: true,
};
const currentDream = await db
  .from('dreams')
  .select('id')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
if (currentDream.error) throw currentDream.error;

let dreamId = currentDream.data?.id as string | undefined;
if (dreamId) {
  const updatedDream = await db
    .from('dreams')
    .update({ responses_json: dreamResponses, created_by: appUserId })
    .eq('id', dreamId);
  if (updatedDream.error) throw updatedDream.error;
} else {
  const insertedDream = await db
    .from('dreams')
    .insert({ workspace_id: workspaceId, responses_json: dreamResponses, created_by: appUserId })
    .select('id')
    .single();
  if (insertedDream.error || !insertedDream.data?.id) {
    throw insertedDream.error ?? new Error('Maya and Julian test Dream was not created.');
  }
  dreamId = insertedDream.data.id as string;
}

const compass = await db.from('wedding_compass').upsert(
  {
    workspace_id: workspaceId,
    dream_id: dreamId,
    summary: 'An intimate, family-first celebration — warmth over show.',
    priorities_json: dreamResponses.priorities,
    non_negotiables_json: dreamResponses.nonNegotiables,
    avoid_json: dreamResponses.avoid,
    cultural_values_json: dreamResponses.culturalValues,
    traditions_json: dreamResponses.traditions,
    tone: 'Warm, candlelit, grounded, and generous.',
    updated_by: appUserId,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'workspace_id' },
);
if (compass.error) throw compass.error;

const personaRows = await db
  .from('workspace_members')
  .select('role, partner_label, users!workspace_members_user_id_fkey!inner(display_name)')
  .eq('workspace_id', workspaceId)
  .eq('status', 'active');
if (personaRows.error) throw personaRows.error;

process.stdout.write(
  JSON.stringify({
    ok: true,
    authUserId: authUser.id,
    email: authUser.email,
    appUserId,
    workspaceId,
    backendAdmin: authUser.app_metadata?.backend_admin === true,
    loginVerified: true,
    retiredEmailRejected,
    workspaceRole: 'owner',
    workspaceName: DEMO_WORKSPACE_NAME,
    personas: personaRows.data,
  }),
);
}

main().catch((error: unknown) => {
  const detail =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
  process.stderr.write(`${JSON.stringify({ ok: false, error: detail })}\n`);
  process.exitCode = 1;
});
