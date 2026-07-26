import { describe, it, expect } from 'vitest';
import {
  coverageForRequirement,
  hospitalityScore,
  briefReady,
  bestState,
  type Requirement,
  type AssessmentInput,
} from '@/lib/feast/hospitality';

const kosherCertified: Requirement = { code: 'kosher_certified', category: 'religious', severity: 'required' };
const nutAllergy: Requirement = { code: 'nut_allergy', category: 'allergy', severity: 'safety_critical' };
const halalMeat: Requirement = { code: 'halal_meat', category: 'religious', severity: 'required' };
const vegan: Requirement = { code: 'vegan', category: 'dietary', severity: 'required' };

describe('Feast hospitality coverage engine (FS-008)', () => {
  // §21 Religious requirement
  it('kosher style (ingredient compatible) does NOT satisfy certified kosher', () => {
    expect(coverageForRequirement(kosherCertified, [{ state: 'ingredient_compatible' }])).toBe('unknown');
  });
  it('vendor word is still not enough for certified kosher — needs the certificate', () => {
    expect(coverageForRequirement(kosherCertified, [{ state: 'vendor_confirmed', hasEvidence: true }])).toBe('unknown');
  });
  it('documented certification covers certified kosher', () => {
    expect(coverageForRequirement(kosherCertified, [{ state: 'certification_documented', hasEvidence: true }])).toBe('confirmed');
  });

  // §21 Allergy requirement
  it('ingredient compatibility alone leaves a nut allergy at needs_review, not safe', () => {
    expect(coverageForRequirement(nutAllergy, [{ state: 'ingredient_compatible' }])).toBe('needs_review');
  });
  it('vendor-confirmed prep + cross-contact covers the nut allergy', () => {
    expect(coverageForRequirement(nutAllergy, [{ state: 'vendor_confirmed', hasEvidence: true }])).toBe('confirmed');
  });
  it('a confirmed state with NO evidence is downgraded (evidence-guarded)', () => {
    expect(coverageForRequirement(nutAllergy, [{ state: 'vendor_confirmed', hasEvidence: false }])).toBe('needs_review');
  });

  // religious required (non-certified) + dietary
  it('halal meat needs vendor confirmation; ingredients alone → needs_review', () => {
    expect(coverageForRequirement(halalMeat, [{ state: 'ingredient_compatible' }])).toBe('needs_review');
    expect(coverageForRequirement(halalMeat, [{ state: 'vendor_confirmed', hasEvidence: true }])).toBe('confirmed');
  });
  it('vegan is covered by ingredient compatibility (not safety-critical)', () => {
    expect(coverageForRequirement(vegan, [{ state: 'ingredient_compatible' }])).toBe('compatible');
  });

  it('a known incompatibility surfaces as conflict', () => {
    expect(coverageForRequirement(vegan, [{ state: 'conflict' }])).toBe('conflict');
  });
  it('bestState picks the strongest evidence-guarded assessment', () => {
    expect(bestState([{ state: 'unknown' }, { state: 'ingredient_compatible' }, { state: 'vendor_confirmed', hasEvidence: true }])).toBe('vendor_confirmed');
  });
});

describe('Hospitality Score + brief readiness', () => {
  it('scores a mixed plan between 0 and 1, weighted by severity', () => {
    const r = hospitalityScore([
      { requirement: nutAllergy, assessments: [{ state: 'ingredient_compatible' }] },  // needs_review
      { requirement: vegan, assessments: [{ state: 'ingredient_compatible' }] },         // compatible
      { requirement: kosherCertified, assessments: [{ state: 'unknown' }] },             // unknown
    ]);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(1);
    expect(r.counts.needs_review).toBe(1);
    expect(r.counts.compatible).toBe(1);
    expect(r.openConfirmations).toContain('nut_allergy');
    expect(r.openConfirmations).toContain('kosher_certified');
  });

  it('a fully confirmed plan scores 1', () => {
    const r = hospitalityScore([
      { requirement: nutAllergy, assessments: [{ state: 'vendor_confirmed', hasEvidence: true }] },
      { requirement: kosherCertified, assessments: [{ state: 'certification_documented', hasEvidence: true }] },
    ]);
    expect(r.score).toBe(1);
    expect(r.conflicts).toHaveLength(0);
  });

  it('briefReady is false while a safety-critical gap or conflict is open', () => {
    expect(briefReady([{ requirement: nutAllergy, assessments: [{ state: 'ingredient_compatible' }] }])).toBe(false);
    expect(briefReady([{ requirement: nutAllergy, assessments: [{ state: 'vendor_confirmed', hasEvidence: true }] }])).toBe(true);
    expect(briefReady([{ requirement: kosherCertified, assessments: [{ state: 'vendor_confirmed', hasEvidence: true }] }])).toBe(false);
  });
});
