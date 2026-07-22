'use client';
import * as React from 'react';
import { cn } from './cn';

// Shared control chrome for Input / Textarea. Focus uses an ink ring (AA UI
// contrast on every surface); invalid state swaps border + ring to clay.
const controlBase =
  'w-full rounded-[10px] border bg-[var(--pearl)] px-3 text-sm text-[var(--ink)] ' +
  'placeholder:text-[var(--ink-faint)] transition-colors duration-[.16s] ' +
  'motion-reduce:transition-none outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface,var(--cream))] ' +
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-[var(--cream)]';
const controlOk =
  'border-[var(--line)] hover:border-[var(--ink-faint)] focus-visible:ring-[var(--ink)] focus-visible:border-[var(--ink)]';
const controlBad =
  'border-[var(--clay)] focus-visible:ring-[var(--clay-ink)] focus-visible:border-[var(--clay-ink)]';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-10', invalid ? controlBad : controlOk, className)}
      {...rest}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'min-h-[92px] py-2 leading-relaxed', invalid ? controlBad : controlOk, className)}
      {...rest}
    />
  );
});

export function Label({ className, children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1 block text-xs font-medium text-[var(--ink)]', className)} {...rest}>
      {children}
    </label>
  );
}

let fieldSeq = 0;
export interface FieldProps {
  label?: React.ReactNode;
  /** Help text shown below the control (hidden when an error is present). */
  hint?: React.ReactNode;
  /** Error message; sets the control invalid and is announced to AT. */
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Render-prop receives the wiring to spread onto the control. */
  children: (props: {
    id: string;
    invalid: boolean;
    'aria-describedby'?: string;
    required?: boolean;
  }) => React.ReactNode;
}

/**
 * Accessible field wrapper: associates label + help/error with the control via
 * ids and aria-describedby, and drives the control's invalid state.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = React.useMemo(() => `mp-field-${++fieldSeq}`, []);
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = errId ?? hintId;
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-[var(--clay-ink)]" aria-hidden>*</span>}
        </Label>
      )}
      {children({ id, invalid: !!error, 'aria-describedby': describedBy, required })}
      {error ? (
        <p id={errId} role="alert" className="mt-1 text-xs text-[var(--clay-ink)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-[var(--ink-soft)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
