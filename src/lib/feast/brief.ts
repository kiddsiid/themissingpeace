import { stableSourceHash } from '@/lib/outputs/freshness';
import {
  briefReady,
  coverageForRequirement,
  hospitalityScore,
  type AssessmentInput,
} from './hospitality';
import type {
  CatererBriefSnapshot,
  ConfirmationEvidence,
  DishAssessment,
  FeastDish,
  FeastPlan,
  GuestRequirement,
  MealScene,
} from './types';

export interface BriefSource {
  plan: FeastPlan;
  scenes: MealScene[];
  dishes: FeastDish[];
  requirements: GuestRequirement[];
  evidence: ConfirmationEvidence[];
  assessments: DishAssessment[];
}

function assessmentInputs(
  requirement: GuestRequirement,
  assessments: DishAssessment[],
  evidenceIds: Set<string>,
): AssessmentInput[] {
  return assessments
    .filter((assessment) => assessment.requirement_code === requirement.code)
    .map((assessment) => ({
      state: assessment.state,
      hasEvidence: assessment.evidence_id ? evidenceIds.has(assessment.evidence_id) : false,
    }));
}

export function buildCatererBriefSnapshot(
  source: BriefSource,
  generatedAt = new Date().toISOString(),
): CatererBriefSnapshot {
  const evidenceIds = new Set(source.evidence.map((item) => item.id));
  const hospitalityItems = source.requirements.map((requirement) => ({
    requirement: {
      code: requirement.code,
      category: requirement.category,
      severity: requirement.severity,
    },
    assessments: assessmentInputs(requirement, source.assessments, evidenceIds),
  }));
  const hospitality = hospitalityScore(hospitalityItems);

  return {
    generated_at: generatedAt,
    plan: {
      intention: source.plan.intention,
      meal_shape: source.plan.meal_shape,
      service_feeling: source.plan.service_feeling,
      emotional_root: source.plan.emotional_root,
      hospitality_standard: source.plan.hospitality_standard,
      guest_count: source.plan.guest_count,
      currency: source.plan.currency,
    },
    scenes: source.scenes
      .filter((scene) => scene.status !== 'archived')
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((scene) => ({
        id: scene.id,
        title: scene.title,
        purpose: scene.purpose,
        order: scene.ordinal,
        service_style: scene.service_style,
        mood: scene.mood,
        timing: scene.planned_at,
        dishes: source.dishes
          .filter((dish) => dish.scene_id === scene.id)
          .map((dish) => ({
            id: dish.id,
            name: dish.name,
            role: dish.role,
            ingredients: dish.ingredients_json,
            presentation: dish.presentation,
            execution_notes: dish.execution_notes,
            service_style: dish.service_style,
            status: dish.status,
          })),
      })),
    requirements: source.requirements.map((requirement) => {
      const coverage = coverageForRequirement(
        {
          code: requirement.code,
          category: requirement.category,
          severity: requirement.severity,
        },
        assessmentInputs(requirement, source.assessments, evidenceIds),
      );
      return {
        id: requirement.id,
        guest_id: requirement.guest_id,
        category: requirement.category,
        code: requirement.code,
        severity: requirement.severity,
        notes: requirement.notes,
        coverage,
        open_confirmation: coverage === 'unknown' || coverage === 'needs_review' || coverage === 'conflict',
      };
    }),
    evidence: source.evidence.map((item) => ({
      id: item.id,
      source_type: item.source_type,
      source_name: item.source_name,
      confirmed_at: item.confirmed_at,
      expires_at: item.expires_at,
      notes: item.notes,
    })),
    presentation: {
      meal_shape: source.plan.meal_shape,
      service_feeling: source.plan.service_feeling,
      emotional_root: source.plan.emotional_root,
    },
    readiness: {
      ready: briefReady(hospitalityItems),
      hospitality_score: hospitality.score,
      open_confirmations: hospitality.openConfirmations,
      conflicts: hospitality.conflicts,
    },
  };
}

const SECTION_KEYS = [
  ['plan', 'Plan summary'],
  ['scenes', 'Meal flow'],
  ['requirements', 'Guest care'],
  ['evidence', 'Confirmations'],
  ['presentation', 'Presentation'],
  ['readiness', 'Readiness'],
] as const;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function changedBriefSections(
  current: CatererBriefSnapshot,
  previous?: CatererBriefSnapshot | null,
): string[] {
  if (!previous) return SECTION_KEYS.map(([, label]) => label);
  const changed: string[] = SECTION_KEYS
    .filter(([key]) => !same(current[key], previous[key]))
    .map(([, label]) => label);
  const previousDishes = previous.scenes.map((scene) => scene.dishes);
  const currentDishes = current.scenes.map((scene) => scene.dishes);
  if (!same(currentDishes, previousDishes) && !changed.includes('Dishes')) changed.push('Dishes');
  return changed;
}

export function catererBriefSourceHash(snapshot: CatererBriefSnapshot): string {
  return stableSourceHash({ ...snapshot, generated_at: '' });
}
