// Settings — workspace switching (the planner seat, North Star Wave C minimal) lives here:
// planners managing several weddings hop between Clerk organizations, and the whole app
// (workspace resolution, RLS scoping) follows the active org automatically.
import { OrganizationSwitcher } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="max-w-3xl">
      <h1 className="voice text-3xl">Settings</h1>

      <section className="mt-6 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <h2 className="voice text-xl">Your weddings</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Planning more than one celebration? Switch between weddings here — everything in the app
          follows along: boards, guests, seating, money, all of it.
        </p>
        <div className="mt-3">
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/peace-center" />
        </div>
      </section>

      <section className="mt-4 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <h2 className="voice text-xl">Coming soon</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Members & roles, partner labels, privacy, export/delete (Build Plan v2 §4.4).</p>
      </section>
    </div>
  );
}
