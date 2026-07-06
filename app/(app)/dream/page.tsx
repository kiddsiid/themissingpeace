import { redirect } from 'next/navigation';
import { DreamWorkspace } from '@/app/(app)/dream/DreamWorkspace';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import type { DreamResponses } from '@/lib/engine/compass';

export default async function DreamPage({ searchParams }: { searchParams: Promise<{ reveal?: string }> }) {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');

  const db = supabaseAdmin();
  const [profileRes, dreamRes, compassRes, params] = await Promise.all([
    db.from('wedding_profiles').select('date_status, wedding_date, planning_stage, guest_estimate, guest_max, budget_total, budget_confidence, honeymoon_enabled').eq('workspace_id', ws.id).maybeSingle(),
    db.from('dreams').select('responses_json, created_at').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('wedding_compass').select('summary, tone').eq('workspace_id', ws.id).maybeSingle(),
    searchParams,
  ]);

  return (
    <DreamWorkspace
      dream={(dreamRes.data?.responses_json ?? {}) as DreamResponses}
      profile={profileRes.data}
      compass={compassRes.data}
      reveal={params?.reveal === '1'}
    />
  );
}
