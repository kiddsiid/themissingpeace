// Hospitality coverage engine (Phase 5, FS-007/008/009) — the deterministic trust
// core of the Feast Studio. Pure + I/O-free so it is fully unit-testable without a
// render or a model call, exactly like ripple.ts / atmosphere.ts.
//
// Non-negotiable rules from the redesign spec (§9, §21):
//  - "safe" is never a universal status; the system says exactly what was checked.
//  - "Kosher style, not certified" (an ingredient-level compatibility) NEVER satisfies
//    a certified-kosher requirement — it stays Unknown until certification is documented.
//  - Ingredient compatibility ALONE never marks an allergy requirement covered — it stays
//    Needs review until preparation / cross-contact is vendor-confirmed.
//  - A "confirmed" state only counts when it is backed by an evidence record.

export type AssessmentState =
  | 'unknown'
  | 'ingredient_compatible'
  | 'vendor_confirmed'
  | 'certification_documented'
  | 'conflict';

export type RequirementCategory = 'religious' | 'dietary' | 'allergy' | 'preparation' | 'preference';
export type Severity = 'preference' | 'required' | 'safety_critical';

export interface Requirement {
  code: string;                 // e.g. 'kosher_certified' | 'nut_allergy' | 'vegan'
  category: RequirementCategory;
  severity: Severity;
}

export interface AssessmentInput {
  state: AssessmentState;
  hasEvidence?: boolean;        // is a confirmation evidence record attached?
}

// Coverage is the outcome for a whole requirement across the best available dish.
export type Coverage = 'unknown' | 'needs_review' | 'compatible' | 'confirmed' | 'conflict';

const STRENGTH: Record<AssessmentState, number> = {
  conflict: -1,
  unknown: 0,
  ingredient_compatible: 1,
  vendor_confirmed: 2,
  certification_documented: 3,
};

/** A confirmed state only stands if evidence backs it; otherwise it is downgraded. */
function effectiveState(a: AssessmentInput): AssessmentState {
  if ((a.state === 'vendor_confirmed' || a.state === 'certification_documented') && a.hasEvidence === false) {
    return 'ingredient_compatible';
  }
  return a.state;
}

/** Does a requirement code demand a formal certificate (not just vendor word)? */
function requiresCertification(req: Requirement): boolean {
  return /(_certified|_certification|kosher_certified|passover)/.test(req.code);
}

/** The single best (strongest, evidence-guarded) assessment across a dish set. */
export function bestState(assessments: AssessmentInput[]): AssessmentState {
  let best: AssessmentState = 'unknown';
  let hasConflict = false;
  for (const a of assessments) {
    const s = effectiveState(a);
    if (s === 'conflict') hasConflict = true;
    else if (STRENGTH[s] > STRENGTH[best]) best = s;
  }
  // A conflict only wins if nothing actually covers the requirement.
  if (hasConflict && STRENGTH[best] < STRENGTH.vendor_confirmed) return 'conflict';
  return best;
}

/**
 * Pure: coverage for one requirement given the assessments of the dishes offered to
 * that guest. Encodes the certified-kosher and allergy rules deterministically.
 */
export function coverageForRequirement(req: Requirement, assessments: AssessmentInput[]): Coverage {
  const best = bestState(assessments);
  if (best === 'conflict') return 'conflict';

  // Certified requirements: only a documented certificate counts. Anything less
  // (including vendor word or "kosher style") stays Unknown — never partial credit.
  if (requiresCertification(req)) {
    return best === 'certification_documented' ? 'confirmed' : 'unknown';
  }

  const needsConfirmation =
    req.severity === 'safety_critical' ||           // allergies
    (req.category === 'religious' && req.severity !== 'preference'); // halal meat, no pork, etc.

  if (needsConfirmation) {
    if (best === 'certification_documented' || best === 'vendor_confirmed') return 'confirmed';
    if (best === 'ingredient_compatible') return 'needs_review';   // ingredients alone ≠ safe
    return 'unknown';
  }

  // Dietary / preparation / preference: ingredient compatibility is acceptable coverage.
  if (best === 'certification_documented' || best === 'vendor_confirmed') return 'confirmed';
  if (best === 'ingredient_compatible') return 'compatible';
  return 'unknown';
}

const SEVERITY_WEIGHT: Record<Severity, number> = { preference: 1, required: 2, safety_critical: 3 };
const COVERAGE_CREDIT: Record<Coverage, number> = {
  confirmed: 1,
  compatible: 0.85,
  needs_review: 0.4,
  unknown: 0,
  conflict: 0,
};

export interface HospitalityResult {
  score: number;                                   // 0..1, severity-weighted
  counts: Record<Coverage, number>;
  conflicts: string[];                             // requirement codes in conflict
  openConfirmations: string[];                     // codes that are unknown/needs_review
}

/**
 * Pure: the Hospitality Score + coverage breakdown across every guest requirement.
 * Each requirement is scored by its best dish coverage, weighted by severity so a
 * safety-critical gap costs more than a preference gap.
 */
export function hospitalityScore(
  items: { requirement: Requirement; assessments: AssessmentInput[] }[],
): HospitalityResult {
  const counts: Record<Coverage, number> = { unknown: 0, needs_review: 0, compatible: 0, confirmed: 0, conflict: 0 };
  const conflicts: string[] = [];
  const openConfirmations: string[] = [];
  let weighted = 0;
  let weight = 0;

  for (const { requirement, assessments } of items) {
    const cov = coverageForRequirement(requirement, assessments);
    counts[cov] += 1;
    const w = SEVERITY_WEIGHT[requirement.severity];
    weight += w;
    weighted += w * COVERAGE_CREDIT[cov];
    if (cov === 'conflict') conflicts.push(requirement.code);
    if (cov === 'unknown' || cov === 'needs_review') openConfirmations.push(requirement.code);
  }

  const score = weight === 0 ? 1 : Number((weighted / weight).toFixed(4));
  return { score, counts, conflicts, openConfirmations };
}

/** Is the plan safe to hand to a caterer? No conflicts and no open safety-critical gaps. */
export function briefReady(
  items: { requirement: Requirement; assessments: AssessmentInput[] }[],
): boolean {
  for (const { requirement, assessments } of items) {
    const cov = coverageForRequirement(requirement, assessments);
    if (cov === 'conflict') return false;
    if (requirement.severity === 'safety_critical' && cov !== 'confirmed') return false;
    if (requiresCertification(requirement) && cov !== 'confirmed') return false;
  }
  return true;
}
