import { describe, expect, it } from 'vitest';
import { feastPlanProgress } from '@/lib/canvas/progress';
import {
  buildCatererBriefSnapshot,
  catererBriefSourceHash,
  changedBriefSections,
  type BriefSource,
} from '@/lib/feast/brief';
import { createCatererBriefPdf } from '@/lib/feast/pdf';

function source(): BriefSource {
  return {
    plan: {
      workspace_id: 'workspace',
      intention: 'A generous family table',
      meal_shape: 'family_style',
      service_feeling: 'Warm and generous',
      emotional_root: 'Food that honors family',
      hospitality_standard: 'every',
      guest_count: 80,
      advisory_budget_total_cents: null,
      advisory_budget_per_guest_cents: 9000,
      currency: 'USD',
      status: 'in_progress',
      version: 3,
      updated_at: '2026-07-25T12:00:00.000Z',
    },
    scenes: [{
      id: 'scene-main',
      workspace_id: 'workspace',
      kind: 'main_course',
      title: 'Main Course',
      purpose: 'Share the heart of the meal.',
      ordinal: 0,
      planned_at: '7:30pm',
      duration_minutes: 60,
      service_style: 'Family style',
      mood: 'Candlelit',
      notes: '',
      status: 'in_progress',
      version: 2,
      created_at: '2026-07-25T12:00:00.000Z',
    }],
    dishes: [{
      id: 'dish-chicken',
      workspace_id: 'workspace',
      scene_id: 'scene-main',
      name: 'Saffron chicken',
      role: 'Shared main',
      ingredients_json: ['chicken', 'saffron'],
      story: '',
      presentation: 'Shared platters',
      execution_notes: 'Confirm separate preparation.',
      service_style: 'Family style',
      mood: 'Warm',
      advisory_cost_min_cents: 2200,
      advisory_cost_max_cents: 3000,
      status: 'needs_confirmation',
      source: 'manual',
      version: 1,
      created_at: '2026-07-25T12:00:00.000Z',
    }],
    requirements: [
      {
        id: 'req-kosher',
        workspace_id: 'workspace',
        guest_id: null,
        category: 'religious',
        code: 'kosher_certified',
        severity: 'required',
        notes: 'Certificate required.',
        created_at: '2026-07-25T12:00:00.000Z',
      },
      {
        id: 'req-nut',
        workspace_id: 'workspace',
        guest_id: null,
        category: 'allergy',
        code: 'nut_allergy',
        severity: 'safety_critical',
        notes: 'Preparation and cross-contact confirmation required.',
        created_at: '2026-07-25T12:00:00.000Z',
      },
    ],
    evidence: [],
    assessments: [
      {
        id: 'assessment-kosher',
        workspace_id: 'workspace',
        dish_id: 'dish-chicken',
        requirement_code: 'kosher_certified',
        state: 'ingredient_compatible',
        reasoning: 'Kosher style, not certified.',
        evidence_id: null,
        assessed_by: 'system',
        assessed_at: '2026-07-25T12:00:00.000Z',
      },
      {
        id: 'assessment-nut',
        workspace_id: 'workspace',
        dish_id: 'dish-chicken',
        requirement_code: 'nut_allergy',
        state: 'ingredient_compatible',
        reasoning: 'Ingredients reviewed only.',
        evidence_id: null,
        assessed_by: 'system',
        assessed_at: '2026-07-25T12:00:00.000Z',
      },
    ],
  };
}

describe('Phase 5 Feast projections', () => {
  it('keeps certified kosher unknown and nut allergy at needs review without evidence', () => {
    const snapshot = buildCatererBriefSnapshot(source(), '2026-07-25T13:00:00.000Z');
    expect(snapshot.requirements.find((item) => item.code === 'kosher_certified')?.coverage).toBe('unknown');
    expect(snapshot.requirements.find((item) => item.code === 'nut_allergy')?.coverage).toBe('needs_review');
    expect(snapshot.readiness.ready).toBe(false);
  });

  it('detects changed sections without mutating the prior snapshot', () => {
    const previous = buildCatererBriefSnapshot(source(), '2026-07-25T13:00:00.000Z');
    const nextSource = source();
    nextSource.dishes[0] = { ...nextSource.dishes[0], service_style: 'Plated' };
    const current = buildCatererBriefSnapshot(nextSource, '2026-07-25T14:00:00.000Z');
    expect(changedBriefSections(current, previous)).toContain('Dishes');
    expect(previous.scenes[0].dishes[0].service_style).toBe('Family style');
  });

  it('ignores generation time in the source hash', () => {
    const first = buildCatererBriefSnapshot(source(), '2026-07-25T13:00:00.000Z');
    const second = buildCatererBriefSnapshot(source(), '2026-07-25T14:00:00.000Z');
    expect(catererBriefSourceHash(first)).toBe(catererBriefSourceHash(second));
  });

  it('creates a valid private PDF payload', async () => {
    const snapshot = buildCatererBriefSnapshot(source(), '2026-07-25T13:00:00.000Z');
    const bytes = await createCatererBriefPdf(snapshot, 3);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('derives the Living Canvas ring from canonical Feast scenes', () => {
    const progress = feastPlanProgress(
      [{ id: 'one', status: 'ready' }, { id: 'two', status: 'in_progress' }, { id: 'archived', status: 'archived' }],
      [{ scene_id: 'one' }, { scene_id: 'two' }],
    );
    expect(progress.pct).toBe(100);
    expect(progress.statusLabel).toBe('2 of 2 moments shaped');
    expect(progress.statusSub).toContain('1 ready');
  });
});

