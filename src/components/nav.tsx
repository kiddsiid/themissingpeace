'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV = [
  { href: '/planner', label: 'Planner Home', icon: 'portfolio' },
  { href: '/dream', label: 'Dream', icon: 'dream' },
  { href: '/peace-center', label: 'Peace Center', icon: 'sparkles' },
  { href: '/canvas', label: 'Living Canvas', icon: 'board' },
  { href: '/decisions', label: 'Decisions', icon: 'check' },
  { href: '/budget', label: 'Money Map', icon: 'wallet' },
  { href: '/vendors', label: 'Vendors', icon: 'users' },
  { href: '/guests', label: 'Guests', icon: 'friends' },
  { href: '/seating', label: 'Seating', icon: 'seats' },
  { href: '/website', label: 'Website', icon: 'globe' },
  { href: '/printables', label: 'Printables', icon: 'print' },
  { href: '/timeline', label: 'Timeline', icon: 'timeline' },
  { href: '/documents', label: 'Documents', icon: 'folder' },
  { href: '/playlist', label: 'Playlist', icon: 'music' },
  { href: '/honeymoon', label: 'Honeymoon', icon: 'plane' },
  { href: '/peace-notes', label: 'Peace Notes', icon: 'feather' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;

export const MOBILE_NAV = ['/dream', '/peace-center', '/canvas', '/guests'] as const;

export function SideNav({ backendAdmin = false }: { backendAdmin?: boolean }) {
  const path = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 border-r border-[var(--line)] bg-[var(--pearl)] p-3 md:block">
      <div className="px-2 pb-4">
        <div className="voice text-lg">The Missing Peace</div>
        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-faint)]">Begin with the feeling</div>
        {backendAdmin ? (
          <div className="mt-2 inline-flex rounded-full border border-[#A8782A]/35 bg-[#F4EBDD] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6C4712]">
            Backend admin · test
          </div>
        ) : null}
      </div>
      {NAV.map((item) => {
        const active = item.href === '/canvas'
          ? path === '/canvas' || Boolean(path?.startsWith('/canvas/'))
          : path === item.href || path?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              'flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm ' +
              (active ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'text-[var(--ink-soft)] hover:bg-[var(--cream)]')
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
