import { SideNav } from '@/components/nav';
import { MobileNav } from '@/components/MobileNav';
import { MotionWorld } from '@/components/MotionWorld';

// Authenticated app shell (Build Plan v2 §7 Phase 1).
// NOTE (Codex): gate this layout behind Clerk auth + workspace membership.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Skip link: first tab stop, visible on focus, jumps past nav to content. */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-[10px] focus-visible:bg-[var(--ink)] focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-[var(--pearl)]"
      >
        Skip to content
      </a>
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-6 py-6 outline-none md:px-10"
        >
          <MotionWorld>{children}</MotionWorld>
        </main>
      </div>
    </div>
  );
}
