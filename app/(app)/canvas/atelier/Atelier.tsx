'use client';

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { shade, mix } from '@/lib/canvas/color';
import type { AtelierLook } from '@/lib/canvas/types';
import {
  patchLook,
  toggleApproval as toggleApprovalAction,
  blessLook as blessLookAction,
  addLook as addLookAction,
  saveDressCode as saveDressCodeAction,
  renameApprover as renameApproverAction,
  type LookPatch,
} from './actions';

interface Props {
  looks: AtelierLook[];
  dressCode: string;
  rules: string[];
  palette: string[];
  approverRoles: string[];
  projectName: string;
  canEdit: boolean;
}

/* ---------- option vocabularies (culturally broad) ---------- */
const GARMENTS = ['Gown', 'Suit', 'Tuxedo', 'Jumpsuit', 'Two-piece', 'Sherwani', 'Lehenga', 'Kaftan', 'Cape dress', 'Cultural attire'];
const SILHOUETTES = ['Slip', 'A-line', 'Ballgown', 'Column', 'Tailored', 'Relaxed', 'Flared', 'Mixed'];
const FABRICS = ['Silk', 'Satin', 'Chiffon', 'Lace', 'Velvet', 'Linen', 'Wool', 'Organza', 'Brocade'];
const FORMALITY = ['Garden formal', 'Cocktail', 'Black-tie', 'Festive casual', 'Cultural formal'];
const MODESTY = ['As designed', 'Sleeves', 'Higher neckline', 'Full length', 'Hijab-friendly', 'Covered shoulders'];
const MOVEMENT = ['Easy to dance', 'Needs bustling', 'Flowing', 'Structured'];
const ACCESSORIES = ['Veil', 'Headpiece', 'Statement earrings', 'Brooch', 'Pocket square', 'Boutonnière', 'Sash', 'Gloves', 'Cape', 'Turban'];
const ADD_PEOPLE = ['Parent', 'Flower girl', 'Ring bearer', 'Reception look', 'Afterparty look', 'Cultural ceremony look'];
const DRESSCODES = ['Garden formal', 'Cocktail attire', 'Black-tie optional', 'Festive casual', 'Beach formal', 'Cultural formal'];
const PALETTE_ROLES = ['Primary', 'Secondary', 'Accent', 'Neutral', 'Ink'];
const PRESENCE_COLORS = ['#BC7459', '#7C93A6', '#8A9A80'];
const IVORY = '#EFE7D6';

const GUEST_COPY: Record<string, string> = {
  'Garden formal': 'Garden formal — long dresses, tailored suits, or elevated separates in earthy, candlelit tones. Grass-friendly shoes for the lawn, and a wrap for after sunset.',
  'Cocktail attire': 'Cocktail attire — midi or knee-length dresses and sharp suits. Lean into our warm, candlelit palette; skip white and ivory.',
  'Black-tie optional': 'Black-tie optional — floor-length gowns or dark suits and tuxedos welcome. Deep, rich tones photograph beautifully in our candlelit reception.',
  'Festive casual': 'Festive casual — dressy but relaxed. Think elevated separates and comfortable shoes for a night of dancing.',
  'Beach formal': 'Beach formal — breathable fabrics, elegant sandals, and light, warm tones. Bring a layer for the ocean breeze after dark.',
  'Cultural formal': 'Cultural formal — traditional and cultural attire is warmly welcomed and celebrated. Earthy, candlelit tones tie the room together.',
};

/* ---------- look accessors (composer state lives in look.details) ---------- */
const garmentOf = (l: AtelierLook) => l.details?.Garment ?? (l.details?.Pieces ? 'Suit' : 'Gown');
const silhouetteOf = (l: AtelierLook) => l.details?.Silhouette ?? l.details?.Fit ?? 'Slip';
const fabricOf = (l: AtelierLook) => l.details?.Fabric ?? 'Silk';
const formalityOf = (l: AtelierLook, dressCode: string) => l.details?.Formality ?? dressCode;
const modestyOf = (l: AtelierLook) => l.details?.Modesty ?? 'As designed';
const movementOf = (l: AtelierLook) => l.details?.Movement ?? 'Flowing';
const accessoriesOf = (l: AtelierLook) =>
  (l.details?.Accessories ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const isPartyRole = (party: string) => /maid|party|groomsm|bridesmaid|guest/i.test(party || '');
const isBlessed = (l: AtelierLook, roles: string[]) =>
  roles.length > 0 && roles.every((r) => !!l.approvals?.[r]);

function isLight(hex: string) {
  const h = (hex || '#000').replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(f.slice(0, 2), 16) || 0;
  const g = parseInt(f.slice(2, 4), 16) || 0;
  const b = parseInt(f.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/* ---------- CSS-geometry figure (clip-path silhouette from the palette) ---------- */
function clipFor(garment: string, silhouette: string) {
  if (garment === 'Suit' || garment === 'Tuxedo' || silhouette === 'Tailored' || silhouette === 'Structured')
    return 'polygon(34% 0,66% 0,63% 52%,60% 100%,52% 100%,50% 56%,48% 100%,40% 100%,37% 52%)';
  if (silhouette === 'Ballgown') return 'polygon(43% 0,57% 0,72% 46%,100% 100%,0 100%,28% 46%)';
  if (garment === 'Lehenga') return 'polygon(42% 0,58% 0,60% 38%,100% 100%,0 100%,40% 38%)';
  if (garment === 'Kaftan' || garment === 'Cape dress') return 'polygon(28% 0,72% 0,86% 100%,14% 100%)';
  if (garment === 'Sherwani') return 'polygon(36% 0,64% 0,66% 100%,34% 100%)';
  if (silhouette === 'A-line' || silhouette === 'Flared' || silhouette === 'Mixed')
    return 'polygon(41% 0,59% 0,100% 100%,0 100%)';
  return 'polygon(40% 0,60% 0,57% 100%,43% 100%)';
}

function buildFig(look: AtelierLook, H: number) {
  const garment = garmentOf(look);
  const silhouette = silhouetteOf(look);
  const accessories = accessoriesOf(look);
  const skin = '#E4CBB4';
  const clip = clipFor(garment, silhouette);
  const bodyTop = H * 0.2;
  const bodyH = H * 0.8;
  const headD = H * 0.16;
  const isSuit = garment === 'Suit' || garment === 'Tuxedo' || silhouette === 'Tailored';
  const abs: CSSProperties = { position: 'absolute' };
  const layers: CSSProperties[] = [
    { ...abs, left: '50%', top: H * 0.02, transform: 'translateX(-50%)', width: headD, height: headD, borderRadius: '50%', background: skin },
    { ...abs, left: '50%', top: bodyTop, transform: 'translateX(-50%)', width: H * 0.5, height: bodyH, background: look.color, clipPath: clip, boxShadow: 'inset 0 -8px 18px rgba(0,0,0,.08)' },
  ];
  if (isSuit) {
    layers.push({ ...abs, left: '50%', top: bodyTop + 2, transform: 'translateX(-50%)', width: 2, height: bodyH * 0.5, background: shade(look.color, 0.25) });
    layers.push({ ...abs, left: '50%', top: bodyTop + 6, transform: 'translateX(-50%)', width: H * 0.16, height: H * 0.22, background: look.accent, clipPath: 'polygon(50% 0,100% 18%,50% 60%,0 18%)' });
  } else {
    layers.push({ ...abs, left: '50%', top: bodyTop + 4, transform: 'translateX(-50%)', width: Math.max(3, H * 0.03), height: bodyH * 0.62, background: look.accent, opacity: 0.85 });
  }
  if (accessories.includes('Veil')) {
    layers.push({ ...abs, left: '50%', top: H * 0.01, transform: 'translateX(-50%)', width: H * 0.34, height: H * 0.6, background: 'rgba(255,255,255,.34)', clipPath: 'polygon(50% 0,100% 100%,0 100%)', borderRadius: '40% 40% 0 0' });
  }
  return { wrap: { position: 'relative', width: H * 0.6, height: H * 1.02 } as CSSProperties, layers };
}

function Figure({ look, h, className }: { look: AtelierLook; h: number; className?: string }) {
  const fig = buildFig(look, h);
  return (
    <div className={className} style={fig.wrap}>
      {fig.layers.map((ly, i) => (
        <div key={i} style={ly} />
      ))}
    </div>
  );
}

/* ---------- status meta ---------- */
type Status = 'dream' | 'refining' | 'blessed';
function statusOf(l: AtelierLook, roles: string[]): Status {
  if (isBlessed(l, roles)) return 'blessed';
  const touched = roles.some((r) => l.approvals?.[r] !== undefined) || Object.keys(l.approvals ?? {}).length > 0;
  return touched ? 'refining' : 'dream';
}
const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  dream: { label: 'Draft · a dream', color: 'var(--ink-soft)', bg: '#EEE9E0' },
  refining: { label: 'Proposed · refining', color: 'var(--clay-ink)', bg: 'var(--gold-bg)' },
  blessed: { label: 'Approved · blessed', color: 'var(--sage)', bg: 'var(--sage-bg)' },
};

/* ---------- small chip ---------- */
function Chip({ label, on, dot, onClick, disabled }: { label: string; on: boolean; dot?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="atl-chip"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: on ? 600 : 500,
        color: on ? '#FFFDFC' : 'var(--ink-soft)', background: on ? 'var(--gold)' : '#FFFDFC',
        border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 999, padding: '7px 12px',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {dot ? <span style={{ width: 12, height: 12, borderRadius: '50%', background: dot, boxShadow: 'inset 0 0 0 1px rgba(32,28,24,.15)' }} /> : null}
      {label}
    </button>
  );
}

function Group({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
        <span style={{ fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--gold)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div>
    </div>
  );
}

const KICKER: CSSProperties = { fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--gold)' };

export function Atelier({ looks: initialLooks, dressCode: initialDressCode, rules: initialRules, palette, approverRoles: initialRoles, projectName, canEdit }: Props) {
  const [looks, setLooks] = useState<AtelierLook[]>(initialLooks);
  const [dressCode, setDressCode] = useState(initialDressCode);
  const [rules] = useState(initialRules);
  const [approverRoles, setApproverRoles] = useState<string[]>(initialRoles);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState(initialLooks[0]?.id ?? '');
  const [layout, setLayout] = useState<'studio' | 'focus'>('studio');
  const [panelOpen, setPanelOpen] = useState(false);
  const [dcOpen, setDcOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'who' | 'look' | 'harmony'>('look');
  const [ripple, setRipple] = useState<{ kicker: string; title: string; modules: string[] } | null>(null);
  const [vw, setVw] = useState(1440);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const c = palette.length >= 5 ? palette : ['#8A9A80', '#BC7459', '#E7D2C8', '#F1EBDD', '#3A3631'];
  const active = looks.find((l) => l.id === activeId) ?? looks[0];
  const mob = vw < 860;
  const narrow = vw < 1240;
  const focus = layout === 'focus' && !mob;
  const panelInline = !narrow && !focus && !mob;
  const showFab = !mob && !panelInline && !panelOpen;

  const persist = (fn: () => void) => {
    if (canEdit) startTransition(fn);
  };

  /* ---------- mutations (optimistic local + persist) ---------- */
  const setDetail = (key: string, value: string) => {
    if (!active) return;
    setLooks((prev) => prev.map((l) => (l.id === active.id ? { ...l, details: { ...l.details, [key]: value } } : l)));
    persist(() => patchLook(active.id, { details: { [key]: value } }));
  };
  const setTopLocal = (field: 'title' | 'notes' | 'color' | 'accent', value: string) => {
    if (!active) return;
    setLooks((prev) => prev.map((l) => (l.id === active.id ? ({ ...l, [field]: value } as AtelierLook) : l)));
  };
  const persistTop = (field: 'title' | 'notes' | 'color' | 'accent', value: string) => {
    if (!active) return;
    const patch: LookPatch = {};
    patch[field] = value;
    persist(() => patchLook(active.id, patch));
  };
  const setTop = (field: 'color' | 'accent', value: string) => {
    setTopLocal(field, value);
    persistTop(field, value);
  };
  const toggleAccessory = (a: string) => {
    if (!active) return;
    const cur = accessoriesOf(active);
    const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
    setDetail('Accessories', next.join(', '));
  };
  const onToggleApproval = (role: string) => {
    if (!active) return;
    setLooks((prev) => prev.map((l) => (l.id === active.id ? { ...l, approvals: { ...l.approvals, [role]: !l.approvals?.[role] } } : l)));
    persist(() => toggleApprovalAction(active.id, role));
  };
  const onBless = () => {
    if (!active) return;
    const roles = approverRoles;
    const blessed = { ...active.approvals, ...Object.fromEntries(roles.map((r) => [r, true])) };
    setLooks((prev) => prev.map((l) => (l.id === active.id ? { ...l, approvals: blessed } : l)));
    persist(() => blessLookAction(active.id, roles));
    setRipple({ kicker: 'Blessing the look', title: `“${active.title}” is blessed`, modules: ['Couple Harmony', 'Guest dress code', 'Money Map · attire', 'Decisions'] });
  };
  const onAddPerson = (label: string) => {
    const id = (globalThis.crypto?.randomUUID?.() ?? `l${Date.now()}`);
    const look: AtelierLook = {
      id, party: label, title: `New ${label.toLowerCase()}`, color: '#E7D2C8', accent: '#B8924A', notes: '',
      details: { Garment: 'Gown', Silhouette: 'A-line', Fabric: 'Silk', Formality: dressCode, Modesty: 'As designed', Movement: 'Flowing', Accessories: '' },
      approvals: {},
    };
    setLooks((prev) => [...prev, look]);
    setActiveId(id);
    if (mob) setMobilePane('look');
    persist(() => addLookAction(look));
  };
  const onRenameApprover = (oldName: string, raw: string) => {
    const clean = raw.trim();
    setRoleDrafts((d) => { const n = { ...d }; delete n[oldName]; return n; });
    if (!clean || clean === oldName || approverRoles.includes(clean)) return;
    const newRoles = approverRoles.map((r) => (r === oldName ? clean : r));
    setApproverRoles(newRoles);
    setLooks((prev) => prev.map((l) => {
      if (!l.approvals || !(oldName in l.approvals)) return l;
      const next = { ...l.approvals };
      const value = next[oldName];
      delete next[oldName];
      next[clean] = value;
      return { ...l, approvals: next };
    }));
    persist(() => renameApproverAction(oldName, clean, newRoles));
  };
  const onSetDressCode = (dc: string) => {
    setDressCode(dc);
    persist(() => saveDressCodeAction(dc, rules));
  };
  const selectLook = (id: string) => {
    setActiveId(id);
    if (mob) setMobilePane('look');
  };

  /* ---------- derived ---------- */
  const blessedN = looks.filter((l) => isBlessed(l, approverRoles)).length;
  const blessedPct = looks.length ? Math.round((blessedN / looks.length) * 100) : 0;
  const lookCountLabel = `${looks.length} looks · ${blessedN} blessed`;

  const coupleLooks = looks.filter((l) => !isPartyRole(l.party)).slice(0, 2);
  const partyLooks = looks.filter((l) => isPartyRole(l.party));
  const other = coupleLooks.find((l) => l.id !== active?.id) ?? looks.find((l) => l.id !== active?.id);

  const harmony = useMemo(() => {
    if (coupleLooks.length >= 2) {
      const [a, b] = coupleLooks;
      const fa = formalityOf(a, dressCode);
      const fb = formalityOf(b, dressCode);
      if (fa !== fb) {
        return { verdict: 'One reads dressier', color: '#9A5716', bg: 'var(--gold-bg)', note: `“${a.party}” is ${fa.toLowerCase()} while “${b.party}” is ${fb.toLowerCase()}. Nudging one closer will make them feel like a pair.` };
      }
      if (isLight(a.color) !== isLight(b.color)) {
        return { verdict: 'Lovely tonal contrast', color: 'var(--clay-ink)', bg: '#F3ECDD', note: 'A light look beside a deeper one — a classic, photogenic pairing that still shares your palette.' };
      }
      return { verdict: 'Beautifully aligned', color: 'var(--sage)', bg: 'var(--sage-bg)', note: 'Both looks share your palette and formality — they read as one couple, dressed for the same day.' };
    }
    return { verdict: 'Add the second look', color: 'var(--ink-soft)', bg: '#EEE9E0', note: 'Compose both partners’ looks to see how they harmonize against the palette and lighting.' };
  }, [coupleLooks, dressCode]);

  const apprYes = active ? approverRoles.filter((r) => active.approvals?.[r]).length : 0;
  const nextAction = (() => {
    if (!active) return { title: 'Compose your first look', why: 'Add someone from the wardrobe to begin.', cta: 'Add a look', onClick: () => onAddPerson('Parent') };
    const unblessed = looks.find((l) => !isBlessed(l, approverRoles));
    if (!isBlessed(active, approverRoles) && apprYes < approverRoles.length) {
      return { title: `Gather approvals for ${active.party}`, why: `${apprYes} of ${approverRoles.length} have said yes. A look is blessed once everyone who matters has weighed in — and you can rename who that is.`, cta: 'Open approvals', onClick: () => { if (mob) setMobilePane('harmony'); else if (!panelInline) setPanelOpen(true); } };
    }
    if (coupleLooks.length < 2) {
      return { title: 'Compose the second partner look', why: 'Couple Harmony needs both looks to show how you read together against the palette and lighting.', cta: 'Add a look', onClick: () => onAddPerson('Partner') };
    }
    if (unblessed) {
      return { title: `Bless “${unblessed.title}”`, why: `Most looks are settled. Finishing ${unblessed.party}’s look completes the wardrobe and updates the guest dress code.`, cta: 'Open look', onClick: () => selectLook(unblessed.id) };
    }
    return { title: 'Publish the guest dress code', why: 'Every look is blessed. Generate the guest-facing dress code copy for your website and invitation.', cta: 'Open dress code', onClick: () => setDcOpen(true) };
  })();

  /* ---------- context previews ---------- */
  const sceneBase: CSSProperties = { position: 'relative', height: 150, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingBottom: 6 };
  const contexts = active ? [
    { name: 'Down the aisle', note: 'Framed by greenery and morning light.', bg: `linear-gradient(180deg,${mix(c[0], '#fff', 0.6)},${mix(c[3], '#fff', 0.3)})`, figs: [{ look: active, h: 118 }] },
    { name: 'Portraits', note: 'Clean studio ground — the look on its own terms.', bg: mix(c[3], '#fff', 0.5), figs: [{ look: active, h: 118 }] },
    { name: 'Reception lighting', note: 'Warm and candlelit; deep tones recede.', bg: `radial-gradient(120% 90% at 50% 0%,${mix(c[4], '#000', 0.1)},${mix(c[4], '#000', 0.45)})`, figs: [{ look: active, h: 118 }] },
    { name: 'On the dance floor', note: `Does it move? ${movementOf(active).toLowerCase()}.`, bg: `radial-gradient(90% 80% at 30% 10%,${mix(c[1], '#000', 0.1)},${mix(c[4], '#000', 0.4)})`, figs: [{ look: active, h: 112 }] },
    { name: 'Beside your partner', note: other ? `Next to ${other.party}’s look.` : 'Add a partner look to compare.', bg: `linear-gradient(180deg,${mix(c[2], '#fff', 0.5)},${mix(c[3], '#fff', 0.3)})`, figs: other ? [{ look: active, h: 110 }, { look: other, h: 110 }] : [{ look: active, h: 110 }] },
    { name: 'Against the palette', note: 'Reads with the world’s colors.', bg: `linear-gradient(90deg,${c[0]} 20%,${c[1]} 20% 40%,${c[2]} 40% 60%,${c[3]} 60% 80%,${c[4]} 80%)`, figs: [{ look: active, h: 118 }] },
  ] : [];

  /* ---------- layout geometry ---------- */
  const workspaceCols = mob ? '1fr' : panelInline ? '232px minmax(0,1fr) 336px' : '232px minmax(0,1fr)';
  const studioCols = mob || focus ? '1fr' : 'minmax(220px,320px) minmax(0,1fr)';
  const showLeft = !mob || mobilePane === 'who';
  const showCenter = !mob || mobilePane === 'look';
  const showPanel = mob ? mobilePane === 'harmony' : panelInline || panelOpen;
  const panelIsOverlay = !panelInline && !mob;

  const scrollCol: CSSProperties = { minHeight: 0, overflowY: 'auto' };

  if (!active) return null;
  const activeStatus = statusOf(active, approverRoles);
  const allYes = approverRoles.every((r) => active.approvals?.[r]);
  const blessLabel = activeStatus === 'blessed' ? 'Blessed ✦' : allYes ? 'Mark as blessed' : 'Bless this look';

  return (
    <div className="-mx-6 -my-6 flex min-h-screen flex-col md:-mx-10" style={{ background: '#F7F4EE', color: 'var(--ink)' }}>
      <style>{`
        @keyframes atl-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes atl-fade{from{opacity:0}to{opacity:1}}
        @keyframes atl-sheet{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .atl-look{transition:transform .22s cubic-bezier(.34,1.4,.64,1),box-shadow .22s ease,border-color .22s ease}
        .atl-look:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(32,28,24,0.12)}
        .atl-fig{transition:transform .4s cubic-bezier(.34,1.4,.64,1)}
        .atl-figwrap:hover .atl-fig{transform:translateY(-3px)}
        .atl-chip{transition:transform .14s ease,background .2s ease,border-color .2s ease,color .2s ease}
        .atl-chip:active{transform:scale(.94)}
        .atl-morph *{transition:clip-path .5s cubic-bezier(.34,1.2,.64,1),background .5s ease,border-color .5s ease}
        @media(prefers-reduced-motion:reduce){*{animation:none!important}.atl-look:hover,.atl-figwrap:hover .atl-fig{transform:none}}
      `}</style>

      {/* GLOBAL HEADER */}
      <header style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', background: '#FFFDFC', borderBottom: '1px solid var(--line)', gap: 16, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <Link href="/peace-center" className="voice" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>The Missing Peace</Link>
          <div style={{ width: 1, height: 22, background: 'var(--line)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{projectName}</span>
            <span style={{ fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--gold)' }}>The Atelier</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--sage)', background: 'var(--sage-bg)', border: '1px solid rgba(138,154,128,0.4)', borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage)', display: 'inline-block' }} />Saved
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {approverRoles.slice(0, 3).map((role, i) => (
              <div key={role} title={role} style={{ width: 30, height: 30, borderRadius: '50%', background: PRESENCE_COLORS[i % PRESENCE_COLORS.length], color: '#FFFDFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '2px solid #FFFDFC', marginLeft: i ? -8 : 0 }}>
                {role.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CONTEXTUAL BAR */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '9px 22px', background: '#FBF8F2', borderBottom: '1px solid var(--line)', zIndex: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span className="voice" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>The Atelier</span>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {dressCode} · {lookCountLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!mob && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#F1EADD', border: '1px solid var(--line)', borderRadius: 10, padding: 3 }}>
              {(['studio', 'focus'] as const).map((id) => {
                const on = layout === id;
                return (
                  <button key={id} type="button" onClick={() => { setLayout(id); setPanelOpen(false); }} title={id === 'studio' ? 'Composer + context' : 'Just the look'}
                    style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--ink-soft)', background: on ? '#FFFDFC' : 'transparent', boxShadow: on ? '0 1px 3px rgba(32,28,24,0.12)' : 'none' }}>
                    {id === 'studio' ? 'Studio' : 'Focus'}
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" onClick={() => setDcOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#FFFDFC', background: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Guest dress code · {blessedPct}%
          </button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div style={{ flex: 1, minHeight: 0, display: mob ? 'flex' : 'grid', flexDirection: mob ? 'column' : undefined, gridTemplateColumns: mob ? undefined : workspaceCols, background: mob ? '#F7F4EE' : 'var(--line)', gap: mob ? 0 : 1 }}>

        {/* LEFT · WARDROBE */}
        {showLeft && (
          <aside style={{ ...scrollCol, background: '#FBF8F2', padding: mob ? '16px 14px 90px' : '16px 14px' }}>
            <div style={{ ...KICKER, marginBottom: 10 }}>Who are we dressing?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {looks.map((l) => {
                const on = l.id === active.id;
                const st = STATUS_META[statusOf(l, approverRoles)];
                return (
                  <button key={l.id} type="button" className="atl-look" onClick={() => selectLook(l.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', cursor: 'pointer', padding: '8px 10px', borderRadius: 12, border: `1px solid ${on ? 'rgba(184,146,74,0.5)' : 'var(--line)'}`, background: on ? '#FBF6EC' : '#FFFDFC' }}>
                    <span style={{ flexShrink: 0 }}><Figure look={l} h={42} className="atl-fig" /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.party}</span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title} · {garmentOf(l)}</span>
                    </span>
                    <span title={st.label} style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: st.color }} />
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <div style={{ ...KICKER, marginBottom: 7 }}>Add someone</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ADD_PEOPLE.map((p) => (
                  <button key={p} type="button" onClick={() => onAddPerson(p)} style={{ fontSize: 11, color: 'var(--ink-soft)', background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 10px', cursor: 'pointer' }}>+ {p}</button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* CENTER · COMPOSER + CONTEXT */}
        {showCenter && (
          <main style={{ ...scrollCol, background: '#F7F4EE', padding: mob ? '14px 14px 90px' : '22px clamp(18px,2.5vw,32px) 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: studioCols, gap: 20, alignItems: 'start' }}>
              {/* Figure stage */}
              <div style={{ background: 'linear-gradient(180deg,#FBF6EC,#F7F4EE)', border: '1px solid var(--line)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={KICKER}>The look</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: STATUS_META[activeStatus].color, background: STATUS_META[activeStatus].bg, borderRadius: 999, padding: '4px 11px' }}>{STATUS_META[activeStatus].label}</span>
                </div>
                <div className="atl-figwrap" style={{ position: 'relative', width: '100%', height: 'min(42vh,340px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Figure look={active} h={220} className="atl-morph atl-fig" />
                </div>
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <input
                    value={active.title}
                    onChange={(e) => setTopLocal('title', e.target.value)}
                    onBlur={(e) => persistTop('title', e.target.value)}
                    aria-label="Look title" className="voice"
                    style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'center', outline: 'none', maxWidth: '100%' }}
                  />
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3 }}>{active.party} · {[garmentOf(active), fabricOf(active), formalityOf(active, dressCode)].join(' · ')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button type="button" onClick={onBless} disabled={activeStatus === 'blessed'}
                    style={{ fontSize: 12.5, fontWeight: 600, cursor: activeStatus === 'blessed' ? 'default' : 'pointer', borderRadius: 10, padding: '10px 18px', ...(activeStatus === 'blessed' ? { color: 'var(--sage)', background: 'var(--sage-bg)', border: '1px solid rgba(138,154,128,0.4)' } : { color: '#FFFDFC', background: 'var(--ink)', border: 'none' }) }}>
                    {blessLabel}
                  </button>
                </div>
              </div>

              {/* Composer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Group label="Garment" hint="Culturally broad">
                  {GARMENTS.map((g) => <Chip key={g} label={g} on={garmentOf(active) === g} onClick={() => setDetail('Garment', g)} />)}
                </Group>
                <Group label="Silhouette" hint="Shape & drape">
                  {SILHOUETTES.map((s) => <Chip key={s} label={s} on={silhouetteOf(active) === s} onClick={() => setDetail('Silhouette', s)} />)}
                </Group>
                <Group label="Fabric" hint="Texture & weight">
                  {FABRICS.map((f) => <Chip key={f} label={f} on={fabricOf(active) === f} onClick={() => setDetail('Fabric', f)} />)}
                </Group>
                <Group label="Color" hint="Linked to your palette">
                  {c.slice(0, 5).map((hex, i) => <Chip key={hex + i} label={PALETTE_ROLES[i]} on={active.color === hex} dot={hex} onClick={() => setTop('color', hex)} />)}
                  <Chip label="Ivory" on={active.color === IVORY} dot={IVORY} onClick={() => setTop('color', IVORY)} />
                </Group>
                <Group label="Accent" hint="Trim, sash, lapel">
                  {c.slice(0, 5).map((hex, i) => <Chip key={hex + i} label={PALETTE_ROLES[i]} on={active.accent === hex} dot={hex} onClick={() => setTop('accent', hex)} />)}
                </Group>
                <Group label="Accessories" hint="Choose any">
                  {ACCESSORIES.map((a) => <Chip key={a} label={a} on={accessoriesOf(active).includes(a)} onClick={() => toggleAccessory(a)} />)}
                </Group>
                <Group label="Formality" hint="How dressed up">
                  {FORMALITY.map((f) => <Chip key={f} label={f} on={formalityOf(active, dressCode) === f} onClick={() => setDetail('Formality', f)} />)}
                </Group>
                <Group label="Modesty" hint="Comfort & culture">
                  {MODESTY.map((m) => <Chip key={m} label={m} on={modestyOf(active) === m} onClick={() => setDetail('Modesty', m)} />)}
                </Group>
                <Group label="Movement" hint="How it wears">
                  {MOVEMENT.map((m) => <Chip key={m} label={m} on={movementOf(active) === m} onClick={() => setDetail('Movement', m)} />)}
                </Group>
              </div>
            </div>

            {/* CONTEXT PREVIEW */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div className="voice" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>See it in the day</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Aisle · portraits · reception · dance floor · beside partner · against the palette</div>
              </div>
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
                {contexts.map((ctx) => (
                  <div key={ctx.name} style={{ flexShrink: 0, width: 190, border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', background: '#FFFDFC' }}>
                    <div style={{ ...sceneBase, background: ctx.bg }}>
                      {ctx.figs.map((f, i) => <Figure key={i} look={f.look} h={f.h} />)}
                    </div>
                    <div style={{ padding: '9px 11px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{ctx.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 2 }}>{ctx.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* RIGHT · PEACE PANEL */}
        {showPanel && (
          <aside style={panelIsOverlay
            ? { position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(376px,92vw)', zIndex: 45, ...scrollCol, background: '#FBF8F2', boxShadow: '-16px 0 50px rgba(32,28,24,0.22)', padding: '18px 16px' }
            : { ...scrollCol, background: mob ? '#F7F4EE' : '#FBF8F2', padding: mob ? '16px 14px 90px' : '18px 16px' }}>
            {panelIsOverlay && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="voice" style={{ fontSize: 18, fontWeight: 600 }}>Peace Panel</span>
                <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close insights" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: '#FFFDFC', color: 'var(--ink)', fontSize: 15, cursor: 'pointer' }}>✕</button>
              </div>
            )}

            {/* Couple Harmony */}
            <div style={{ background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
              <div style={{ ...KICKER, marginBottom: 10, letterSpacing: '1.2px' }}>Couple Harmony</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 22, marginBottom: 12 }}>
                {(coupleLooks.length ? coupleLooks : [active]).map((l) => (
                  <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <Figure look={l} h={96} />
                    <span style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{l.party}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: harmony.color, background: harmony.bg, borderRadius: 999, padding: '4px 11px' }}>{harmony.verdict}</div>
              <div style={{ fontSize: 12, color: '#3a352f', lineHeight: 1.5, marginTop: 8 }}>{harmony.note}</div>
            </div>

            {/* Approvals (editable roles) */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={KICKER}>Approvals · {active.party}</div>
                <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{apprYes}/{approverRoles.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {approverRoles.map((role, i) => {
                  const on = !!active.approvals?.[role];
                  return (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 11, padding: '8px 10px' }}>
                      <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', background: PRESENCE_COLORS[i % PRESENCE_COLORS.length], color: '#FFFDFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{(role || '?').charAt(0).toUpperCase()}</span>
                      <input
                        value={roleDrafts[role] ?? role}
                        onChange={(e) => setRoleDrafts((d) => ({ ...d, [role]: e.target.value }))}
                        onBlur={(e) => onRenameApprover(role, e.target.value)}
                        aria-label="Approver name"
                        style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'transparent', border: 'none', borderBottom: '1px solid transparent', outline: 'none', padding: '2px 0' }}
                      />
                      <button type="button" onClick={() => onToggleApproval(role)} aria-label="Toggle approval"
                        style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '5px 11px', ...(on ? { color: 'var(--sage)', background: 'var(--sage-bg)', border: '1px solid rgba(138,154,128,0.4)' } : { color: 'var(--ink-soft)', background: '#FFFDFC', border: '1px solid var(--line)' }) }}>
                        {on ? 'Loves it' : 'Pending'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', lineHeight: 1.4, marginTop: 7 }}>Rename anyone — the product uses your labels, not “bride” and “groom.”</div>
            </div>

            {/* Wedding Party Harmony */}
            <div style={{ marginTop: 16, background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
              <div style={{ ...KICKER, marginBottom: 9, letterSpacing: '1.2px' }}>Wedding Party Harmony</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
                {(partyLooks.length ? partyLooks : [active]).map((l) => (
                  <span key={l.id} style={{ width: 26, height: 26, borderRadius: '50%', background: l.color, boxShadow: 'inset 0 0 0 1px rgba(32,28,24,.12)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#3a352f', lineHeight: 1.5 }}>
                {partyLooks.length ? 'Your party shares one tone in mismatched silhouettes — harmony without matching. Individual personality inside a shared dress code.' : 'No wedding-party looks yet. Add one to explore same-tone, different-silhouette harmony.'}
              </div>
            </div>

            {/* Next action */}
            <div style={{ marginTop: 16, background: 'linear-gradient(180deg,var(--ink),#201C18)', borderRadius: 14, padding: '14px 15px', color: '#F7F4EE' }}>
              <div style={{ fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#F2B134', marginBottom: 5 }}>Next action</div>
              <div className="voice" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.1 }}>{nextAction.title}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(247,244,238,0.72)', lineHeight: 1.5, marginTop: 6 }}>{nextAction.why}</div>
              <button type="button" onClick={nextAction.onClick} style={{ marginTop: 11, fontSize: 12, fontWeight: 600, color: 'var(--ink)', background: '#F2B134', border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>{nextAction.cta}</button>
            </div>
          </aside>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {mob && (
        <nav style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: '#FFFDFC', borderTop: '1px solid var(--line)' }}>
          {([['who', '♛', 'Who'], ['look', '✦', 'Look'], ['harmony', '♡', 'Harmony']] as const).map(([id, icon, label]) => {
            const on = mobilePane === id;
            return (
              <button key={id} type="button" onClick={() => setMobilePane(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '10px 0 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--ink-faint)', borderTop: `2px solid ${on ? 'var(--gold)' : 'transparent'}` }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* HARMONY FAB */}
      {showFab && (
        <button type="button" onClick={() => setPanelOpen(true)} style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 30, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#F7F4EE', background: 'var(--ink)', border: 'none', borderRadius: 999, padding: '12px 18px', cursor: 'pointer', boxShadow: '0 10px 30px rgba(32,28,24,0.28)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F2B134' }} />Harmony
        </button>
      )}

      {/* DRESS CODE MODAL */}
      {dcOpen && (
        <div onClick={() => setDcOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(32,28,24,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'atl-fade .2s ease both' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(620px,100%)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: '#FFFDFC', borderRadius: 18, boxShadow: '0 30px 70px rgba(32,28,24,0.32)', overflow: 'hidden', animation: 'atl-sheet .3s cubic-bezier(.22,1,.36,1) both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--gold)' }}>Guest dress code · generated</div>
                <div className="voice" style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.05, marginTop: 2 }}>{dressCode}</div>
              </div>
              <button type="button" onClick={() => setDcOpen(false)} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line)', background: '#FFFDFC', fontSize: 16, color: 'var(--ink)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {DRESSCODES.map((d) => {
                  const on = dressCode === d;
                  return (
                    <button key={d} type="button" onClick={() => onSetDressCode(d)} style={{ fontSize: 12, fontWeight: on ? 600 : 500, color: on ? '#FFFDFC' : 'var(--ink-soft)', background: on ? 'var(--gold)' : '#FFFDFC', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 999, padding: '8px 13px', cursor: 'pointer' }}>{d}</button>
                  );
                })}
              </div>
              <div style={{ background: '#FBF6EC', border: '1px solid rgba(184,146,74,0.28)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ ...KICKER, letterSpacing: '1.2px', marginBottom: 6 }}>For your website & invitation</div>
                <div className="voice" style={{ fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', lineHeight: 1.4 }}>{GUEST_COPY[dressCode] ?? GUEST_COPY['Garden formal']}</div>
              </div>
              <div style={{ ...KICKER, letterSpacing: '1.2px', marginBottom: 8 }}>Rules & sensitivities</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#3a352f', lineHeight: 1.4, background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px' }}>
                    <span style={{ color: 'var(--gold)', flexShrink: 0 }}>◆</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--line)', background: '#FBF8F2' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Ripples into website, invitation & guest FAQ</span>
              <button type="button" onClick={() => { setRipple({ kicker: 'Guest dress code', title: `“${dressCode}” shared with your guests`, modules: ['Wedding website', 'Invitation', 'Guest FAQ', 'Peace Notes'] }); setDcOpen(false); }}
                style={{ fontSize: 12, fontWeight: 600, color: '#FFFDFC', background: 'var(--gold)', border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>Copy for website</button>
            </div>
          </div>
        </div>
      )}

      {/* RIPPLE TOAST */}
      {ripple && (
        <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 60, width: 'min(520px,92vw)', background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 16, boxShadow: '0 20px 50px rgba(32,28,24,0.24)', padding: '16px 18px', animation: 'atl-sheet .28s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)' }} />
            <span style={{ ...KICKER, letterSpacing: '1.4px' }}>{ripple.kicker}</span>
          </div>
          <div className="voice" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.15 }}>{ripple.title}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {ripple.modules.map((m) => (
              <span key={m} style={{ fontSize: 11.5, color: '#3a352f', background: 'var(--gold-bg)', border: '1px solid rgba(184,146,74,0.28)', borderRadius: 999, padding: '5px 11px' }}>{m}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setRipple(null)} style={{ fontSize: 12, color: 'var(--ink-soft)', background: '#FFFDFC', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
