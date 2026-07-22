// The Missing Peace — design tokens (typed).
//
// These mirror the CSS custom properties declared in `app/globals.css` and the
// Tailwind mapping in `tailwind.config.ts`. Components reference tokens through
// Tailwind arbitrary values (`bg-[var(--pearl)]`) so there is a single source of
// truth in CSS; this file exists for (a) type-safe references in TS/JS, (b)
// documenting the intended palette + contrast pairings, and (c) the few places
// that need a literal (canvas illustrations, inline SVG fills, emails).
//
// CONTRAST (WCAG 2.1, sRGB), validated in-repo:
//   ink   on pearl/cream ....... 11.4 / 10.6  ✓ AA text (normal)
//   ink-soft on pearl .......... 4.50         ✓ AA text (normal, muted)
//   clay-ink on clay-bg ........ 5.38         ✓ AA text
//   ink on sage-bg / gold-bg ... ~10          ✓ AA text
//   white on clay .............. 3.58         ✓ AA large / UI only  (NOT normal text)
//   white on sage / gold ....... <3.0         ✗ do not use as text
// → Solid emphasis uses INK (pearl text). Accent emphasis uses the *-bg tonal
//   fills with dark (ink / clay-ink) text. Focus rings use INK (gold is <3:1 on
//   pearl and fails non-text UI contrast).

export const color = {
  pearl: 'var(--pearl)',      // #FCF9F3 raised surface
  cream: 'var(--cream)',      // #F6F1E8 page surface
  ink: 'var(--ink)',          // #3A3631 primary text / solid emphasis
  inkSoft: 'var(--ink-soft)', // #7A726A secondary text
  inkFaint: 'var(--ink-faint)', // #A99A86 tertiary / eyebrow
  line: 'var(--line)',        // #E5DCCD hairline borders
  gold: 'var(--gold)',        // #B8924A brand accent (decorative)
  goldBg: 'var(--gold-bg)',   // #F4ECDA tonal gold fill
  sage: 'var(--sage)',        // #8A9A80 aligned / success accent
  sageBg: 'var(--sage-bg)',   // #EDF0E9 tonal sage fill
  clay: 'var(--clay)',        // #BC7459 warm accent
  clayInk: 'var(--clay-ink)', // #8A4A33 clay text on tonal
  clayBg: 'var(--clay-bg)',   // #F3E2DB tonal clay fill (active-nav / danger tonal)
  blush: 'var(--blush)',      // #E7D2C8 soft decorative
  white: '#FFFDF9',           // warm white for text on solid ink
} as const;

// Raw hex — for canvas/SVG/email contexts that cannot resolve CSS vars.
export const hex = {
  pearl: '#FCF9F3', cream: '#F6F1E8', ink: '#3A3631', inkSoft: '#7A726A',
  inkFaint: '#A99A86', line: '#E5DCCD', gold: '#B8924A', goldBg: '#F4ECDA',
  sage: '#8A9A80', sageBg: '#EDF0E9', clay: '#BC7459', clayInk: '#8A4A33',
  clayBg: '#F3E2DB', blush: '#E7D2C8', white: '#FFFDF9',
} as const;

export const radius = {
  sm: '8px',
  md: '10px',
  card: '12px',   // --radius / borderRadius.card
  lg: '16px',     // borderRadius.xl2
  xl: '18px',     // workspace-sky panels
  pill: '9999px',
} as const;

// 4px base spacing scale.
export const space = {
  0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
} as const;

// Elevation — warm ink-tinted shadows (matches motion-lift in globals.css).
export const elevation = {
  none: 'none',
  sm: '0 1px 2px rgba(58,54,49,.06)',
  md: '0 8px 24px rgba(58,54,49,.07)',
  lg: '0 14px 34px rgba(58,54,49,.08)',
} as const;

// Motion — durations + easings match the keyframes in globals.css. Every
// consumer must degrade under `prefers-reduced-motion` (Tailwind `motion-reduce:`
// or the global reset already in globals.css).
export const motion = {
  fast: '.16s',
  base: '.22s',
  slow: '.48s',
  ease: 'cubic-bezier(.22,1,.36,1)',
} as const;

// Type scale — Inter (--font-sans) for UI, Cormorant Garamond (--font-voice,
// `.voice`) for display/serif "voice" moments.
export const typeScale = {
  eyebrow: 'text-[10px] uppercase tracking-[0.15em]',
  caption: 'text-xs',
  body: 'text-sm',
  bodyLg: 'text-base',
  title: 'text-lg',
  display: 'voice text-2xl',
  displayLg: 'voice text-4xl',
} as const;

// The shared focus treatment. INK ring (guaranteed >=3:1 on every surface);
// offset in the surface color for separation. Used by every interactive primitive.
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface,var(--cream))]';

export type ColorToken = keyof typeof color;
export type RadiusToken = keyof typeof radius;
