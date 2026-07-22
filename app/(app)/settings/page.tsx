// Settings — account + workspace. Workspace switching (the planner seat) will list the
// user's active memberships from workspace_members; for now we surface the account and a
// sign-out control. Everything in the app follows the active workspace automatically.
import { signOut } from '@/lib/auth/actions';
import { getSessionUser } from '@/lib/auth/session';
import { getActiveWorkspace } from '@/lib/workspace/current';

export default async function Page() {
  const [user, ws] = await Promise.all([getSessionUser(), getActiveWorkspace()]);

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
          Planning more than one celebration? Switching between weddings will live here — everything
          in the app follows along: boards, guests, seating, money, all of it. (Coming soon.)
        </p>
      </section>

      <section className="mt-4 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <h2 className="voice text-xl">Coming soon</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Members &amp; roles, partner labels, privacy, export/delete (Build Plan v2 §4.4).</p>
      </section>
    </div>
  );
}
