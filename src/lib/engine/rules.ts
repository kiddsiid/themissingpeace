// Deterministic rule pack — the reliable half of the Peace Engine (Build Plan v2 §6.3).
// Pure functions over a workspace snapshot; no AI, no I/O. The AI layer (peacekeeper.ts)
// adds meaning/judgment on top. Everything here must be exact and unit-testable.

import type { VendorStatus, TaskStatus, RiskType } from '@/lib/types';

export interface Snapshot {
  today: string; // ISO date
  weddingDate?: string | null;
  guestEstimate?: number | null;
  budgetTotal?: number | null;
  budgetItems: { categoryName?: string; estimatedCost?: number | null; committedCost?: number | null }[];
  vendors: { category: string; status: VendorStatus }[];
  tasks: { status: TaskStatus; dueDate?: string | null }[];
  decisionsOpen: number;
  weddingType?: 'local' | 'domestic' | 'international' | 'outdoor' | null;
}

export interface Fact { kind: string; value: number | string; detail?: string }
export interface DerivedRisk { type: RiskType; title: string; severity: 'low' | 'med' | 'high' }

// Vendor categories every wedding generally needs; outdoor adds a few (spec §10/§12 examples).
const CORE_VENDORS = ['venue', 'caterer', 'photographer', 'officiant', 'florist'];
const OUTDOOR_EXTRAS = ['rental_company']; // + lighting/weather backup/restrooms tracked as tasks

export function overdueTasks(s: Snapshot): number {
  return s.tasks.filter((t) => t.dueDate && t.dueDate < s.today && t.status !== 'done' && t.status !== 'skipped').length;
}

export function missingVendorCategories(s: Snapshot): string[] {
  const have = new Set(s.vendors.map((v) => v.category));
  const needed = [...CORE_VENDORS, ...(s.weddingType === 'outdoor' ? OUTDOOR_EXTRAS : [])];
  return needed.filter((c) => !have.has(c));
}

export function committedTotal(s: Snapshot): number {
  return Math.round(s.budgetItems.reduce((sum, b) => sum + (b.committedCost ?? b.estimatedCost ?? 0), 0));
}

export function projectedOverage(s: Snapshot): number {
  if (!s.budgetTotal) return 0;
  return Math.round(committedTotal(s) - s.budgetTotal);
}

export function budgetPerGuest(s: Snapshot): number | null {
  if (!s.budgetTotal || !s.guestEstimate) return null;
  return Math.round(s.budgetTotal / s.guestEstimate);
}

export function vendorProgress(s: Snapshot) {
  const booked = new Set<VendorStatus>(['booked', 'paid_deposit', 'fully_paid']);
  const inquiring = new Set<VendorStatus>(['inquired', 'responded', 'quote_received', 'comparing', 'selected']);
  let b = 0, i = 0, sl = 0;
  for (const v of s.vendors) { if (booked.has(v.status)) b++; else if (inquiring.has(v.status)) i++; else if (v.status === 'shortlisted') sl++; }
  return { booked: b, inProgress: i, shortlisted: sl };
}

// Deterministic risks (the AI layer may add dream_mismatch etc. with judgment).
export function deriveRisks(s: Snapshot): DerivedRisk[] {
  const risks: DerivedRisk[] = [];
  if (projectedOverage(s) > 0) risks.push({ type: 'budget', title: `Projected over budget by ${projectedOverage(s)}.`, severity: 'high' });
  if (missingVendorCategories(s).length > 0) risks.push({ type: 'vendor_booking', title: `Missing core vendors: ${missingVendorCategories(s).join(', ')}.`, severity: 'med' });
  if (overdueTasks(s) > 0) risks.push({ type: 'timeline', title: `${overdueTasks(s)} task(s) overdue.`, severity: overdueTasks(s) > 3 ? 'high' : 'med' });
  if (s.decisionsOpen >= 5) risks.push({ type: 'decision_bottleneck', title: `${s.decisionsOpen} decisions still open.`, severity: 'med' });
  if (!s.weddingDate && !s.guestEstimate) risks.push({ type: 'guest_count', title: 'No guest range yet — the largest cost driver is undefined.', severity: 'med' });
  return risks;
}

// A compact fact list the AI layer can reason over (kept deterministic + cheap).
export function facts(s: Snapshot): Fact[] {
  const out: Fact[] = [
    { kind: 'committed_total', value: committedTotal(s) },
    { kind: 'projected_overage', value: projectedOverage(s) },
    { kind: 'overdue_tasks', value: overdueTasks(s) },
    { kind: 'open_decisions', value: s.decisionsOpen },
    { kind: 'missing_vendors', value: missingVendorCategories(s).join(',') || 'none' },
  ];
  const ppg = budgetPerGuest(s);
  if (ppg !== null) out.push({ kind: 'budget_per_guest', value: ppg });
  return out;
}
