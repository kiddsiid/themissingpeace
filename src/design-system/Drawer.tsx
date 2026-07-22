'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { focusRing } from './tokens';
import { useOverlay, useMounted } from './useOverlay';

type Side = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: Side;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Panel width (Tailwind arbitrary or class). Default 18rem. */
  widthClassName?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Off-canvas panel — the app-shell mobile navigation drawer (T3) is built on
 * this. Slides in from `side`, traps focus, closes on Esc / backdrop tap, and
 * collapses its motion under prefers-reduced-motion.
 */
export function Drawer({
  open,
  onClose,
  side = 'left',
  title,
  children,
  widthClassName = 'w-[18rem] max-w-[86vw]',
  className,
  'aria-label': ariaLabel,
}: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const mounted = useMounted();
  useOverlay(open, onClose, panelRef);
  const titleId = React.useId();

  if (!mounted || !open) return null;

  const enter =
    side === 'left'
      ? 'motion-safe:animate-[drawer-in-left_.26s_cubic-bezier(.22,1,.36,1)]'
      : 'motion-safe:animate-[drawer-in-right_.26s_cubic-bezier(.22,1,.36,1)]';

  return createPortal(
    <div className="fixed inset-0 z-50" style={{ ['--surface' as string]: 'var(--pearl)' }}>
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(58,54,49,.38)] motion-safe:animate-[page-rise_.2s_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : 'Navigation')}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex flex-col border-[var(--line)] bg-[var(--pearl)] outline-none',
          'shadow-[0_14px_34px_rgba(58,54,49,.18)]',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          widthClassName,
          enter,
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4">
          {title ? (
            <div id={titleId} className="voice text-lg text-[var(--ink)]">
              {title}
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full text-[var(--ink-soft)]',
              'hover:bg-[var(--cream)] hover:text-[var(--ink)] transition-colors motion-reduce:transition-none',
              focusRing,
            )}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
