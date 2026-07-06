import { describe, it, expect } from 'vitest';
import { overdueTasks, missingVendorCategories, projectedOverage, budgetPerGuest, deriveRisks, vendorProgress, type Snapshot } from '@/lib/engine/rules';

const base: Snapshot = {
  today: '2026-07-01',
  weddingDate: '2027-06-01',
  guestEstimate: 120,
  budgetTotal: 60000,
  budgetItems: [
    { categoryName: 'Venue', estimatedCost: 20000, committedCost: 22000 },
    { categoryName: 'Catering', estimatedCost: 18000 },
  ],
  vendors: [
    { category: 'venue', status: 'booked' },
    { category: 'caterer', status: 'shortlisted' },
  ],
  tasks: [
    { status: 'not_started', dueDate: '2026-06-01' }, // overdue
    { status: 'done', dueDate: '2026-06-01' },         // not counted
    { status: 'in_progress', dueDate: '2027-01-01' },  // future
  ],
  decisionsOpen: 6,
  weddingType: 'local',
};

describe('peace engine deterministic rules', () => {
  it('counts only unfinished, past-due tasks', () => {
    expect(overdueTasks(base)).toBe(1);
  });
  it('finds missing core vendor categories', () => {
    const missing = missingVendorCategories(base);
    expect(missing).toContain('photographer');
    expect(missing).toContain('officiant');
    expect(missing).toContain('florist');
    expect(missing).not.toContain('venue');
  });
  it('computes committed total + projected overage', () => {
    // committed: 22000 (venue committed) + 18000 (catering est fallback) = 40000
    expect(projectedOverage(base)).toBe(-20000);
  });
  it('computes budget per guest rounded', () => {
    expect(budgetPerGuest(base)).toBe(500);
  });
  it('flags a decision bottleneck at >=5 open', () => {
    expect(deriveRisks(base).some((r) => r.type === 'decision_bottleneck')).toBe(true);
  });
  it('summarizes vendor progress', () => {
    expect(vendorProgress(base)).toEqual({ booked: 1, inProgress: 0, shortlisted: 1 });
  });
  it('adds outdoor extras to missing vendors for outdoor weddings', () => {
    expect(missingVendorCategories({ ...base, weddingType: 'outdoor' })).toContain('rental_company');
  });
});
