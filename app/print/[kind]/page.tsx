// Printables pipeline (North Star Wave A) — print-ready stationery generated from LIVE
// planning data: guest list, RSVPs, meals, and the Seating Studio's assignments.
// Kinds: escort-cards, place-cards, table-numbers, menu, seating-sign, save-the-date, invitation.
import { notFound, redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { PrintButton } from '@/components/print/PrintButton';

const KINDS = ['escort-cards', 'place-cards', 'table-numbers', 'menu', 'seating-sign', 'save-the-date', 'invitation'] as const;
type Kind = (typeof KINDS)[number];

interface Seated { guest: string; meal?: string; table: string; seatIndex: number }

async function loadData(workspaceId: string) {
  const db = supabaseAdmin();
  const [profileRes, dreamRes, chartRes, guestsRes] = await Promise.all([
    db.from('wedding_profiles').select('partner_one_label, partner_two_label, wedding_date').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('dreams').select('responses_json').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('seating_charts').select('id').eq('workspace_id', workspaceId).eq('kind', 'reception').maybeSingle(),
    db.from('guests').select('id, first_name, last_name, meal_choice, rsvp_status').eq('workspace_id', workspaceId),
  ]);
  const profile = profileRes.data;
  const coupleLine = profile ? `${profile.partner_one_label} & ${profile.partner_two_label}` : 'Our wedding';
  const dateLine = profile?.wedding_date
    ? new Date(profile.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;
  const mood = (dreamRes.data?.responses_json as any)?.boardMood?.summary as string | undefined;
  const guests = guestsRes.data ?? [];
  const guestById = new Map(guests.map((g: any) => [g.id, g]));

  let tables: { id: string; label: string; sort: number }[] = [];
  let seated: Seated[] = [];
  if (chartRes.data) {
    const [tablesRes, assignRes] = await Promise.all([
      db.from('seating_tables').select('id, label, sort').eq('chart_id', chartRes.data.id).order('sort', { ascending: true }),
      db.from('seat_assignments').select('table_id, guest_id, seat_index').eq('chart_id', chartRes.data.id),
    ]);
    tables = (tablesRes.data ?? []) as any[];
    const tableById = new Map(tables.map((t) => [t.id, t.label]));
    seated = (assignRes.data ?? [])
      .map((a: any) => {
        const g = guestById.get(a.guest_id);
        if (!g) return null;
        return {
          guest: `${g.first_name} ${g.last_name ?? ''}`.trim(),
          meal: g.meal_choice ?? undefined,
          table: tableById.get(a.table_id) ?? 'Table',
          seatIndex: a.seat_index,
        } as Seated;
      })
      .filter(Boolean) as Seated[];
  }
  const meals = [...new Set(guests.filter((g: any) => g.rsvp_status === 'accepted' && g.meal_choice).map((g: any) => g.meal_choice as string))];
  return { coupleLine, dateLine, mood, tables, seated, meals };
}

const CARD = 'flex flex-col items-center justify-center rounded-[10px] border border-[#D8C7A6] bg-white p-4 text-center';

export default async function PrintPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind: rawKind } = await params;
  if (!KINDS.includes(rawKind as Kind)) notFound();
  const kind = rawKind as Kind;
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const { coupleLine, dateLine, mood, tables, seated, meals } = await loadData(ws.id);

  const byTable = new Map<string, Seated[]>();
  for (const s of seated) {
    if (!byTable.has(s.table)) byTable.set(s.table, []);
    byTable.get(s.table)!.push(s);
  }
  const alphabetical = [...seated].sort((a, b) => a.guest.localeCompare(b.guest));

  return (
    <div className="min-h-screen bg-white p-8 text-[var(--ink)]">
      <style>{`
        @media print {
          [data-no-print] { display: none !important; }
          body { background: white; }
          .print-card { break-inside: avoid; }
          .print-page { break-after: page; }
        }
      `}</style>
      <PrintButton />

      {kind === 'escort-cards' && (
        <>
          <h1 data-no-print className="voice mb-4 text-2xl">Escort cards — alphabetical ({alphabetical.length})</h1>
          {alphabetical.length === 0 && <p data-no-print className="text-sm text-[var(--ink-faint)]">Seat guests in the Seating Studio first — cards generate themselves.</p>}
          <div className="grid grid-cols-3 gap-4">
            {alphabetical.map((s, i) => (
              <div key={i} className={CARD + ' print-card'} style={{ minHeight: '2.2in' }}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">{coupleLine}</p>
                <p className="voice mt-2 text-xl">{s.guest}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{s.table}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {kind === 'place-cards' && (
        <>
          <h1 data-no-print className="voice mb-4 text-2xl">Place cards — by table</h1>
          {[...byTable.entries()].map(([table, list]) => (
            <section key={table} className="mb-6">
              <h2 data-no-print className="mb-2 text-sm text-[var(--ink-faint)]">{table}</h2>
              <div className="grid grid-cols-4 gap-3">
                {list.sort((a, b) => a.seatIndex - b.seatIndex).map((s, i) => (
                  <div key={i} className={CARD + ' print-card'} style={{ minHeight: '1.6in' }}>
                    <p className="voice text-lg">{s.guest}</p>
                    {s.meal && <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{s.meal}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {kind === 'table-numbers' && (
        <>
          <h1 data-no-print className="voice mb-4 text-2xl">Table numbers</h1>
          <div className="grid grid-cols-2 gap-6">
            {tables.map((t, i) => (
              <div key={t.id} className={CARD + ' print-card print-page'} style={{ minHeight: '5in' }}>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--gold)]">{coupleLine}</p>
                <p className="voice mt-4 text-7xl">{i + 1}</p>
                <p className="voice mt-3 text-2xl text-[var(--ink-soft)]">{t.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {kind === 'menu' && (
        <div className={CARD + ' mx-auto max-w-md'} style={{ minHeight: '8in' }}>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--gold)]">{coupleLine}</p>
          {dateLine && <p className="mt-1 text-xs text-[var(--ink-faint)]">{dateLine}</p>}
          <p className="voice mt-6 text-3xl">Dinner</p>
          <div className="mt-5 space-y-4">
            {meals.length === 0
              ? <p className="text-sm text-[var(--ink-faint)]">Meal choices appear here as guests RSVP.</p>
              : meals.map((m) => <p key={m} className="voice text-xl">{m}</p>)}
          </div>
          <p className="mt-8 text-xs text-[var(--ink-faint)]">with love, and something sweet to follow</p>
        </div>
      )}

      {kind === 'seating-sign' && (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--gold)]">{coupleLine}</p>
          <h1 className="voice mt-2 text-4xl">Find your seat</h1>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 text-left">
            {[...byTable.entries()].map(([table, list]) => (
              <div key={table} className="print-card">
                <p className="voice text-xl">{table}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">{list.map((s) => s.guest).join(' · ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(kind === 'save-the-date' || kind === 'invitation') && (
        <div className={CARD + ' mx-auto max-w-lg'} style={{ minHeight: '7in' }}>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">
            {kind === 'save-the-date' ? 'Save the date' : 'Together with their families'}
          </p>
          <p className="voice mt-6 text-5xl leading-tight">{coupleLine}</p>
          {kind === 'invitation' && <p className="mt-4 text-sm text-[var(--ink-soft)]">invite you to celebrate their wedding</p>}
          {dateLine && <p className="voice mt-5 text-xl text-[var(--ink-soft)]">{dateLine}</p>}
          {mood && <p className="mx-auto mt-8 max-w-xs text-sm italic text-[var(--ink-faint)]">“{mood}”</p>}
          <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            {kind === 'save-the-date' ? 'invitation to follow' : 'rsvp on our website'}
          </p>
        </div>
      )}
    </div>
  );
}
