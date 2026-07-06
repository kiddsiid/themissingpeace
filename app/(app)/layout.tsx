import { SideNav } from '@/components/nav';
import { MotionWorld } from '@/components/MotionWorld';

// Authenticated app shell (Build Plan v2 §7 Phase 1).
// NOTE (Codex): gate this layout behind Clerk auth + workspace membership.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <main className="min-w-0 flex-1 px-6 py-6 md:px-10">
        <MotionWorld>{children}</MotionWorld>
      </main>
    </div>
  );
}
