'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { focusRing } from './tokens';
import { useOverlay, useMounted } from './useOverlay';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Hide the default close (X) button. */
  hideClose?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  hideClose = false,
  className,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const mounted = useMounted();
  useOverlay(open, onClose, panelRef);
  const titleId = React.useId();
  const descId = React.useId();

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ ['--surface' as string]: 'var(--pearl)' }}
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(58,54,49,.38)] motion-safe:animate-[page-rise_.2s_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg rounded-[16px] border border-[var(--line)] bg-[var(--pearl)]',
          'shadow-[0_14px_34px_rgba(58,54,49,.18)] outline-none',
          'motion-safe:animate-[page-rise_.28s_cubic-bezier(.22,1,.36,1)]',
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 p-5 pb-2">
            <div>
              {title && (
                <h2 id={titleId} className="voice text-2xl text-[var(--ink)]">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-[var(--ink-soft)]">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--ink-soft)]',
                  'hover:bg-[var(--cream)] hover:text-[var(--ink)] transition-colors motion-reduce:transition-none',
                  focusRing,
                )}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        )}
        {children && <div className="px-5 py-2 text-sm text-[var(--ink)]">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-5 pt-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
