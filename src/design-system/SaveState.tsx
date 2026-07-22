'use client';
import * as React from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import { cn } from './cn';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveStateProps {
  status: SyncStatus;
  /** Optional last-saved hint shown in the `saved` state (e.g. "just now"). */
  savedHint?: string;
  className?: string;
}

const LABEL: Record<SyncStatus, string> = {
  idle: 'All changes saved',
  saving: 'Saving…',
  saved: 'Saved',
  error: "Couldn't save — retrying",
};

/**
 * Save / sync indicator for the app shell (T3). Announces state changes to
 * assistive tech via aria-live=polite; spinner collapses under reduced-motion.
 */
export function SaveState({ status, savedHint, className }: SaveStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        status === 'error' ? 'text-[var(--clay-ink)]' : 'text-[var(--ink-soft)]',
        className,
      )}
    >
      {status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
      {status === 'saved' && <Check className="h-3.5 w-3.5 text-[var(--sage)]" aria-hidden />}
      {status === 'error' && <CloudOff className="h-3.5 w-3.5" aria-hidden />}
      <span>
        {LABEL[status]}
        {status === 'saved' && savedHint ? ` · ${savedHint}` : ''}
      </span>
    </div>
  );
}
