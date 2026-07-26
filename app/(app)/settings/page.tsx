// Settings — account + workspace. Workspace switching (the planner seat) will list the
// user's active memberships from workspace_members; for now we surface the account and a
// sign-out control. Everything in the app follows the active workspace automatically.
import { signOut } from '@/lib/auth/actions';
import { getSessionUser } from '@/lib/auth/session';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { can } from '@/lib/auth/permissions';
import { updateMemberRole } from '@/app/(app)/settings/actions';
import { InviteCircle } from '@/components/InviteCircle';
import Link from 'next/link';

export default async function Page() {
  const [user, ws] = await Promise.all([getSessionUser(), getActiveWorkspace()]);
  const db = supabaseAdmin();
  const { data: memberships } = ws
    ? await db.from('workspace_members').select('id, user_id, role, partner_label, status, created_at').eq('workspace_id', ws.id).order('created_at')
    : { data: [] };
  const userIds = (memberships ?? []).map((member: any) => member.user_id);
  const { data: memberUsers } = userIds.length
    ? await db.from('users').select('id, name, display_name, email').in('id', userIds)
    : { data: [] };
  const users = new Map((memberUsers ?? []).map((member: any) => [member.id, member]));
  const canManage = !!ws && can(ws.role, 'members.manage');

  return (
    <div className="max-w-3xl">
      <h1 className="voice text-3xl">Settings</h1>

      <section className="mt-6 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <h2 className="voice text-xl">Your account</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Signed in as <span className="text-[var(--ink)]">{user?.email ?? 'a guest'}</span>
          {ws ? <> · current wedding: <span className="text-[var(--ink)]">{ws.name}</span></> : null}
        </p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="rounded-full border border-[#D8C7A6] px-5 py-2 text-sm text-[var(--ink-soft)] transition hover:bg-[var(--gold-bg)]"
          >
            Sign out
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <h2 className="voice text-xl">Your weddings</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Planning more than one celebration? Open Planner Home to switch safely — everything
          in the app follows along: Compass, boards, guests, seating, money, and timeline.
        </p>
        <Link href="/planner" className="mt-4 inline-block rounded-full border border-[#D8C7A6] px-5 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Open Planner Home</Link>
      </section>

      <section className="mt-4 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="voice text-xl">Members &amp; roles</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Client-facing access for this wedding. Changes are recorded in the audit trail.</p>
          </div>
          {canManage && <InviteCircle />}
        </div>
        <div className="mt-4 space-y-2">
          {(memberships ?? []).map((member: any) => {
            const memberUser = users.get(member.user_id);
            return (
              <form key={member.id} action={updateMemberRole} className="grid gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--cream)] p-3 sm:grid-cols-[1fr_0.8fr_0.8fr_auto] sm:items-center">
                <input type="hidden" name="member_id" value={member.id} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--ink)]">{memberUser?.display_name || memberUser?.name || memberUser?.email || 'Invited member'}</p>
                  <p className="truncate text-[11px] text-[var(--ink-faint)]">{memberUser?.email || member.status}</p>
                </div>
                <select name="role" defaultValue={member.role} disabled={!canManage} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-70">
                  {['owner', 'partner', 'planner', 'collaborator', 'contributor', 'viewer'].map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <input name="partner_label" defaultValue={member.partner_label || ''} disabled={!canManage} placeholder="Partner label" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-70" />
                {canManage && <button className="rounded-full bg-[var(--gold-bg)] px-4 py-2 text-sm text-[var(--gold)]">Save</button>}
              </form>
            );
          })}
          {!memberships?.length && <p className="text-sm text-[var(--ink-faint)]">No active workspace members yet.</p>}
        </div>
      </section>
    </div>
  );
}
