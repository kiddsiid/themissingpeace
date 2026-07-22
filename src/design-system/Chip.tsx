'use client';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';
import { focusRing } from './tokens';

type Tone = 'neutral' | 'clay' | 'sage' | 'gold' | 'ink';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Renders a selected/active treatment (e.g. active filter). */
  selected?: boolean;
  /** Shows a remove affordance and calls onRemove; makes the chip a button group. */
  onRemove?: () => void;
  removeLabel?: string;
}

// All tonal pairings are AA text (see tokens.ts): clay-ink/clay-bg 5.4, ink on
// sage-bg/gold-bg ~10, ink on cream 10.6.
const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--cream)] text-[var(--ink)] border-[var(--line)]',
  clay: 'bg-[var(--clay-bg)] text-[var(--clay-ink)] border-transparent',
  sage: 'bg-[var(--sage-bg)] text-[var(--ink)] border-transparent',
  gold: 'bg-[var(--gold-bg)] text-[var(--ink)] border-transparent',
  ink: 'bg-[var(--ink)] text-[var(--pearl)] border-transparent',
};

export function Chip({
  tone = 'neutral',
  selected = false,
  onRemove,
  removeLabel = 'Remove',
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[9999px] border px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        selected && 'ring-1 ring-[var(--ink)] ring-offset-1 ring-offset-[var(--surface,var(--cream))]',
        className,
      )}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className={cn(
            '-mr-0.5 grid h-4 w-4 place-items-center rounded-full',
            'hover:bg-black/10 transition-colors motion-reduce:transition-none',
            focusRing,
          )}
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </span>
  );
}
