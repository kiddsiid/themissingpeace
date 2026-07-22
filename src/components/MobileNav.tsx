'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { NAV } from '@/components/nav';
import { Drawer } from '@/design-system';
import { cn } from '@/design-system/cn';
import { focusRing } from '@/design-system/tokens';
import { track } from '@/lib/analytics';

/**
 * App-shell mobile navigation (T3). A sticky top bar (mobile only; the SideNav
 * covers md+) with a hamburger that opens the design-system Drawer holding the
 * full NAV. The Drawer traps focus, closes on Esc / backdrop, and honors
 * reduced-motion. Route changes close the drawer.
 */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const path = usePathname();

  // Close on navigation.
  React.useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--pearl)]/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            'grid h-9 w-9 place-items-center rounded-[10px] text-[var(--ink)]',
            'hover:bg-[var(--cream)] transition-colors motion-reduce:transition-none',
            focusRing,
          )}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0">
          <div className="voice text-base leading-none">The Missing Peace</div>
        </div>
      </header>

      <Drawer open={open} onClose={() => setOpen(false)} side="left" title="The Missing Peace" aria-label="Main navigation">
        <nav aria-label="Primary">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = path === item.href || path?.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => track('mobile_nav_used', {}, {})}
                    className={cn(
                      'flex items-center rounded-[10px] px-3 py-2 text-sm',
                      focusRing,
                      active
                        ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)] font-medium'
                        : 'text-[var(--ink-soft)] hover:bg-[var(--cream)] hover:text-[var(--ink)]',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Drawer>
    </>
  );
}
