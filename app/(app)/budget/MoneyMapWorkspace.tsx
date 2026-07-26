'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  createBudgetScenario,
  createContribution,
  createMoneyMapCategory,
  createMoneyMapItem,
  createPaymentMilestone,
  deleteMoneyMapItem,
  saveMoneyMapSetup,
  updatePaymentMilestoneStatus,
} from '@/app/(app)/budget/actions';
import { estimateMoneyMap, type BudgetFit, type MoneyMapEstimate } from '@/lib/engine/money-map';
import type { DreamResponses } from '@/lib/engine/compass';

type Profile = {
  wedding_location?: string | null;
  wedding_type?: string | null;
  budget_total?: number | string | null;
  budget_confidence?: string | null;
  guest_estimate?: number | string | null;
  guest_max?: number | string | null;
};

type Category = { id: string; name: string; planned_amount?: number | string | null; sort?: number | null };
type Vendor = { id: string; name: string; category?: string | null; status?: string | null; quote_amount?: number | string | null };
type BudgetItem = {
  id: string;
  category_id?: string | null;
  vendor_id?: string | null;
  title: string;
  estimated_cost?: number | string | null;
  quoted_cost?: number | string | null;
  committed_cost?: number | string | null;
  paid_amount?: number | string | null;
  deposit_due?: string | null;
  final_due?: string | null;
  notes?: string | null;
};
type PaymentMilestone = {
  id: string;
  title: string;
  amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
  budget_item_id?: string | null;
  vendor_id?: string | null;
  responsible_name?: string | null;
};
type Contribution = {
  id: string;
  contributor_name: string;
  promised_amount?: number | string | null;
  received_amount?: number | string | null;
  intended_for?: string | null;
  visibility?: string | null;
};
type Scenario = {
  id: string;
  name: string;
  wedding_type?: string | null;
  guest_count?: number | string | null;
  target_budget?: number | string | null;
  projected_total?: number | string | null;
  budget_fit?: string | null;
  tradeoff_notes?: string | null;
};
type Compass = { summary?: string | null; tone?: string | null; priorities_json?: string[] | null } | null;

type Props = {
  profile: Profile | null;
  categories: Category[];
  items: BudgetItem[];
  vendors: Vendor[];
  payments: PaymentMilestone[];
  contributions: Contribution[];
  scenarios: Scenario[];
  dream: DreamResponses | null;
  compass: Compass;
  projectionDrivers: { label: string; value: string; source: string }[];
  latestChange: string | null;
};

const WEDDING_TYPES = [
  { value: 'local', label: 'Local wedding' },
  { value: 'venue_based', label: 'Venue based' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'backyard', label: 'Backyard' },
  { value: 'domestic_destination', label: 'Domestic destination' },
  { value: 'international_destination', label: 'International destination' },
  { value: 'multi_day', label: 'Multi-day celebration' },
];

const FIT_STYLES: Record<BudgetFit, string> = {
  peaceful: 'bg-[var(--sage-bg)] text-[#566049] border-[#C9D3C1]',
  close: 'bg-[var(--gold-bg)] text-[var(--gold)] border-[#E4D3A7]',
  stretched: 'bg-[var(--clay-bg)] text-[var(--clay-ink)] border-[#E8C3B5]',
  'at risk': 'bg-[#F4DEDC] text-[#8B3E35] border-[#E8B5AE]',
};

function asNumber(value: number | string | null | undefined, fallback = 0) {
  if (value == null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number | string | null | undefined, empty = 'Not set') {
  if (value == null || value === '') return empty;
  const parsed = asNumber(value, NaN);
  if (!Number.isFinite(parsed)) return empty;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parsed);
}

function label(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'Not set';
}

function itemProjection(item: BudgetItem) {
  return asNumber(item.committed_cost ?? item.quoted_cost ?? item.estimated_cost);
}

function itemStage(item: BudgetItem) {
  if (asNumber(item.paid_amount) >= itemProjection(item) && itemProjection(item) > 0) return 'paid';
  if (item.committed_cost != null) return 'committed';
  if (item.quoted_cost != null) return 'quoted';
  if (item.estimated_cost != null) return 'estimated';
  return 'unknown';
}

function byDate(a?: string | null, b?: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function categoryName(categories: Category[], id?: string | null) {
  return categories.find((category) => category.id === id)?.name ?? 'Unassigned';
}

function fitPercent(estimate: MoneyMapEstimate) {
  return Math.max(8, Math.min(100, Math.round(estimate.fitRatio * 100)));
}

function dreamPriorities(dream: DreamResponses | null, compass: Compass) {
  return [...(compass?.priorities_json ?? []), ...(dream?.priorities ?? [])].filter(Boolean);
}

function Metric({ label: title, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <section className="rounded-[8px] border border-[var(--line)] bg-[rgba(252,249,243,.78)] p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">{title}</p>
      <p className="mt-1 text-xl text-[var(--ink)]">{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{detail}</p>}
    </section>
  );
}

export function MoneyMapWorkspace({
  profile,
  categories,
  items,
  vendors,
  payments,
  contributions,
  scenarios,
  dream,
  compass,
  projectionDrivers,
  latestChange,
}: Props) {
  const reduceMotion = useReducedMotion();
  const priorities = useMemo(() => dreamPriorities(dream, compass), [dream, compass]);
  const [location, setLocation] = useState(profile?.wedding_location || 'National average');
  const [guestCount, setGuestCount] = useState(String(profile?.guest_estimate || profile?.guest_max || 117));
  const [targetBudget, setTargetBudget] = useState(String(profile?.budget_total || 34200));
  const [weddingType, setWeddingType] = useState(profile?.wedding_type || 'local');
  const [budgetConfidence, setBudgetConfidence] = useState(profile?.budget_confidence || 'unknown');

  const estimate = useMemo(
    () => estimateMoneyMap({
      location,
      guestCount: asNumber(guestCount, 117),
      targetBudget: asNumber(targetBudget, 34200),
      weddingType,
      budgetConfidence,
      dreamPriorities: priorities,
      categoryNames: categories.map((category) => category.name),
    }),
    [location, guestCount, targetBudget, weddingType, budgetConfidence, priorities, categories],
  );

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, { projected: number; paid: number; committed: number; count: number }>();
    items.forEach((item) => {
      const key = item.category_id || 'unassigned';
      const current = totals.get(key) ?? { projected: 0, paid: 0, committed: 0, count: 0 };
      current.projected += itemProjection(item);
      current.paid += asNumber(item.paid_amount);
      current.committed += asNumber(item.committed_cost);
      current.count += 1;
      totals.set(key, current);
    });
    return totals;
  }, [items]);

  const realProjection = items.reduce((sum, item) => sum + itemProjection(item), 0);
  const projectedTotal = Math.max(realProjection, estimate.midpoint);
  const committedSpend = items.reduce((sum, item) => sum + asNumber(item.committed_cost), 0);
  const quotedSpend = items.reduce((sum, item) => sum + asNumber(item.quoted_cost), 0);
  const paidAmount = items.reduce((sum, item) => sum + asNumber(item.paid_amount), 0);
  const unpaidBalance = Math.max(0, projectedTotal - paidAmount);
  const remainingCushion = estimate.targetBudget - projectedTotal;
  const projectedOverage = Math.max(0, projectedTotal - estimate.targetBudget);
  const promisedTotal = contributions.reduce((sum, contribution) => sum + asNumber(contribution.promised_amount), 0);
  const receivedTotal = contributions.reduce((sum, contribution) => sum + asNumber(contribution.received_amount), 0);

  const derivedPayments: PaymentMilestone[] = items.flatMap((item) => {
    const rows: PaymentMilestone[] = [];
    if (item.deposit_due) rows.push({ id: `${item.id}-deposit`, title: `${item.title} deposit`, amount: item.committed_cost ?? item.quoted_cost ?? item.estimated_cost, due_date: item.deposit_due, status: 'planned', budget_item_id: item.id, vendor_id: item.vendor_id });
    if (item.final_due) rows.push({ id: `${item.id}-final`, title: `${item.title} final payment`, amount: item.committed_cost ?? item.quoted_cost ?? item.estimated_cost, due_date: item.final_due, status: 'planned', budget_item_id: item.id, vendor_id: item.vendor_id });
    return rows;
  });
  const allPayments = [...payments, ...derivedPayments].sort((a, b) => byDate(a.due_date, b.due_date));
  const upcomingPayments = allPayments.filter((payment) => payment.status !== 'paid').slice(0, 5);

  const categoryRows = (categories.length ? categories : estimate.categorySuggestions.map((item, index) => ({ id: `suggestion-${index}`, name: item.name, planned_amount: item.amount, sort: index }))).map((category) => {
    const suggestion = estimate.categorySuggestions.find((item) => item.name === category.name);
    const totals = categoryTotals.get(category.id) ?? { projected: 0, paid: 0, committed: 0, count: 0 };
    const planned = asNumber(category.planned_amount, suggestion?.amount ?? 0);
    return {
      ...category,
      planned,
      projected: totals.projected,
      paid: totals.paid,
      committed: totals.committed,
      count: totals.count,
      suggestion,
      pressure: planned ? totals.projected / planned : 0,
    };
  });

  const generatedScenarios = useMemo(() => {
    const baseGuests = estimate.guestCount;
    const scenarioInputs = [
      { name: 'Intimate version', guestCount: Math.max(20, baseGuests - 40), weddingType, targetBudget: estimate.targetBudget, note: 'A smaller guest list usually frees money in food, bar, rentals, stationery, and favors.' },
      { name: 'Full family version', guestCount: baseGuests + 35, weddingType, targetBudget: estimate.targetBudget, note: 'A larger guest list keeps connection wide, but guest-driven categories rise first.' },
      { name: 'Food-first version', guestCount: baseGuests, weddingType, targetBudget: estimate.targetBudget, note: 'Protects hospitality before florals, upgrades, favors, and premium rentals.' },
    ];
    return scenarioInputs.map((scenario) => ({ ...scenario, estimate: estimateMoneyMap({ ...scenario, location, budgetConfidence, dreamPriorities: priorities, categoryNames: categories.map((category) => category.name) }) }));
  }, [estimate, weddingType, location, budgetConfidence, priorities, categories]);

  return (
    <div className="relative mx-auto max-w-7xl">
      <span className="dream-twinkle" style={{ left: '3%', top: 4, fontSize: 13 }}>+</span>
      <span className="dream-twinkle" style={{ right: '4%', top: 34, fontSize: 16, animationDelay: '1s' }}>+</span>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Financial planning engine</p>
          <h1 className="voice text-5xl leading-none">Money Map</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">A calm forecast for what the wedding can hold, where money may feel tight, and whether spending is still protecting the Dream.</p>
        </div>
        <div className={`rounded-full border px-4 py-2 text-sm capitalize ${FIT_STYLES[estimate.fit]}`}>{estimate.fit}</div>
      </div>

      <section className="mt-5 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">Live advisory · no duplicate total</p>
            <h2 className="voice mt-1 text-2xl">What is driving this map</h2>
          </div>
          {latestChange && <p className="max-w-md text-right text-xs leading-5 text-[var(--ink-soft)]">Latest change · {latestChange}</p>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {projectionDrivers.map((driver) => (
            <div key={driver.label} className="rounded-[10px] bg-[var(--cream)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">{driver.source}</p>
              <p className="mt-1 text-sm text-[var(--ink)]">{driver.value}</p>
              <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{driver.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--pearl)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.25fr]">
          <form action={saveMoneyMapSetup} className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
            <input type="hidden" name="dream_priorities" value={priorities.join('|')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-[var(--ink-soft)]">Wedding location</span>
                <input name="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Charlotte, NC" className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--ink-soft)]">Wedding type</span>
                <select name="wedding_type" value={weddingType} onChange={(event) => setWeddingType(event.target.value)} className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">
                  {WEDDING_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-[var(--ink-soft)]">Estimated guest count</span>
                <input name="guest_count" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--ink-soft)]">Target budget</span>
                <input name="target_budget" value={targetBudget} onChange={(event) => setTargetBudget(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-[var(--ink-soft)]">Budget firmness</span>
                <select name="budget_confidence" value={budgetConfidence} onChange={(event) => setBudgetConfidence(event.target.value)} className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">
                  <option value="unknown">Still dreaming</option>
                  <option value="flexible">Flexible</option>
                  <option value="firm">Firm</option>
                </select>
              </label>
            </div>
            <button className="mt-4 rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">Save current map</button>
          </form>

          <div className="relative p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Budget fit reading</p>
                <h2 className="voice mt-1 text-3xl capitalize">{estimate.fit}</h2>
              </div>
              <p className="text-right text-sm text-[var(--ink-soft)]">{money(estimate.likelyLow)} - {money(estimate.likelyHigh)}</p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--cream)]">
              <motion.div
                className="h-full rounded-full bg-[var(--clay)]"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${fitPercent(estimate)}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">{estimate.holdSummary}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[8px] bg-[var(--cream)] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Local benchmark</p>
                <p className="mt-1 text-sm text-[var(--ink)]">{estimate.benchmark.locationName} average: {money(estimate.benchmark.averageCost)}</p>
              </div>
              <div className="rounded-[8px] bg-[var(--cream)] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Per guest</p>
                <p className="mt-1 text-sm text-[var(--ink)]">{money(estimate.perGuestTarget)} target / {money(estimate.perGuestMarket)} market map</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Target budget" value={money(estimate.targetBudget)} detail={budgetConfidence === 'firm' ? 'Treat this as a ceiling.' : 'Can flex if the Dream requires it.'} />
        <Metric label="Projected total" value={money(projectedTotal)} detail={realProjection ? 'Using known items plus the forecast floor.' : 'Using the local forecast until quotes arrive.'} />
        <Metric label="Remaining cushion" value={remainingCushion >= 0 ? money(remainingCushion) : money(0)} detail={projectedOverage ? `${money(projectedOverage)} projected overage` : 'Still protecting the buffer.'} />
        <Metric label="Paid / unpaid" value={`${money(paidAmount)} / ${money(unpaidBalance)}`} detail={`${money(committedSpend)} committed, ${money(quotedSpend)} quoted`} />
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Living containers</p>
              <h2 className="voice text-3xl">Category Map</h2>
            </div>
            <details className="rounded-full border border-[var(--line)] bg-[var(--pearl)] px-4 py-2 text-sm text-[var(--ink-soft)]">
              <summary className="cursor-pointer">Add category</summary>
              <form action={createMoneyMapCategory} className="mt-3 grid min-w-[260px] gap-2">
                <input name="name" required placeholder="Category name" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
                <input name="planned_amount" inputMode="numeric" placeholder="Planned amount" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
                <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add</button>
              </form>
            </details>
          </div>

          <div className="mt-3 space-y-2">
            {categoryRows.map((category) => {
              const width = Math.max(8, Math.min(100, Math.round(((category.projected || category.planned) / Math.max(estimate.targetBudget, 1)) * 100)));
              const firstCategoryItem = items.find((item) => item.category_id === category.id);
              const pressure = category.pressure > 1 ? 'Over planned' : category.pressure > 0.82 ? 'Close' : firstCategoryItem ? itemStage(firstCategoryItem) : 'Estimated';
              return (
                <article key={category.id} className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-[var(--ink)]">{category.name}</h3>
                      <p className="text-xs text-[var(--ink-faint)]">{category.suggestion?.compassProtected ? 'Compass protected' : `${category.count} item${category.count === 1 ? '' : 's'}`}</p>
                    </div>
                    <div className="text-right text-sm text-[var(--ink-soft)]">
                      <p>{money(category.projected || category.suggestion?.amount || category.planned)}</p>
                      <p className="text-[11px]">{pressure}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cream)]">
                    <motion.div className="h-full rounded-full bg-[var(--gold)]" initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.55 }} />
                  </div>
                  {category.suggestion?.reason && <p className="mt-2 text-[11px] leading-4 text-[var(--ink-faint)]">{category.suggestion.reason}</p>}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Wedding Compass</p>
            <h2 className="voice mt-1 text-2xl">Money compared to meaning</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{compass?.summary || 'Complete the Dream so Money Map can compare spending against the Wedding Compass.'}</p>
            <ul className="mt-3 space-y-2">
              {estimate.compassAlignment.map((note) => <li key={note} className="rounded-[8px] bg-[var(--cream)] px-3 py-2 text-xs leading-5 text-[var(--ink-soft)]">{note}</li>)}
            </ul>
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Pressure</p>
            <h2 className="voice mt-1 text-2xl">What may tighten first</h2>
            <ul className="mt-3 space-y-2">
              {estimate.pressurePoints.map((point) => <li key={point} className="text-sm leading-6 text-[var(--ink-soft)]">{point}</li>)}
            </ul>
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">First decisions</p>
            <ul className="mt-3 space-y-2">
              {estimate.firstDecisions.map((decision) => <li key={decision} className="rounded-[8px] bg-[var(--gold-bg)] px-3 py-2 text-xs leading-5 text-[var(--gold)]">{decision}</li>)}
            </ul>
          </section>
        </aside>
      </div>

      <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Estimated to paid</p>
            <h2 className="voice text-3xl">Money Flow</h2>
          </div>
          <details className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)]">
            <summary className="cursor-pointer">Add Money Map item</summary>
            <form action={createMoneyMapItem} className="mt-3 grid min-w-[320px] gap-2 sm:grid-cols-2">
              <select name="category_id" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="">Category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <select name="vendor_id" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="">Linked vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>
              <input name="title" required placeholder="Item name" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm sm:col-span-2" />
              <input name="estimated_cost" inputMode="numeric" placeholder="Estimate" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input name="quoted_cost" inputMode="numeric" placeholder="Quote" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input name="committed_cost" inputMode="numeric" placeholder="Committed" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input name="paid_amount" inputMode="numeric" placeholder="Paid" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input type="date" name="deposit_due" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input type="date" name="final_due" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input name="notes" placeholder="Package notes or contract detail" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm sm:col-span-2" />
              <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white sm:col-span-2">Add to Money Map</button>
            </form>
          </details>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {['estimated', 'quoted', 'committed', 'paid'].map((stage) => {
            const stageItems = items.filter((item) => itemStage(item) === stage);
            return (
              <section key={stage} className="rounded-[8px] bg-[var(--cream)] p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium capitalize text-[var(--ink)]">{stage}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[var(--ink-faint)]">{stageItems.length}</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {stageItems.length ? stageItems.slice(0, 5).map((item) => (
                    <li key={item.id} className="rounded-[8px] bg-[var(--pearl)] p-2 text-xs">
                      <div className="flex gap-2">
                        <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{item.title}</span>
                        <span className="text-[var(--ink-soft)]">{money(itemProjection(item))}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--ink-faint)]">
                        <span>{categoryName(categories, item.category_id)}</span>
                        <form action={deleteMoneyMapItem}><input type="hidden" name="id" value={item.id} /><button className="hover:text-[var(--clay-ink)]">Remove</button></form>
                      </div>
                    </li>
                  )) : <li className="text-xs leading-5 text-[var(--ink-faint)]">Nothing here yet.</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Milestones</p>
              <h2 className="voice text-2xl">Payments Coming Due</h2>
            </div>
            <span className="text-xs text-[var(--ink-faint)]">{upcomingPayments.length} next</span>
          </div>
          <ul className="mt-3 space-y-2">
            {upcomingPayments.length ? upcomingPayments.map((payment) => (
              <li key={payment.id} className="rounded-[8px] bg-[var(--cream)] p-3">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-[var(--ink)]">{payment.title}</span>
                  <span className="text-[var(--ink-soft)]">{money(payment.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--ink-faint)]">
                  <span>{payment.due_date || 'No due date'}</span>
                  {payments.some((row) => row.id === payment.id) && (
                    <form action={updatePaymentMilestoneStatus} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={payment.id} />
                      <select name="status" defaultValue={payment.status ?? 'planned'} className="rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[11px]">
                        <option value="planned">planned</option>
                        <option value="due">due</option>
                        <option value="paid">paid</option>
                        <option value="late">late</option>
                        <option value="waived">waived</option>
                      </select>
                      <button className="rounded-full bg-white px-2 py-1">Save</button>
                    </form>
                  )}
                </div>
              </li>
            )) : <li className="text-sm leading-6 text-[var(--ink-soft)]">Add deposits, final payments, refund dates, and gratuities as soon as they are known.</li>}
          </ul>
          <details className="mt-4 rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm text-[var(--ink-soft)]">
            <summary className="cursor-pointer">Add payment milestone</summary>
            <form action={createPaymentMilestone} className="mt-3 grid gap-2">
              <input name="title" required placeholder="Deposit, final payment, refund deadline" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="amount" inputMode="numeric" placeholder="Amount" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input type="date" name="due_date" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input type="date" name="reminder_date" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <select name="budget_item_id" className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"><option value="">Money Map item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              <input name="responsible_name" placeholder="Responsible person" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add milestone</button>
            </form>
          </details>
        </section>

        <section className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Contributions</p>
          <h2 className="voice mt-1 text-2xl">Family Support</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Promised" value={money(promisedTotal, '$0')} />
            <Metric label="Received" value={money(receivedTotal, '$0')} />
          </div>
          <ul className="mt-3 space-y-2">
            {contributions.slice(0, 4).map((contribution) => (
              <li key={contribution.id} className="rounded-[8px] bg-[var(--cream)] p-3 text-sm">
                <div className="flex justify-between gap-2"><span>{contribution.contributor_name}</span><span>{money(contribution.received_amount)} / {money(contribution.promised_amount)}</span></div>
                <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{contribution.intended_for || 'No category set'} - {contribution.visibility || 'private'}</p>
              </li>
            ))}
          </ul>
          <details className="mt-4 rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm text-[var(--ink-soft)]">
            <summary className="cursor-pointer">Add contribution</summary>
            <form action={createContribution} className="mt-3 grid gap-2">
              <input name="contributor_name" required placeholder="Contributor" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="promised_amount" inputMode="numeric" placeholder="Promised" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="received_amount" inputMode="numeric" placeholder="Received" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="intended_for" placeholder="Intended for" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <select name="visibility" className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"><option value="private">Private</option><option value="category_only">Category only</option><option value="shared">Shared</option></select>
              <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add support</button>
            </form>
          </details>
        </section>

        <section className="rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Scenarios</p>
          <h2 className="voice mt-1 text-2xl">Compare Versions</h2>
          <ul className="mt-3 space-y-2">
            {[...scenarios, ...generatedScenarios.map((scenario, index) => ({
              id: `generated-${index}`,
              name: scenario.name,
              wedding_type: scenario.weddingType,
              guest_count: scenario.guestCount,
              target_budget: scenario.targetBudget,
              projected_total: scenario.estimate.midpoint,
              budget_fit: scenario.estimate.fit,
              tradeoff_notes: scenario.note,
            }))].slice(0, 5).map((scenario) => (
              <li key={scenario.id} className="rounded-[8px] bg-[var(--cream)] p-3 text-sm">
                <div className="flex justify-between gap-2"><span className="text-[var(--ink)]">{scenario.name}</span><span className="capitalize text-[var(--ink-soft)]">{scenario.budget_fit || 'draft'}</span></div>
                <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{scenario.guest_count || '?'} guests - {money(scenario.projected_total)} projected</p>
                {scenario.tradeoff_notes && <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">{scenario.tradeoff_notes}</p>}
              </li>
            ))}
          </ul>
          <details className="mt-4 rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm text-[var(--ink-soft)]">
            <summary className="cursor-pointer">Save scenario</summary>
            <form action={createBudgetScenario} className="mt-3 grid gap-2">
              <input name="name" required placeholder="Scenario name" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="guest_count" defaultValue={estimate.guestCount} inputMode="numeric" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="target_budget" defaultValue={estimate.targetBudget} inputMode="numeric" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input name="projected_total" defaultValue={estimate.midpoint} inputMode="numeric" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <input type="hidden" name="budget_fit" value={estimate.fit} />
              <input type="hidden" name="wedding_type" value={weddingType} />
              <input name="tradeoff_notes" placeholder="Tradeoff note" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
              <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Save scenario</button>
            </form>
          </details>
        </section>
      </div>

      <section className="mt-8 rounded-[8px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Estimate source</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {estimate.assumptions.map((assumption) => <p key={assumption} className="rounded-[8px] bg-[var(--cream)] px-3 py-2 text-xs leading-5 text-[var(--ink-soft)]">{assumption}</p>)}
        </div>
      </section>
    </div>
  );
}
