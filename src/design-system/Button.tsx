'use client';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';
import { focusRing } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'clay' | 'sage' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, sets aria-busy, and blocks interaction without layout shift. */
  isLoading?: boolean;
  /** Icon element rendered before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon element rendered after the label. */
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// AA-validated pairings (see tokens.ts). Solid emphasis = ink + warm-white text
// (11:1). Accents use tonal *-bg fills with dark text (5–10:1). White-on-clay is
// AA-large only, so `clay`/`danger` use the tonal treatment for normal-size labels.
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--ink)] text-[var(--pearl)] border border-transparent ' +
    'hover:bg-[#2e2a26] active:bg-[#26221f]',
  secondary:
    'bg-[var(--pearl)] text-[var(--ink)] border border-[var(--line)] ' +
    'hover:bg-[var(--cream)] active:bg-[#efe7d9]',
  ghost:
    'bg-transparent text-[var(--ink-soft)] border border-transparent ' +
    'hover:bg-[var(--cream)] hover:text-[var(--ink)] active:bg-[#efe7d9]',
  clay:
    'bg-[var(--clay-bg)] text-[var(--clay-ink)] border border-transparent ' +
    'hover:bg-[#eed7cd] active:bg-[#e6c9bc]',
  sage:
    'bg-[var(--sage-bg)] text-[var(--ink)] border border-transparent ' +
    'hover:bg-[#e2e8dc] active:bg-[#d6dece]',
  gold:
    'bg-[var(--gold-bg)] text-[var(--ink)] border border-transparent ' +
    'hover:bg-[#efe4cb] active:bg-[#e8d9ba]',
  danger:
    'bg-[var(--clay-bg)] text-[var(--clay-ink)] border border-[#e0b6a6] ' +
    'hover:bg-[#eed7cd] active:bg-[#e6c9bc]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[8px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-[12px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      data-loading={isLoading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-medium',
        'transition-colors duration-[.16s] ease-out motion-reduce:transition-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        focusRing,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isLoading && (
        <Loader2
          aria-hidden
          className="absolute h-[1.15em] w-[1.15em] animate-spin motion-reduce:animate-none"
        />
      )}
      {/* Label hides (not unmounts) while loading so width never jumps. */}
      <span className={cn('inline-flex items-center gap-[inherit]', isLoading && 'invisible')}>
        {leadingIcon && <span className="shrink-0" aria-hidden>{leadingIcon}</span>}
        {children}
        {trailingIcon && <span className="shrink-0" aria-hidden>{trailingIcon}</span>}
      </span>
    </button>
  );
});
