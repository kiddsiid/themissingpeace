// The Missing Peace — design-system primitive layer (Phase 1, T1).
//
// Token-driven, accessible primitives extracted from the app's existing brand
// (app/globals.css + tailwind.config.ts). Every interactive primitive ships:
// default / hover / focus-visible / active / disabled / loading states, an ink
// focus ring (AA UI contrast on every surface), and prefers-reduced-motion
// fallbacks. Color pairings are WCAG-AA validated (see tokens.ts).
//
// Adopt these where trivial; module restyles are intentionally out of scope for T1.

export * from './tokens';
export { cn } from './cn';

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card, CardHeader, CardTitle, CardBody, CardFooter } from './Card';
export type { CardProps } from './Card';

export { Field, Input, Textarea, Label } from './Field';
export type { FieldProps, InputProps, TextareaProps } from './Field';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { Dialog } from './Dialog';
export type { DialogProps } from './Dialog';

export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';

export { Arch } from './Arch';
export type { ArchProps } from './Arch';

export { DreamCloud } from './DreamCloud';
export type { DreamCloudProps } from './DreamCloud';

export { SaveState } from './SaveState';
export type { SaveStateProps, SyncStatus } from './SaveState';
