'use client';
import * as React from 'react';
import { cn } from './cn';

type CloudTone = 'pearl' | 'gold' | 'sage' | 'clay';

export interface DreamCloudProps {
  /** Rendered inside the cloud belly. */
  children?: React.ReactNode;
  tone?: CloudTone;
  /** Cloud width in px (height derives from the 260×170 silhouette). */
  width?: number;
  /** Float animation duration (globals.css `.dream-float`; reduced-motion safe). */
  floatDuration?: string;
  /** Show the twinkle sparkles (also shown on hover via CSS). */
  spark?: boolean;
  className?: string;
}

const GRAD: Record<CloudTone, [string, string]> = {
  pearl: ['#FFFDF9', '#F1EBDD'],
  gold: ['#FCF4E0', '#EEDFBB'],
  sage: ['#F2F6ED', '#DBE5D1'],
  clay: ['#FBEAE1', '#EFCBBA'],
};

let cloudSeq = 0;

/**
 * The Dream cloud motif — a soft SVG cloud that gently floats (honoring
 * prefers-reduced-motion via the global `.dream-float` guard) with optional
 * content nested in its belly. Decorative; marked aria-hidden on the art layer.
 */
export function DreamCloud({
  children,
  tone = 'pearl',
  width = 260,
  floatDuration = '9s',
  spark = false,
  className,
}: DreamCloudProps) {
  const uid = React.useMemo(() => ++cloudSeq, []);
  const gid = `mp-cloud-${uid}`;
  const fid = `mp-cloudshadow-${uid}`;
  const h = Math.round((width * 170) / 260);
  const [c0, c1] = GRAD[tone];

  return (
    <span
      className={cn('dream-float dream-cloud relative block', className)}
      data-spark={spark ? 'true' : undefined}
      style={{ width, height: h, ['--fd' as string]: floatDuration }}
    >
      <svg
        viewBox="0 0 260 170"
        width={width}
        height={h}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c0} />
            <stop offset="1" stopColor={c1} />
          </linearGradient>
          <filter id={fid} x="-40%" y="-40%" width="180%" height="190%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#3A3631" floodOpacity="0.16" />
          </filter>
        </defs>
        <g fill={`url(#${gid})`} filter={`url(#${fid})`}>
          <rect x="24" y="106" width="212" height="40" rx="20" />
          <circle cx="60" cy="106" r="34" /><circle cx="96" cy="82" r="41" /><circle cx="138" cy="64" r="47" />
          <circle cx="184" cy="80" r="41" /><circle cx="216" cy="106" r="30" /><circle cx="120" cy="102" r="45" />
          <circle cx="172" cy="106" r="41" /><circle cx="80" cy="115" r="30" /><circle cx="202" cy="118" r="26" />
        </g>
        <g className="cloud-spark" fill="#C6A44E">
          <path d="M212 44 l1.4 3.8 3.8 1.4 -3.8 1.4 -1.4 3.8 -1.4 -3.8 -3.8 -1.4 3.8 -1.4 Z" />
          <path d="M44 62 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1 Z" />
        </g>
      </svg>
      {children != null && (
        <span
          className="absolute flex flex-col items-center justify-center text-center"
          style={{ top: '34%', left: '13%', right: '13%', bottom: '15%' }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
