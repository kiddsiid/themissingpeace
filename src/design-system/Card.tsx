'use client';
import * as React from 'react';
import { cn } from './cn';
import { focusRing } from './tokens';

type Elevation = 'flat' | 'raised' | 'lifted';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  /** When set, the whole card becomes a keyboard-focusable button. */
  interactive?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
}

const ELEV: Record<Elevation, string> = {
  flat: 'shadow-none',
  raised: 'shadow-[0_1px_2px_rgba(58,54,49,.06)]',
  lifted: 'shadow-[0_8px_24px_rgba(58,54,49,.07)]',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevation = 'raised', interactive = false, as = 'div', className, children, ...rest },
  ref,
) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      ref={ref}
      // `--surface` lets focus-ring offset + nested tokens resolve to the card fill.
      style={{ ['--surface' as string]: 'var(--pearl)' }}
      className={cn(
        'rounded-[12px] border border-[var(--line)] bg-[var(--pearl)]',
        ELEV[elevation],
        interactive &&
          'cursor-pointer transition-[transform,box-shadow] duration-[.22s] ease-out ' +
            'hover:-translate-y-[3px] hover:shadow-[0_14px_34px_rgba(58,54,49,.08)] ' +
            'active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ' +
            focusRing,
        className,
      )}
      {...(interactive ? { tabIndex: 0, role: 'button' } : {})}
      {...rest}
    >
      {children}
    </Comp>
  );
});

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-3 p-4 pb-2', className)} {...rest} />;
}
export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('voice text-lg text-[var(--ink)]', className)} {...rest} />;
}
export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-2 text-sm text-[var(--ink-soft)]', className)} {...rest} />;
}
export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 border-t border-[var(--line)] p-4', className)} {...rest} />;
}
