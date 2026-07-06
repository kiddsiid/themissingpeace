// Printables index — day-of stationery generated from live planning data.
import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';

const ITEMS = [
  { kind: 'escort-cards', title: 'Escort cards', desc: 'Alphabetical cards telling each guest their table — straight from the Seating Studio.' },
  { kind: 'place-cards', title: 'Place cards', desc: 'Per-seat cards with each guest’s name and meal choice, grouped by table.' },
  { kind: 'table-numbers', title: 'Table numbers', desc: 'Large numbered cards for every table in the room.' },
  { kind: 'seating-sign', title: 'Seating chart sign', desc: 'One elegant "find your seat" sign listing every table and its guests.' },
  { kind: 'menu', title: 'Menu cards', desc: 'A dinner menu assembled from your guests’ meal choices.' },
  { kind: 'save-the-date', title: 'Save the date', desc: 'A simple, lovely announcement card — names, date, and your Master Vision mood.' },
  { kind: 'invitation', title: 'Invitation', desc: 'The formal ask, ready to print or screenshot for digital sends.' },
];

export default async function PrintablesPage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Paper, from your plan</p>
      <h1 className="voice text-4xl">Printables</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Every card below is generated from your live data — guest list, RSVPs, meals, and seating. Change the plan, reprint the paper.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {ITEMS.map((it) => (
          <a
            key={it.kind}
            href={`/print/${it.kind}`}
            target="_blank"
            className="rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
          >
            <h2 className="voice text-xl">{it.title} <span className="text-xs text-[var(--ink-faint)]">↗</span></h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{it.desc}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-[var(--ink-faint)]">Each opens in a new tab with a print button — or use your browser's print to save as PDF.</p>
    </div>
  );
}
