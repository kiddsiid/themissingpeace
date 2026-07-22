// Living Canvas shared data model.
//
// Mirrors the `board.{food,palette,attire,inspirations}` slice defined in the
// design handoff's `wedding-state.js`. This is the canonical *shape* used by the
// Living Canvas hub and the three creative studios (Feast, Atmosphere, Atelier).
// Persistence in the app is via Supabase (see `store.ts`), not localStorage.

export type HospitalityStandard = 'simple' | 'thoughtful' | 'every';
export type StudioMode = 'couple' | 'planner' | 'vendor';
export type DishCost = 'gentle' | 'moderate' | 'higher';

export type CourseSlot =
  | 'welcome' | 'grazing' | 'starter' | 'main' | 'dessert' | 'late' | 'tea';

export interface FeastDish {
  id: string;
  name: string;
  story: string;
  plate: string;
  tags: string[];
  restrictions: string[];
  compliance: string;
  execution: string;
  blessed: boolean;
  cost: DishCost;
}

export interface FeastCourse {
  id: string;
  name: string;
  scene: string;
  slot: CourseSlot;
  mood: string;
  service: string;
  staffing: string;
  rental: string;
  timing: string;
  dishes: FeastDish[];
}

export type RestrictionCategory =
  | 'dietary_requirement' | 'ingredient_restriction' | 'allergy'
  | 'religious_compliance' | 'preference';

export interface FeastRestriction {
  id: string;
  label: string;
  category: RestrictionCategory;
  verify: boolean;
  verified: boolean;
  notes: string;
}

export interface GuestCoverage {
  id: string;
  guestType: string;
  icon: string;
  restrictions: string[];
}

export interface Cocktail {
  id: string;
  name: string;
  recipe: string;
}

export interface FeastBoard {
  identity: string;
  style: string;
  season: string;
  prompt: string;
  serviceFeeling: string;
  emotionalRoot: string;
  hospitalityStandard: HospitalityStandard;
  mode: StudioMode;
  moods: string[];
  courses: FeastCourse[];
  restrictions: FeastRestriction[];
  guestCoverage: GuestCoverage[];
  presentation: string[];
  bar: string;
  moments: { welcome: boolean; cocktail: boolean; latenight: boolean };
  cocktails: Cocktail[];
  notes: string;
}

export interface PaletteJourneyMoment {
  id: string;
  moment: string;
  colors: string[];
}

export interface PaletteBoard {
  name: string;
  colors: string[];       // 5 hex values, indexed by role
  roles: string[];        // Primary / Secondary / Accent / Neutral / Ink
  atmosphere: string[];   // feeling words
  journey: PaletteJourneyMoment[];
}

export interface AtelierLook {
  id: string;
  party: string;          // person / role label (e.g. Bride, Groom)
  title: string;
  color: string;
  accent: string;
  notes: string;
  details: Record<string, string>;
  approvals: Record<string, boolean>; // approver role -> approved
}

export interface AttireBoard {
  dressCode: string;
  rules: string[];
  looks: AtelierLook[];
}

export interface Inspiration {
  id: string;
  title: string;
  tag: string;            // Hospitality | Atmosphere | Feeling | Attire | Aesthetic
  room: RoomKey;
}

export type RoomKey = 'feast' | 'atmosphere' | 'atelier';

export interface CanvasBoard {
  food: FeastBoard;
  palette: PaletteBoard;
  attire: AttireBoard;
  inspirations: Inspiration[];
}

// Bits of the wider wedding state the studios read (light/season/palette-name).
export interface CanvasContext {
  projectName: string;
  compassSentence: string;
  season: string;
  light: string;
  weddingPalette: string; // wedding.palette — aligned when === board.palette.name
  approverRoles: string[]; // workspace members used as Atelier approvers
}
