'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { tint, shade, readableInk } from '@/lib/canvas/color';
import { can } from '@/lib/auth/permissions';
import type { MemberRole } from '@/lib/types';
import type { CanvasContext, PaletteBoard, PaletteJourneyMoment } from '@/lib/canvas/types';
import { Button, Chip, Dialog } from '@/design-system';
import {
  derivePaletteRipple,
  type Palette,
  type Surface,
} from '@/lib/engine/atmosphere';
import { savePalette, saveLight, ripplePalette, saveSurfaceOverride } from './actions';

/* ------------------------------------------------------------------ */
/*  Static content (ported from the prototype)                         */
/* ------------------------------------------------------------------ */

const ATMOS = [
  'Warm', 'Candlelit', 'Earthy', 'Romantic', 'Airy', 'Lush', 'Editorial', 'Regal',
  'Coastal', 'Celestial', 'Modern', 'Old world', 'Whimsical', 'Minimal', 'Garden',
  'Dramatic', 'Soft', 'Joyful', 'Nostalgic', 'Sacred',
];

const PAL = [
  '#8A9A80', '#6E7257', '#B8924A', '#E7D2A6', '#BC7459', '#8A4A33',
  '#E7D2C8', '#C98BA0', '#7C93A6', '#3A3631', '#F1EBDD', '#D9B3B0',
];

const LIGHTS: { key: string; note: string }[] = [
  { key: 'Sunrise', note: 'soft, cool, hopeful' },
  { key: 'Golden hour', note: 'warm, forgiving, rich' },
  { key: 'Candlelight', note: 'intimate, amber, close' },
  { key: 'Starlight', note: 'deep, cool, dramatic' },
];

const LIGHT_NOTE: Record<string, string> = {
  Sunrise: 'Cool morning light keeps whites clean but can mute warm tones — lean on your accent to add warmth.',
  'Golden hour': 'The most forgiving light — warm tones glow and skin reads beautifully.',
  Candlelight: 'Amber and intimate; deep tones recede, so keep enough light on faces and food.',
  Starlight: 'Dramatic and cool; string lights and candles become the palette after dark.',
};

const ROLE_MEANING: Record<string, { mood: string; where: string }> = {
  Primary: { mood: 'The dominant feeling — the color guests read first.', where: 'ceremony, tablescape, website hero, florals' },
  Secondary: { mood: 'The warm counterweight that keeps it from feeling cold.', where: 'reception, attire accents, signage' },
  Accent: { mood: 'A soft romantic note used sparingly for lift.', where: 'florals, invitation flourish, ribbon' },
  Neutral: { mood: 'The quiet ground that lets the others breathe.', where: 'paper, linen, cake, backdrops' },
  Ink: { mood: 'The anchor that keeps type and photos legible.', where: 'menu text, invitation type, signage' },
};

const SURFACE_DEFS: { id: string; name: string }[] = [
  { id: 'invite', name: 'Invitation' },
  { id: 'website', name: 'Wedding website' },
  { id: 'tablescape', name: 'Tablescape' },
  { id: 'florals', name: 'Florals' },
  { id: 'cake', name: 'Wedding cake' },
  { id: 'menu', name: 'Menu card' },
  { id: 'ceremony', name: 'Ceremony setting' },
  { id: 'reception', name: 'Reception lighting' },
  { id: 'attire', name: 'Attire' },
  { id: 'notes', name: 'Peace Notes cover' },
];

const SURFACE_CAPTION: Record<string, string> = {
  invite: 'The first taste of the day guests hold in their hands — neutral paper, a metallic monogram, ink that stays legible.',
  website: 'The digital front door. The hero leans on your primary; the button uses the accent so the RSVP stands out.',
  tablescape: 'One long shared table. Runner in the primary, candlelight warming the accent, plates on the neutral.',
  florals: 'Blooms echo the accent and secondary so the flowers feel grown from the palette, not bolted on.',
  cake: 'Tiers in the neutral, a single bloom in the secondary — quiet until it is cut.',
  menu: 'Cards read cleanly: header in the primary, body in the ink, a hairline rule in the metallic.',
  ceremony: 'The arch frames the vows in the primary with greenery in the secondary at its feet.',
  reception: 'After dark the room leans on ink and candlelight — warm points of the accent floating over the floor.',
  attire: 'Attire context borrows the secondary and accent so the party reads as part of the same world.',
  notes: 'The private cover of your Peace Notes — an ink ground and a single metallic mark.',
};

const JOURNEY_DEFAULT: PaletteJourneyMoment[] = [
  { id: 'j0', moment: 'Getting ready', colors: ['#F1EBDD', '#E7D2C8', '#FBF7EF', '#8A9A80', '#3A3631'] },
  { id: 'j1', moment: 'Ceremony', colors: ['#F1EBDD', '#8A9A80', '#FBF7EF', '#E7D2C8', '#3A3631'] },
  { id: 'j2', moment: 'Cocktail hour', colors: ['#8A9A80', '#B8924A', '#BC7459', '#F1EBDD', '#3A3631'] },
  { id: 'j3', moment: 'Reception', colors: ['#3A3631', '#8A4A33', '#B8924A', '#E7D2C8', '#F1EBDD'] },
  { id: 'j4', moment: 'Afterparty', colors: ['#3A3631', '#BC7459', '#C98BA0', '#7C93A6', '#F1EBDD'] },
];

const JOURNEY_NOTES: Record<string, string> = {
  'Getting ready': 'soft morning light',
  Ceremony: 'natural & bright',
  'Cocktail hour': 'golden & warm',
  Reception: 'candlelit & deep',
  Afterparty: 'dark & playful',
};

const PRESETS: { name: string; note: string; colors: string[] }[] = [
  { name: 'Sage & Clay', note: 'the current world', colors: ['#8A9A80', '#BC7459', '#E7D2C8', '#F1EBDD', '#3A3631'] },
  { name: 'Golden Harvest', note: 'warmer, richer', colors: ['#B8924A', '#8A4A33', '#E7D2A6', '#F1EBDD', '#3A3631'] },
  { name: 'Dusk Garden', note: 'cooler, romantic', colors: ['#7C93A6', '#A1748F', '#E7D2C8', '#F1EBDD', '#3A3631'] },
];

const PRESENCE_COLORS = ['#BC7459', '#7C93A6', '#8A9A80'];
const RIPPLE_TARGETS = ['Invitation', 'Website', 'Tablescape', 'Florals', 'Menu & signage', 'Attire', 'Cake', 'Peace Notes'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Parse a "prop:val;prop:val" string into a React style object (verbatim
 *  porting of the prototype's inline styles). */
function sx(str: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of str.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const key = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!key) continue;
    out[key.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase())] = val;
  }
  return out as React.CSSProperties;
}

/** True when a color reads as "light" (dark text sits better on it). */
function isLight(hex: string): boolean {
  return readableInk(hex) === '#3A3631';
}

function buildLayers(id: string, c: string[]): { bg: string; layers: string[] } {
  const T = (h: string, a: number) => tint(h, a);
  const S = (h: string, a: number) => shade(h, a);
  const a = 'position:absolute;';
  switch (id) {
    case 'invite':
      return {
        bg: `linear-gradient(155deg,${T(c[3], 0.4)},${T(c[2], 0.6)})`,
        layers: [
          a + `inset:16px;background:${T(c[3], 0.82)};border:1px solid ${c[2]};border-radius:6px;box-shadow:0 8px 18px rgba(32,28,24,.12)`,
          a + `left:50%;top:30px;transform:translateX(-50%);width:40px;height:40px;border:2px solid ${c[0]};border-radius:50%`,
          a + `left:50%;top:52%;transform:translate(-50%,-50%);width:52%;height:8px;border-radius:4px;background:${c[4]}`,
          a + `left:50%;top:64%;transform:translate(-50%,-50%);width:34%;height:5px;border-radius:3px;background:${c[1]}`,
        ],
      };
    case 'website':
      return {
        bg: `${T(c[3], 0.45)}`,
        layers: [
          a + `left:0;right:0;top:0;height:56%;background:linear-gradient(150deg,${c[0]},${S(c[0], 0.2)})`,
          a + `left:14px;top:42%;width:58%;height:9px;border-radius:5px;background:${T(c[3], 0.85)}`,
          a + `left:14px;top:62%;width:74px;height:20px;border-radius:999px;background:${c[2]}`,
          a + `right:14px;bottom:14px;width:40px;height:40px;border-radius:8px;border:2px solid ${c[1]}`,
        ],
      };
    case 'tablescape':
      return {
        bg: `linear-gradient(180deg,${T(c[3], 0.55)},${T(c[3], 0.3)})`,
        layers: [
          a + `left:0;right:0;bottom:26px;height:34px;background:${c[0]}`,
          a + `left:50%;bottom:30px;transform:translateX(-50%);width:52px;height:52px;border-radius:50%;background:${T(c[3], 0.9)};border:3px solid ${c[2]}`,
          a + `left:24%;bottom:44px;width:5px;height:40px;border-radius:3px;background:${c[2]};box-shadow:0 0 12px ${c[2]}`,
          a + `right:24%;bottom:44px;width:5px;height:40px;border-radius:3px;background:${c[2]};box-shadow:0 0 12px ${c[2]}`,
        ],
      };
    case 'florals':
      return {
        bg: `${T(c[1], 0.62)}`,
        layers: [
          a + `left:26%;top:44%;width:44px;height:44px;border-radius:50%;background:${c[1]}`,
          a + `left:44%;top:28%;width:52px;height:52px;border-radius:50%;background:${T(c[2], 0.15)}`,
          a + `left:58%;top:50%;width:40px;height:40px;border-radius:50%;background:${T(c[0], 0.1)}`,
          a + `left:0;right:0;bottom:0;height:30px;background:${S(c[0], 0.1)}`,
        ],
      };
    case 'cake':
      return {
        bg: `linear-gradient(180deg,${T(c[2], 0.6)},${T(c[3], 0.4)})`,
        layers: [
          a + `left:50%;bottom:20px;transform:translateX(-50%);width:104px;height:34px;border-radius:6px;background:${T(c[3], 0.9)};border:1px solid ${c[2]}`,
          a + `left:50%;bottom:52px;transform:translateX(-50%);width:78px;height:30px;border-radius:6px;background:${T(c[3], 0.95)};border:1px solid ${c[2]}`,
          a + `left:50%;bottom:80px;transform:translateX(-50%);width:52px;height:26px;border-radius:6px;background:${T(c[3], 0.98)};border:1px solid ${c[2]}`,
          a + `left:50%;bottom:104px;transform:translateX(-50%);width:16px;height:16px;border-radius:50%;background:${c[1]}`,
        ],
      };
    case 'menu':
      return {
        bg: `${T(c[2], 0.55)}`,
        layers: [
          a + `inset:18px;background:${T(c[3], 0.9)};border:1px solid ${c[2]};border-radius:4px`,
          a + `left:50%;top:34px;transform:translateX(-50%);width:44px;height:6px;border-radius:3px;background:${c[0]}`,
          a + `left:30px;right:30px;top:56px;height:1px;background:${c[2]}`,
          a + `left:30px;right:44px;top:70px;height:4px;border-radius:2px;background:${T(c[4], 0.2)};box-shadow:0 12px 0 ${T(c[4], 0.35)},0 24px 0 ${T(c[4], 0.5)}`,
        ],
      };
    case 'ceremony':
      return {
        bg: `linear-gradient(180deg,${T(c[2], 0.5)},${T(c[3], 0.35)})`,
        layers: [
          a + `left:50%;bottom:0;transform:translateX(-50%);width:96px;height:120px;border:6px solid ${c[0]};border-bottom:none;border-radius:48px 48px 0 0`,
          a + `left:calc(50% - 60px);bottom:0;width:28px;height:40px;border-radius:50% 50% 0 0;background:${c[1]}`,
          a + `left:calc(50% + 32px);bottom:0;width:28px;height:40px;border-radius:50% 50% 0 0;background:${c[1]}`,
          a + `left:0;right:0;bottom:0;height:14px;background:${S(c[0], 0.15)}`,
        ],
      };
    case 'reception':
      return {
        bg: `radial-gradient(120% 90% at 50% 10%,${S(c[4], 0.1)},${S(c[4], 0.42)})`,
        layers: [
          a + `left:10%;top:24%;width:6px;height:6px;border-radius:50%;background:${c[2]};box-shadow:0 0 10px ${c[2]},22px 8px 0 ${c[2]},44px -4px 0 ${c[2]},66px 10px 0 ${c[2]},88px 2px 0 ${c[2]}`,
          a + `right:8%;top:32%;width:6px;height:6px;border-radius:50%;background:${c[2]};box-shadow:0 0 10px ${c[2]},-22px 8px 0 ${c[2]},-44px -2px 0 ${c[2]}`,
          a + `left:50%;bottom:14px;transform:translateX(-50%);width:70%;height:34px;border-radius:50%;background:radial-gradient(closest-side,${c[2]},transparent);opacity:.4`,
          a + `left:50%;bottom:18px;transform:translateX(-50%);width:44px;height:26px;border-radius:6px 6px 2px 2px;background:${T(c[1], 0.2)}`,
        ],
      };
    case 'attire':
      return {
        bg: `linear-gradient(180deg,${T(c[3], 0.55)},${T(c[3], 0.32)})`,
        layers: [
          a + `left:50%;top:22px;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;background:${T(c[1], 0.3)}`,
          a + `left:50%;top:42px;transform:translateX(-50%);width:64px;height:96px;background:${c[1]};clip-path:polygon(38% 0,62% 0,100% 100%,0 100%)`,
          a + `left:50%;top:52px;transform:translateX(-50%);width:8px;height:70px;background:${c[2]}`,
          a + `left:50%;bottom:8px;transform:translateX(-50%);width:74px;height:6px;border-radius:3px;background:${S(c[0], 0.1)}`,
        ],
      };
    case 'notes':
      return {
        bg: `linear-gradient(160deg,${S(c[4], 0.05)},${S(c[4], 0.35)})`,
        layers: [
          a + `inset:18px;border:1px solid ${T(c[2], 0.3)};border-radius:6px`,
          a + `left:50%;top:50%;transform:translate(-50%,-50%) rotate(45deg);width:20px;height:20px;background:${c[2]}`,
          a + `left:50%;bottom:28px;transform:translateX(-50%);width:56px;height:5px;border-radius:3px;background:${T(c[3], 0.5)}`,
        ],
      };
    default:
      return { bg: '#eee', layers: [] };
  }
}

/* ------------------------------------------------------------------ */
/*  Small view pieces                                                  */
/* ------------------------------------------------------------------ */

function Illustration({ layers }: { layers: string[] }) {
  return (
    <>
      {layers.map((ly, i) => (
        <div key={i} style={sx(ly)} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  palette: PaletteBoard;
  context: CanvasContext;
  workspaceRole: MemberRole;
  surfaces: Surface[];
}

type RippleToast = { kicker: string; title: string; modules: string[] } | null;

const SURFACE_ID: Record<string, string> = {
  invite: 'invitation',
  website: 'guest_experience',
  tablescape: 'tablescape',
  florals: 'florals',
  cake: 'cake',
  menu: 'menu_card',
  reception: 'lighting',
  attire: 'attire_context',
};

export function AtmosphereLab({ palette, context, workspaceRole, surfaces }: Props) {
  const canEdit = can(workspaceRole, 'plan.full');

  const roles = palette.roles.length ? palette.roles : ['Primary', 'Secondary', 'Accent', 'Neutral', 'Ink'];
  const seedColors = palette.colors.length >= 5 ? palette.colors.slice(0, 5) : ['#8A9A80', '#BC7459', '#E7D2C8', '#F1EBDD', '#3A3631'];

  // ---- state ----
  const [colors, setColors] = useState<string[]>(seedColors);
  const [name, setName] = useState(palette.name || 'Sage & Clay');
  const [atmosphere, setAtmosphere] = useState<string[]>(palette.atmosphere?.length ? palette.atmosphere : ['Warm', 'Candlelit', 'Earthy', 'Romantic']);
  const [intention, setIntention] = useState('A warm, candlelit world that feels like coming home.');
  const [light, setLightState] = useState(context.light || 'Golden hour');
  const season = context.season || 'Fall';

  const [selToken, setSelToken] = useState(0);
  const [layout, setLayout] = useState<'lab' | 'focus'>('lab');
  const [activeSurface, setActiveSurface] = useState('tablescape');
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => Object.fromEntries(
    Object.entries(SURFACE_ID)
      .filter(([, storedId]) => surfaces.some((surface) => surface.surface === storedId && surface.override))
      .map(([uiId]) => [uiId, true]),
  ));
  const [rippled, setRippled] = useState(!!context.weddingPalette && context.weddingPalette === (palette.name || 'Sage & Clay'));

  const [panelOpen, setPanelOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'palette' | 'preview' | 'insights'>('preview');
  const [ripple, setRipple] = useState<RippleToast>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [vw, setVw] = useState(1440);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- persistence ----
  const nameRef = useRef(name);
  nameRef.current = name;
  const run = (fn: () => Promise<unknown>) => {
    if (!canEdit) return;
    startTransition(() => {
      void fn().catch(() => {
        /* keep local state; a failed save simply isn't persisted */
      });
    });
  };

  // ---- derived ----
  const journey = useMemo(() => {
    const stored = palette.journey ?? [];
    const out: PaletteJourneyMoment[] = [];
    const seen: Record<string, boolean> = {};
    for (const def of JOURNEY_DEFAULT) {
      const match = stored.find((x) => x.moment === def.moment);
      out.push(match ? { ...def, colors: match.colors.slice(0, 5) } : def);
      seen[def.moment] = true;
    }
    for (const x of stored) {
      if (!seen[x.moment]) out.push({ id: x.id || `j${out.length}`, moment: x.moment, colors: x.colors.slice(0, 5) });
    }
    return out;
  }, [palette.journey]);

  const mob = vw < 860;
  const narrow = vw < 1240;
  const focus = layout === 'focus' && !mob;
  const panelInline = !narrow && !mob;
  const panelIsOverlay = narrow && !mob;

  const c = colors;
  const nextPalette: Palette = {
    primary: c[0],
    secondary: c[1],
    accent: c[2],
    neutrals: [c[3], c[4]],
  };
  const previewSurfaces = surfaces.map((surface) => {
    const uiId = Object.entries(SURFACE_ID).find(([, storedId]) => storedId === surface.surface)?.[0];
    return uiId ? { ...surface, override: !!overrides[uiId] } : surface;
  });
  const previewUpdates = derivePaletteRipple(nextPalette, previewSurfaces);
  const moodSummary = atmosphere.slice(0, 3).join(' · ') || 'Choose a feeling';

  const oList = Object.keys(overrides).filter((k) => overrides[k]);
  const alignedN = SURFACE_DEFS.length - oList.length;
  const alignedPctN = Math.round((alignedN / SURFACE_DEFS.length) * 100);
  const ringPct = rippled ? alignedPctN : 35;
  const alignedPct = `${ringPct}%`;
  const alignLabel = rippled ? (oList.length === 0 ? 'Fully aligned' : 'Aligned, with intent') : 'Draft — not yet rippled';
  const alignSummary = rippled
    ? oList.length === 0
      ? 'Every surface reads from one palette. The world feels like a single, intentional place.'
      : 'Most surfaces share one palette; a few are intentionally different, and that is recorded below.'
    : 'You have unsaved palette changes. Ripple through the world to apply them across every surface.';

  const selRole = roles[selToken] || 'Color';
  const selHex = c[selToken];
  const rm = ROLE_MEANING[selRole] || { mood: 'A color in your palette.', where: 'the wedding world' };

  // ---- handlers ----
  const toggleAtmo = (w: string) => {
    const next = atmosphere.includes(w) ? atmosphere.filter((x) => x !== w) : [...atmosphere, w];
    setAtmosphere(next);
    run(() => savePalette({ atmosphere: next }));
  };
  const pickColor = (hex: string) => {
    const next = colors.slice();
    next[selToken] = hex;
    setColors(next);
    setRippled(false);
    run(() => savePalette({ colors: next }));
  };
  const setLight = (k: string) => {
    setLightState(k);
    run(() => saveLight(k));
  };
  const applyPreset = (presetColors: string[], presetName?: string) => {
    const next = presetColors.slice(0, 5);
    setColors(next);
    setRippled(false);
    if (presetName) setName(presetName);
    run(() => savePalette({ colors: next, name: presetName ?? nameRef.current }));
  };
  const commitName = () => {
    run(() => savePalette({ name: nameRef.current }));
  };
  const toggleOverride = (id: string) => {
    const nextValue = !overrides[id];
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
    const storedId = SURFACE_ID[id];
    if (storedId) run(() => saveSurfaceOverride(storedId, nextValue, colorsForSurface(id)[0]));
  };
  const focusSurfaceId = (id: string) => {
    setActiveSurface(id);
    if (!mob) setLayout('focus');
  };
  const doRipple = () => {
    setPreviewOpen(true);
  };
  const applyRipple = () => {
    setPreviewOpen(false);
    setRippled(true);
    run(() => ripplePalette({ colors, name, atmosphere }));
    setRipple({
      kicker: 'Rippling through the world',
      title: `“${name}” is now applied across the day`,
      modules: ['Invitation & website', 'Tablescape & florals', 'Menu & signage', 'Attire palette', 'Peace Notes cover'],
    });
  };

  const colorsForSurface = (id: string) => (overrides[id] ? [c[2], c[0], c[1], c[3], c[4]] : c);

  // ---- intelligence ----
  const intelligence: string[] = [];
  intelligence.push(
    `${roles[0]} carries the ${atmosphere.includes('Earthy') ? 'calm, natural' : 'chosen'} quality of your Compass, while ${String(roles[1]).toLowerCase()} adds warmth to the reception without competing with the candlelight.`,
  );
  if (isLight(c[4])) intelligence.push('Your ink tone is fairly light — a deep espresso or charcoal would keep the menu and invitation legible in photos.');
  else intelligence.push('Your ink tone is dark enough to keep type and portraits crisp.');
  if (atmosphere.length >= 5) intelligence.push('You have chosen many feeling words — leaning into two or three will make the world read as more intentional.');
  if (light === 'Candlelight' || atmosphere.includes('Candlelit')) intelligence.push('Warm, candlelit tones photograph richest at golden hour — ask your planner about warm string lighting indoors.');
  if (oList.length) intelligence.push(`${oList.length} surface${oList.length > 1 ? 's are' : ' is'} intentionally off-palette. That is recorded so the world can stay coherent everywhere else.`);

  const overrideList = oList.map((k) => SURFACE_DEFS.find((s) => s.id === k)?.name).filter(Boolean).join(', ');

  let nextAction: { title: string; why: string; cta: string; onClick: () => void };
  if (!rippled) {
    nextAction = {
      title: 'Ripple your palette through the world',
      why: 'You have palette changes that only live here so far. Rippling applies them to invitation, website, tablescape, florals, menu, attire, and the Peace Notes cover.',
      cta: 'Ripple now',
      onClick: doRipple,
    };
  } else if (isLight(c[4])) {
    nextAction = {
      title: 'Anchor the palette with a darker ink',
      why: 'A deeper charcoal or espresso will keep your menu and invitation legible and give photographs a grounding tone.',
      cta: 'Recolor Ink',
      onClick: () => setSelToken(4),
    };
  } else if (atmosphere.length < 2) {
    nextAction = {
      title: 'Choose a second feeling word',
      why: 'One feeling word reads thin. A pair — like warm and candlelit — gives the world a clearer emotional direction.',
      cta: 'Pick a feeling',
      onClick: () => { if (mob) setMobilePane('palette'); },
    };
  } else {
    nextAction = {
      title: 'Preview the reception after dark',
      why: 'Your palette shifts most dramatically under candlelight. Check the reception surface to make sure it still feels like you at night.',
      cta: 'Open reception',
      onClick: () => focusSurfaceId('reception'),
    };
  }

  // ---- layout flags ----
  const showLabHeader = mob ? mobilePane === 'preview' : true;
  const showLeft = mob ? mobilePane === 'palette' : true;
  const showCenter = mob ? mobilePane === 'preview' : true;
  const showPanel = mob ? mobilePane === 'insights' : panelInline || panelOpen;
  const showInsightsFab = panelIsOverlay && !panelOpen && !mob;
  const gridCols = mob ? '1fr' : 'repeat(auto-fill,minmax(210px,1fr))';

  const scrollCol: React.CSSProperties = { minHeight: 0, overflowY: 'auto' };
  let workspaceStyle: React.CSSProperties;
  let leftStyle: React.CSSProperties;
  let centerStyle: React.CSSProperties;
  let panelStyle: React.CSSProperties;
  if (mob) {
    workspaceStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
    leftStyle = { ...scrollCol, flex: 1, background: '#F7F4EE', padding: '16px 14px 90px' };
    centerStyle = { ...scrollCol, flex: 1, background: '#F7F4EE', padding: '14px 14px 90px' };
    panelStyle = { ...scrollCol, flex: 1, background: '#F7F4EE', padding: '16px 14px 90px' };
  } else {
    const cols = focus ? '300px minmax(0,1fr)' : narrow ? '300px minmax(0,1fr)' : '300px minmax(0,1fr) 340px';
    workspaceStyle = { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: cols, background: 'rgba(32,28,24,0.10)', gap: 1 };
    leftStyle = { ...scrollCol, background: '#FBF8F2', padding: '16px 15px' };
    centerStyle = { ...scrollCol, background: '#F7F4EE', padding: '22px clamp(18px,2.5vw,34px) 40px' };
    panelStyle = panelInline
      ? { ...scrollCol, background: '#FBF8F2', padding: '18px 16px' }
      : { position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px,92vw)', zIndex: 45, ...scrollCol, background: '#FBF8F2', boxShadow: '-16px 0 50px rgba(32,28,24,0.22)', padding: '18px 16px' };
  }

  const presence = context.approverRoles.slice(0, 3);
  const setupChips = [
    { k: 'Palette', v: name },
    { k: 'Season', v: season },
    { k: 'Light', v: light },
    { k: 'Feeling', v: atmosphere[0] || '—' },
  ];
  const compassRows = [
    { k: 'Feeling', v: moodSummary, color: 'var(--ink)' },
    { k: 'Light', v: light, color: 'var(--clay-ink)' },
    { k: 'Alignment', v: alignLabel, color: rippled ? 'var(--sage)' : 'var(--clay-ink)' },
  ];

  const fbl = buildLayers(activeSurface, colorsForSurface(activeSurface));
  const fdef = SURFACE_DEFS.find((s) => s.id === activeSurface) || SURFACE_DEFS[0];
  const fov = !!overrides[activeSurface];

  /* ------------------------------------------------------------------ */
  return (
    <div
      className="-mx-6 -my-6 flex min-h-screen flex-col md:-mx-10"
      style={{ height: '100vh', overflow: 'hidden', background: '#F7F4EE', color: 'var(--ink)' }}
    >
      <style>{`
        @keyframes atmo-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes atmo-sheet{from{opacity:0;transform:translateX(-50%) translateY(24px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .atmo-surface{transition:transform .22s cubic-bezier(.34,1.4,.64,1),box-shadow .22s ease,border-color .22s ease}
        .atmo-surface:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(32,28,24,0.12)}
        .atmo-swatch{transition:transform .2s cubic-bezier(.34,1.5,.64,1),box-shadow .2s ease,background .55s ease}
        .atmo-swatch:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(32,28,24,0.16)}
        .atmo-canvas *{transition:background .55s ease,border-color .55s ease,box-shadow .55s ease}
        @media(prefers-reduced-motion:reduce){.atmo-surface,.atmo-swatch{transition:none}.atmo-surface:hover,.atmo-swatch:hover{transform:none}.atmo-sheet{animation:none!important}}
      `}</style>

      {/* GLOBAL HEADER */}
      <header style={sx('height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:#FFFDFC;border-bottom:1px solid rgba(32,28,24,0.14);gap:16px;z-index:20')}>
        <div style={sx('display:flex;align-items:center;gap:16px;min-width:0')}>
          <Link href="/peace-center" className="voice" style={sx('font-size:22px;font-weight:600;color:var(--ink);white-space:nowrap;text-decoration:none')}>The Missing Peace</Link>
          <div style={sx('width:1px;height:22px;background:rgba(32,28,24,0.14)')} />
          <div style={sx('display:flex;flex-direction:column;line-height:1.1;min-width:0')}>
            <span style={sx('font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{context.projectName}</span>
            <span style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold)')}>The Atmosphere Lab</span>
          </div>
        </div>
        <div style={sx('display:flex;align-items:center;gap:14px')}>
          <div style={sx('display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--sage);background:var(--sage-bg);border:1px solid rgba(138,154,128,0.4);border-radius:999px;padding:5px 12px;white-space:nowrap')}>
            <span style={sx('width:7px;height:7px;border-radius:50%;background:var(--sage);display:inline-block')} />
            {isSaving ? 'Saving…' : 'Saved'}
          </div>
          <div style={sx('display:flex;align-items:center')}>
            {presence.map((role, i) => (
              <div
                key={role}
                title={role}
                style={{ width: 30, height: 30, borderRadius: '50%', background: PRESENCE_COLORS[i % PRESENCE_COLORS.length], color: '#FFFDFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '2px solid #FFFDFC', marginLeft: i ? -8 : 0 }}
              >
                {role.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CONTEXTUAL BAR */}
      <div style={sx('flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 22px;background:#FBF8F2;border-bottom:1px solid rgba(32,28,24,0.14);z-index:15')}>
        <div style={sx('display:flex;align-items:center;gap:10px;min-width:0')}>
          <span className="voice" style={sx('font-size:18px;font-weight:600;color:var(--ink);white-space:nowrap')}>Atmosphere Lab</span>
          <span style={sx('font-size:11px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>· {name} · {moodSummary}</span>
        </div>
        <div style={sx('display:flex;align-items:center;gap:10px')}>
          {!mob && (
            <div style={sx('display:flex;align-items:center;gap:2px;background:#F1EADD;border:1px solid rgba(32,28,24,0.10);border-radius:10px;padding:3px')}>
              {([
                { id: 'lab' as const, label: 'All surfaces', hint: 'The whole world at once' },
                { id: 'focus' as const, label: 'Focus', hint: 'One surface, large' },
              ]).map((t) => {
                const on = layout === t.id || (t.id === 'lab' && layout !== 'focus');
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.hint}
                    onClick={() => { setLayout(t.id); setPanelOpen(false); }}
                    style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--ink-soft)', background: on ? '#FFFDFC' : 'transparent', boxShadow: on ? '0 1px 3px rgba(32,28,24,0.12)' : 'none' }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={doRipple}
            style={sx('display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:#FFFDFC;background:var(--clay);border:1px solid var(--clay-ink);border-radius:10px;padding:8px 14px;cursor:pointer;white-space:nowrap')}
          >
            Ripple through the world · {alignedPct}
          </button>
        </div>
      </div>

      {/* COMPACT LAB HEADER */}
      {showLabHeader && (
        <div style={sx('flex-shrink:0;display:flex;gap:20px;align-items:stretch;padding:16px 22px;background:linear-gradient(180deg,#FBF6EC 0%,#F7F4EE 100%);border-bottom:1px solid rgba(32,28,24,0.14)')}>
          <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:8px')}>
            <div style={sx('font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:var(--gold)')}>Turn the Compass into a feeling</div>
            <div className="voice" style={sx('font-size:clamp(24px,3.4vw,34px);font-weight:600;line-height:1.02;color:var(--ink)')}>Design the feeling before anyone says a word.</div>
            <div style={sx('display:flex;gap:8px;align-items:center;margin-top:2px;max-width:560px')}>
              <span className="voice" style={sx('font-style:italic;font-size:16px;color:var(--ink-soft);flex-shrink:0')}>Intention</span>
              <input
                className="voice"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                aria-label="Atmosphere intention"
                style={sx('flex:1;min-width:0;font-style:italic;font-size:16px;color:var(--ink);background:transparent;border:none;border-bottom:1px solid rgba(32,28,24,0.20);padding:3px 2px;outline:none')}
              />
            </div>
            <div style={sx('display:flex;flex-wrap:wrap;gap:7px;margin-top:6px')}>
              {setupChips.map((chip) => (
                <div key={chip.k} style={sx('display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink);background:#FFFDFC;border:1px solid rgba(32,28,24,0.14);border-radius:999px;padding:5px 11px')}>
                  <span style={sx('font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:var(--gold)')}>{chip.k}</span>
                  <span style={{ fontWeight: 600 }}>{chip.v}</span>
                </div>
              ))}
            </div>
          </div>

          {!mob && (
            <div style={sx('width:300px;flex-shrink:0;background:#FFFDFC;border:1px solid rgba(32,28,24,0.14);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:2px')}>
              <div style={sx('font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold);margin-bottom:8px')}>The palette, at a glance</div>
              <div style={sx('display:flex;gap:6px;height:44px;margin-bottom:10px')}>
                {c.map((hex, i) => (
                  <div key={i} title={`${roles[i]} · ${hex}`} style={{ flex: 1, borderRadius: 7, background: hex, boxShadow: 'inset 0 0 0 1px rgba(32,28,24,.08)' }} />
                ))}
              </div>
              {compassRows.map((r) => (
                <div key={r.k} style={sx('display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid rgba(32,28,24,0.08)')}>
                  <span style={sx('font-size:12px;color:var(--ink-soft)')}>{r.k}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: r.color, textAlign: 'right' }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKSPACE */}
      <div style={workspaceStyle}>
        {/* LEFT · PALETTE CONSOLE */}
        {showLeft && (
          <aside style={leftStyle}>
            <div style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px')}>What should the world feel like?</div>
            <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px')}>
              {ATMOS.map((w) => {
                const on = atmosphere.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleAtmo(w)}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? 'var(--gold)' : 'rgba(32,28,24,0.16)'}`, background: on ? 'var(--gold-bg)' : '#FFFDFC', color: on ? 'var(--clay-ink)' : 'var(--ink-soft)', fontWeight: on ? 600 : 500 }}
                  >
                    {w}
                  </button>
                );
              })}
            </div>

            <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:10px')}>
              <div style={sx('font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold)')}>Palette roles</div>
              <input
                className="voice"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                aria-label="Palette name"
                style={sx('font-size:15px;font-weight:600;color:var(--ink);background:transparent;border:none;border-bottom:1px solid rgba(32,28,24,0.16);padding:1px 2px;outline:none;width:120px;text-align:right')}
              />
            </div>
            <div style={sx('display:flex;gap:6px;height:78px;margin-bottom:10px')}>
              {c.map((hex, i) => {
                const on = selToken === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className="atmo-swatch"
                    onClick={() => setSelToken(i)}
                    aria-label={`${roles[i]} ${hex}`}
                    style={{ flex: 1, borderRadius: 10, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '7px 3px', background: hex, border: `2px solid ${on ? 'var(--ink)' : 'rgba(32,28,24,0.12)'}`, boxShadow: on ? '0 6px 16px rgba(32,28,24,0.18)' : 'none' }}
                  >
                    <span style={{ fontSize: 8.5, letterSpacing: '.4px', textTransform: 'uppercase', fontWeight: 600, color: isLight(hex) ? 'rgba(32,28,24,.7)' : 'rgba(255,255,255,.9)' }}>{roles[i] || ''}</span>
                  </button>
                );
              })}
            </div>

            <div style={sx('background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:11px;padding:11px 12px;margin-bottom:10px')}>
              <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:6px')}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: selHex, boxShadow: 'inset 0 0 0 1px rgba(32,28,24,.12)' }} />
                <span className="voice" style={sx('font-size:17px;font-weight:600;color:var(--ink)')}>{selRole}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'var(--ink-soft)', marginLeft: 'auto' }}>{selHex}</span>
              </div>
              <div style={sx('font-size:11.5px;color:var(--ink);line-height:1.45')}>{rm.mood}</div>
              <div style={sx('font-size:10.5px;color:var(--ink-faint);line-height:1.4;margin-top:4px')}>Appears in {rm.where}</div>
            </div>

            <div style={sx('font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-faint);margin-bottom:7px')}>Recolor {selRole} — tap a tone</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginBottom: 20 }}>
              {PAL.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => pickColor(hex)}
                  aria-label={hex}
                  style={{ aspectRatio: '1', borderRadius: 8, cursor: 'pointer', background: hex, border: `2px solid ${c[selToken] === hex ? 'var(--ink)' : 'rgba(32,28,24,0.10)'}` }}
                />
              ))}
            </div>

            <div style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px')}>Light direction</div>
            <div style={sx('display:flex;flex-direction:column;gap:6px;margin-bottom:20px')}>
              {LIGHTS.map((l) => {
                const on = light === l.key;
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setLight(l.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, fontWeight: on ? 600 : 500, color: 'var(--ink)', background: on ? '#FBF6EC' : '#FFFDFC', border: `1px solid ${on ? '#E4D3AC' : 'rgba(32,28,24,0.14)'}`, borderRadius: 10, padding: '9px 11px', cursor: 'pointer' }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: on ? 'var(--gold)' : 'rgba(32,28,24,0.2)' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{l.key}</span>
                    <span style={sx('font-size:11px;color:var(--ink-faint)')}>{l.note}</span>
                  </button>
                );
              })}
            </div>

            <div style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px')}>Palette moments</div>
            <div style={sx('display:flex;flex-direction:column;gap:7px')}>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p.colors, p.name)}
                  style={sx('display:flex;align-items:center;gap:9px;background:#FFFDFC;border:1px solid rgba(32,28,24,0.14);border-radius:11px;padding:8px 10px;cursor:pointer;text-align:left')}
                >
                  <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {p.colors.map((h, i) => (
                      <span key={i} style={{ width: 12, height: 24, borderRadius: 3, background: h }} />
                    ))}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={sx('display:block;font-size:12px;font-weight:600;color:var(--ink)')}>{p.name}</span>
                    <span style={sx('font-size:10.5px;color:var(--ink-soft)')}>{p.note}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* CENTER · LIVING DAY PREVIEW */}
        {showCenter && (
          <main style={centerStyle}>
            {focus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto' }}>
                <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px')}>
                  <div>
                    <div style={sx('font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold)')}>Now previewing</div>
                    <div className="voice" style={sx('font-size:26px;font-weight:600;color:var(--ink)')}>{fdef.name}</div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: fov ? 'var(--clay-ink)' : 'var(--sage)', background: fov ? 'var(--gold-bg)' : 'var(--sage-bg)', borderRadius: 999, padding: '4px 11px' }}>
                    {fov ? 'Off-palette · intentional' : 'On palette'}
                  </span>
                </div>
                <div className="atmo-canvas" style={{ position: 'relative', height: 'min(46vh,360px)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(32,28,24,0.12)', background: fbl.bg }}>
                  <Illustration layers={fbl.layers} />
                </div>
                <div style={sx('font-size:13px;color:var(--ink);line-height:1.55')}>{SURFACE_CAPTION[activeSurface] || ''}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => toggleOverride(activeSurface)}
                    style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer', borderRadius: 10, padding: '9px 15px', color: fov ? 'var(--clay-ink)' : 'var(--ink-soft)', background: fov ? 'var(--gold-bg)' : '#FFFDFC', border: `1px solid ${fov ? 'rgba(168,120,42,0.35)' : 'rgba(32,28,24,0.14)'}` }}
                  >
                    {fov ? 'Re-align to the palette' : 'Override this surface intentionally'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 6 }}>
                  {SURFACE_DEFS.map((sd) => {
                    const tbl = buildLayers(sd.id, colorsForSurface(sd.id));
                    const on = sd.id === activeSurface;
                    return (
                      <button
                        key={sd.id}
                        type="button"
                        title={sd.name}
                        onClick={() => setActiveSurface(sd.id)}
                        style={{ flexShrink: 0, width: 72, height: 54, borderRadius: 9, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: `2px solid ${on ? 'var(--gold)' : 'rgba(32,28,24,0.12)'}`, background: tbl.bg }}
                      >
                        {tbl.layers.slice(0, 2).map((ly, i) => (
                          <div key={i} style={sx(ly)} />
                        ))}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16 }}>
                  {SURFACE_DEFS.map((sd) => {
                    const bl = buildLayers(sd.id, colorsForSurface(sd.id));
                    const ov = !!overrides[sd.id];
                    return (
                      <div
                        key={sd.id}
                        className="atmo-surface"
                        onClick={() => focusSurfaceId(sd.id)}
                        style={sx('background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:14px;overflow:hidden;cursor:pointer')}
                      >
                        <div className="atmo-canvas" style={{ position: 'relative', height: 150, overflow: 'hidden', background: bl.bg }}>
                          <Illustration layers={bl.layers} />
                        </div>
                        <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px')}>
                          <span style={sx('font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{sd.name}</span>
                          <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 600, color: ov ? 'var(--clay-ink)' : 'var(--sage)' }}>
                            {ov ? 'Manual override' : 'On palette'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PALETTE JOURNEY */}
                <div style={sx('margin-top:26px;background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:16px;padding:16px 18px')}>
                  <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:14px')}>
                    <div className="voice" style={sx('font-size:20px;font-weight:600;color:var(--ink)')}>Palette Journey</div>
                    <div style={sx('font-size:11px;color:var(--ink-soft)')}>One palette, evolving across the day</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                    {journey.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => applyPreset(j.colors, name)}
                        style={sx('flex-shrink:0;width:150px;text-align:left;background:#FBF8F2;border:1px solid rgba(32,28,24,0.12);border-radius:12px;padding:10px 11px;cursor:pointer')}
                      >
                        <div style={{ display: 'flex', gap: 3, height: 30, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                          {j.colors.map((h, i) => (
                            <span key={i} style={{ flex: 1, background: h }} />
                          ))}
                        </div>
                        <div style={sx('font-size:12.5px;font-weight:600;color:var(--ink)')}>{j.moment}</div>
                        <div style={sx('font-size:10.5px;color:var(--ink-soft);margin-top:2px')}>{JOURNEY_NOTES[j.moment] || ''}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </main>
        )}

        {/* RIGHT · PEACE PANEL */}
        {showPanel && (
          <aside style={panelStyle}>
            {panelIsOverlay && (
              <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:12px')}>
                <span className="voice" style={sx('font-size:18px;font-weight:600')}>Peace Panel</span>
                <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close insights" style={sx('width:30px;height:30px;border-radius:8px;border:1px solid rgba(32,28,24,0.14);background:#FFFDFC;color:var(--ink);font-size:15px;cursor:pointer')}>✕</button>
              </div>
            )}

            <div style={sx('background:#FFFDFC;border:1px solid rgba(32,28,24,0.14);border-radius:14px;padding:14px;display:flex;align-items:center;gap:14px')}>
              <div style={{ width: 66, height: 66, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(${rippled ? 'var(--sage)' : 'var(--gold)'} ${Math.round(ringPct * 3.6)}deg,#EEE9E0 0)` }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFFDFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{alignedPct}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={sx('font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold)')}>World alignment</div>
                <div className="voice" style={sx('font-size:19px;font-weight:600;color:var(--ink);line-height:1.1')}>{alignLabel}</div>
              </div>
            </div>
            <div style={sx('font-size:12px;color:var(--ink-soft);line-height:1.5;margin:10px 2px 0')}>{alignSummary}</div>

            {oList.length > 0 && (
              <div style={sx('margin-top:12px;background:var(--gold-bg);border:1px solid rgba(154,87,22,0.24);border-radius:11px;padding:11px 12px')}>
                <div style={sx('font-size:11px;font-weight:600;color:var(--clay-ink);margin-bottom:5px')}>{oList.length} intentionally off-palette</div>
                <div style={sx('font-size:11.5px;color:var(--ink-soft);line-height:1.45')}>{overrideList}</div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px')}>Palette intelligence</div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                {intelligence.map((m, i) => (
                  <div key={i} style={sx('display:flex;gap:8px;font-size:12px;color:var(--ink);line-height:1.5;background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:11px;padding:10px 11px')}>
                    <span style={{ color: 'var(--gold)', flexShrink: 0 }}>✦</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={sx('margin-top:16px;background:linear-gradient(180deg,#2A2621,#201C18);border-radius:14px;padding:14px 15px;color:#F7F4EE')}>
              <div style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#F2B134;margin-bottom:5px')}>Next action</div>
              <div className="voice" style={sx('font-size:19px;font-weight:600;line-height:1.1')}>{nextAction.title}</div>
              <div style={sx('font-size:11.5px;color:rgba(247,244,238,0.72);line-height:1.5;margin-top:6px')}>{nextAction.why}</div>
              <button type="button" onClick={nextAction.onClick} style={sx('margin-top:11px;font-size:12px;font-weight:600;color:#201C18;background:#F2B134;border:none;border-radius:9px;padding:8px 14px;cursor:pointer')}>{nextAction.cta}</button>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sx('background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:12px;padding:12px')}>
                <div style={sx('font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold);margin-bottom:5px')}>Light &amp; photography</div>
                <div className="voice" style={sx('font-size:18px;font-weight:600;color:var(--ink)')}>{light}</div>
                <div style={sx('font-size:11.5px;color:var(--ink-soft);line-height:1.45;margin-top:3px')}>{LIGHT_NOTE[light] || ''}</div>
              </div>
              <div style={sx('background:#FFFDFC;border:1px solid rgba(32,28,24,0.12);border-radius:12px;padding:12px')}>
                <div style={sx('font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold);margin-bottom:7px')}>This palette ripples into</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {RIPPLE_TARGETS.map((rt) => (
                    <span key={rt} style={sx('font-size:11px;color:var(--ink);background:var(--gold-bg);border:1px solid rgba(168,120,42,0.24);border-radius:999px;padding:4px 10px')}>{rt}</span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {mob && (
        <nav style={sx('flex-shrink:0;display:grid;grid-template-columns:repeat(3,1fr);background:#FFFDFC;border-top:1px solid rgba(32,28,24,0.14)')}>
          {([
            { id: 'palette' as const, icon: '◐', label: 'Palette' },
            { id: 'preview' as const, icon: '✦', label: 'Preview' },
            { id: 'insights' as const, icon: '♡', label: 'Insights' },
          ]).map((m) => {
            const on = mobilePane === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMobilePane(m.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '10px 0 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--ink-faint)', borderTop: `2px solid ${on ? 'var(--gold)' : 'transparent'}` }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>{m.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{m.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* INSIGHTS FAB */}
      {showInsightsFab && (
        <button type="button" onClick={() => setPanelOpen(true)} style={sx('position:fixed;right:20px;bottom:20px;z-index:30;display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#F7F4EE;background:#201C18;border:none;border-radius:999px;padding:12px 18px;cursor:pointer;box-shadow:0 10px 30px rgba(32,28,24,0.28)')}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F2B134' }} />
          Insights
        </button>
      )}

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview the palette ripple"
        description="Review every consequence before applying it. Manual overrides will not be replaced."
        footer={(
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Keep editing</Button>
            <Button onClick={applyRipple} isLoading={isSaving}>
              Apply to {previewUpdates.filter((update) => update.status === 'updated').length} surfaces
            </Button>
          </>
        )}
      >
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
          {previewUpdates.map((update) => {
            const uiId = Object.entries(SURFACE_ID).find(([, storedId]) => storedId === update.surface)?.[0];
            const surfaceName = SURFACE_DEFS.find((surface) => surface.id === uiId)?.name || update.surface.replace(/_/g, ' ');
            return (
              <li key={update.surface} className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--cream)]/45 px-3 py-2">
                <span>
                  <span className="block text-sm font-medium text-[var(--ink)]">{surfaceName}</span>
                  <span className="block text-xs text-[var(--ink-soft)]">
                    {update.status === 'override_kept' ? 'Your chosen surface color stays in place.' : `${update.from || 'Not applied'} → ${update.to}`}
                  </span>
                </span>
                <Chip tone={update.status === 'override_kept' ? 'gold' : 'sage'}>
                  {update.status === 'override_kept' ? 'Manual override kept' : 'Will update'}
                </Chip>
              </li>
            );
          })}
        </ul>
      </Dialog>

      {/* RIPPLE TOAST */}
      {ripple && (
        <div className="atmo-sheet" style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 60, width: 'min(520px,92vw)', background: '#FFFDFC', border: '1px solid rgba(32,28,24,0.16)', borderRadius: 16, boxShadow: '0 20px 50px rgba(32,28,24,0.24)', padding: '16px 18px', animation: 'atmo-sheet .28s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:8px')}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)' }} />
            <span style={sx('font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold)')}>{ripple.kicker}</span>
          </div>
          <div className="voice" style={sx('font-size:18px;font-weight:600;color:var(--ink);line-height:1.15')}>{ripple.title}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {ripple.modules.map((rm2) => (
              <span key={rm2} style={sx('font-size:11.5px;color:var(--ink);background:var(--gold-bg);border:1px solid rgba(168,120,42,0.28);border-radius:999px;padding:5px 11px')}>{rm2}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setRipple(null)} style={sx('font-size:12px;color:var(--ink-soft);background:#FFFDFC;border:1px solid rgba(32,28,24,0.14);border-radius:9px;padding:8px 14px;cursor:pointer')}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
