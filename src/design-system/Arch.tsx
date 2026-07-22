'use client';
import * as React from 'react';
import { cn } from './cn';

type Tone = 'line' | 'gold' | 'sage' | 'clay';

export interface ArchProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Arch outline color. */
  tone?: Tone;
  /** Stroke weight in px. */
  weight?: number;
  children?: React.ReactNode;
}

const STROKE: Record<Tone, string> = {
  line: '#D8C7A6',
  gold: 'var(--gold)',
  sage: 'var(--sage)',
  clay: 'var(--clay)',
};

/**
 * The manuscript "arch" motif — a rounded-top frame used to enshrine a moment
 * (a Compass sentence, a hero illustration, a section marker). Purely decorative:
 * the border is drawn with an SVG so content flows normally inside.
 */
export function Arch({ tone = 'line', weight = 1.5, className, children, style, ...rest }: ArchProps) {
  return (
    <div className={cn('relative', className)} style={style} {...rest}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 130"
        preserveAspectRatio="none"
      >
        {/* Rounded-top "arch": semicircle-ish crown into straight sides. */}
        <path
          d="M4 128 L4 55 Q4 4 50 4 Q96 4 96 55 L96 128"
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={weight}
          strokeLinecap="round"
          opacity={0.55}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
