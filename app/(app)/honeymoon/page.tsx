import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { saveHoneymoonTrip, addHoneymoonItem, deleteHoneymoonItem, setHoneymoonEnabled } from '@/app/(app)/honeymoon/actions';
import { HoneymoonHeart } from '@/components/honeymoon/Heart';

const STATUS = ['dreaming', 'shortlisting', 'planning', 'booked', 'ready', 'completed'];
const KINDS = [
  { value: 'activity', label: 'Activities' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'flight', label: 'Flights' },
  { value: 'document', label: 'Documents' },
  { value: 'packing', label: 'Packing list' },
  { value: 'destination', label: 'Destinations' },
];

function label(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'not set';
}

function money(value: number | string | null | undefined) {
  if (value == null || value === '') return 'Not set';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

export default async function HoneymoonPage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();
  const [profileRes, tripRes, itemsRes] = await Promise.all([
    db.from('wedding_profiles').select('honeymoon_enabled').eq('workspace_id', ws.id).maybeSingle(),
    db.from('honeymoon_profiles').select('destination, start_date, end_date, budget, status, notes').eq('workspace_id', ws.id).maybeSingle(),
    db.from('honeymoon_items').select('id, kind, title, notes').eq('workspace_id', ws.id).order('created_at', { ascending: true }),
  ]);
  const enabled = profileRes.data?.honeymoon_enabled !== false;
  const trip = tripRes.data;
  const items = itemsRes.data ?? [];

  // Hearts (0011) — count per item + whether the signed-in partner hearted it.
  const heartCount = new Map<string, number>();
  const myHearts = new Set<string>();
  if (items.length) {
    const { data: hearts } = await db
      .from('honeymoon_item_hearts')
      .select('honeymoon_item_id, user_id')
      .in('honeymoon_item_id', items.map((i: any) => i.id));
    for (const h of hearts ?? []) {
      heartCount.set(h.honeymoon_item_id, (heartCount.get(h.honeymoon_item_id) ?? 0) + 1);
      if (h.user_id === ws.userId) myHearts.add(h.honeymoon_item_id);
    }
  }
  // Most-loved rises to the top of its group (ties keep add order).
  const itemsOf = (kind: string) => items
    .filter((item: any) => (item.kind || 'note') === kind)
    .sort((a: any, b: any) => (heartCount.get(b.id) ?? 0) - (heartCount.get(a.id) ?? 0));

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Optional module</p>
        <h1 className="voice text-4xl">Honeymoon</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--ink-soft)]">Honeymoon planning is turned off for this workspace. Enable it when the forever trip is ready to enter the plan.</p>
        <form action={setHoneymoonEnabled} className="mt-5">
          <input type="hidden" name="enabled" value="true" />
          <button className="rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">Enable honeymoon</button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <span className="dream-twinkle" style={{ left: '4%', top: 0, fontSize: 14 }}>+</span>
      <span className="dream-twinkle" style={{ left: '92%', top: 22, fontSize: 16, animationDelay: '1s' }}>+</span>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Where forever continues</p>
          <h1 className="voice text-4xl">Honeymoon</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Optional trip planning for destination, dates, budget, wishes, activities, restaurants, hotels, flights, documents, and packing.</p>
        </div>
        <form action={setHoneymoonEnabled}>
          <input type="hidden" name="enabled" value="false" />
          <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Disable</button>
        </form>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Status</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{label(trip?.status)}</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Budget</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{money(trip?.budget)}</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{trip?.destination ? 'Add flights, hotels, and documents as soon as they are known.' : 'Choose a destination or shortlist a few possibilities.'}</p>
        </section>
      </div>

      <form action={saveHoneymoonTrip} className="mt-5 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
        {trip?.destination && (
          <div className="mb-3 flex items-center justify-between">
            <p className="voice text-2xl">{trip.destination}</p>
            <span className="rounded-full bg-[var(--gold-bg)] px-3 py-1 text-xs text-[var(--gold)]">{label(trip.status)}</span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block"><span className="text-xs text-[var(--ink-soft)]">Destination</span>
            <input name="destination" defaultValue={trip?.destination ?? ''} placeholder="Amalfi Coast" className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" /></label>
          <label className="block"><span className="text-xs text-[var(--ink-soft)]">Status</span>
            <select name="status" defaultValue={trip?.status ?? 'dreaming'} className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{STATUS.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
          <label className="block"><span className="text-xs text-[var(--ink-soft)]">Leaving date</span>
            <input type="date" name="start_date" defaultValue={trip?.start_date ?? ''} className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-xs text-[var(--ink-soft)]">Returning date</span>
            <input type="date" name="end_date" defaultValue={trip?.end_date ?? ''} className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-xs text-[var(--ink-soft)]">Budget</span>
            <input name="budget" defaultValue={trip?.budget ?? ''} placeholder="$ optional" className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" /></label>
          <label className="block"><span className="text-xs text-[var(--ink-soft)]">Wish for the trip</span>
            <input name="notes" defaultValue={trip?.notes ?? ''} placeholder="slow mornings, long dinners" className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" /></label>
        </div>
        <button className="mt-3 rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">Save trip</button>
      </form>

      <form action={addHoneymoonItem} className="mt-5 grid gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-3 md:grid-cols-[0.7fr_1fr_1fr_auto]">
        <select name="kind" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select>
        <input name="title" required placeholder="Add a place, flight, meal, document, or packing item" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        <input name="notes" placeholder="notes" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add</button>
      </form>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KINDS.map((kind) => {
          const list = itemsOf(kind.value);
          return (
            <section key={kind.value} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <h2 className="voice text-lg">{kind.label}</h2>
              {list.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--ink-faint)]">Nothing here yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {list.map((item: any) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{item.title}{item.notes ? <span className="text-[11px] text-[var(--ink-faint)]"> - {item.notes}</span> : ''}</span>
                      <HoneymoonHeart itemId={item.id} count={heartCount.get(item.id) ?? 0} mine={myHearts.has(item.id)} />
                      <form action={deleteHoneymoonItem}><input type="hidden" name="id" value={item.id} /><button className="px-1 text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
