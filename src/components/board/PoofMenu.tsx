'use client';
// The "Poof this" menu (Build Plan v2 §5.1). The dropdown is rendered in a portal so it is
// never clipped by the card's rounded overflow. Choosing a target opens the confirm/edit step.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PoofTarget } from '@/lib/types';
import { PoofConfirm } from './PoofConfirm';

const TARGETS: { target: PoofTarget; label: string }[] = [
  { target: 'vendor', label: 'Poof into vendor' },
  { target: 'task', label: 'Poof into task' },
  { target: 'budget_item', label: 'Poof into Money Map item' },
  { target: 'decision', label: 'Poof into decision' },
  { target: 'event', label: 'Poof into timeline event' },
  { target: 'document', label: 'Poof into document' },
  { target: 'honeymoon_item', label: 'Poof into honeymoon activity' },
  { target: 'guest_experience_note', label: 'Poof into guest experience note' },
];

export function PoofMenu({ workspaceId, boardItemId, onDone }: { workspaceId: string; boardItemId: string; onDone?: (r: { targetType: string; targetId: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<PoofTarget | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Clamp so the menu stays on-screen.
      const left = Math.min(r.left, window.innerWidth - 210);
      setPos({ left: Math.max(8, left), top: r.bottom + 6 });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={toggle}
        className="rounded-full border border-[var(--line)] bg-[var(--pearl)] px-3 py-1 text-xs text-[var(--clay-ink)] hover:bg-[var(--gold-bg)]"
      >
        ✦ Poof this
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[61] min-w-[190px] rounded-[10px] border border-[var(--line)] bg-[var(--pearl)] p-1.5 shadow-xl"
            style={{ left: pos.left, top: pos.top }}
          >
            {TARGETS.map((t) => (
              <button
                key={t.target}
                onClick={() => { setOpen(false); setConfirming(t.target); }}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--ink)] hover:bg-[var(--clay-bg)] hover:text-[var(--clay-ink)]"
              >
                {t.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}

      {confirming && (
        <PoofConfirm
          workspaceId={workspaceId}
          boardItemId={boardItemId}
          target={confirming}
          onCancel={() => setConfirming(null)}
          onDone={(r) => { setConfirming(null); onDone?.(r); }}
        />
      )}
    </div>
  );
}
