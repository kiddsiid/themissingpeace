// Seating Studio page (0012 / North Star Wave A). Loads charts, tables, assignments,
// and the guest CRM, then hands everything to the tactile client studio.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { seedCharts } from './actions';
import { SeatingStudio, type StudioGuest, type StudioTable, type StudioAssignment } from '@/components/seating/SeatingStudio';

export default async function SeatingPage({ searchParams }: { searchParams: Promise<{ chart?: string }> }) {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();

  const { data: charts } = await db
    .from('seating_charts').select('id, name, kind').eq('workspace_id', ws.id).order('created_at', { ascending: true });
  const chartList = charts ?? [];

  if (!chartList.length) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Every guest, in their place</p>
        <h1 className="voice text-4xl">The Seating Studio</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Arrange your reception and ceremony the way you'd arrange the room itself — drag tables anywhere,
          drop guests into their seats, keep households together. Your guest list, RSVPs, meals, and dietary
          notes are already here waiting.
        </p>
        <form action={seedCharts} className="mt-5">
          <button className="rounded-full bg-[var(--clay)] px-6 py-2.5 text-sm text-white shadow-sm transition-transform hover:-translate-y-0.5">✦ Open the studio</button>
        </form>
      </div>
    );
  }

  const wanted = (await searchParams)?.chart;
  const chart = chartList.find((c: any) => c.id === wanted) ?? chartList[0];

  const [tablesRes, assignRes, guestsRes, householdsRes] = await Promise.all([
    db.from('seating_tables').select('id, label, shape, capacity, x, y, w, h, rotation').eq('chart_id', chart.id).order('sort', { ascending: true }),
    db.from('seat_assignments').select('table_id, guest_id, seat_index').eq('chart_id', chart.id),
    db.from('guests').select('id, first_name, last_name, household_id, rsvp_status, meal_choice, dietary, is_child').eq('workspace_id', ws.id).order('created_at', { ascending: true }),
    db.from('households').select('id, name').eq('workspace_id', ws.id),
  ]);

  const householdName = new Map((householdsRes.data ?? []).map((h: any) => [h.id, h.name]));
  const guests: StudioGuest[] = (guestsRes.data ?? []).map((g: any) => ({
    id: g.id,
    firstName: g.first_name,
    lastName: g.last_name ?? undefined,
    householdId: g.household_id ?? undefined,
    householdName: g.household_id ? householdName.get(g.household_id) : undefined,
    rsvp: g.rsvp_status,
    meal: g.meal_choice ?? undefined,
    dietary: g.dietary ?? undefined,
    isChild: !!g.is_child,
  }));
  const tables: StudioTable[] = (tablesRes.data ?? []).map((t: any) => ({
    id: t.id, label: t.label, shape: t.shape, capacity: t.capacity,
    x: t.x, y: t.y, w: t.w, h: t.h, rotation: t.rotation ?? 0,
  }));
  const assignments: StudioAssignment[] = (assignRes.data ?? []).map((a: any) => ({
    tableId: a.table_id, guestId: a.guest_id, seatIndex: a.seat_index,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Every guest, in their place</p>
      <h1 className="voice text-4xl">The Seating Studio</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">Drag tables around the room. Drop guests — or whole households — into their seats.</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chartList.map((c: any) => (
          <Link
            key={c.id}
            href={`/seating?chart=${c.id}`}
            scroll={false}
            className={'whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all hover:-translate-y-0.5 ' + (c.id === chart.id ? 'bg-[var(--clay)] text-white shadow-sm' : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}
          >
            {c.name}
          </Link>
        ))}
      </div>
      <SeatingStudio
        workspaceId={ws.id}
        chartId={chart.id}
        chartKind={chart.kind}
        tables={tables}
        assignments={assignments}
        guests={guests}
      />
    </div>
  );
}
