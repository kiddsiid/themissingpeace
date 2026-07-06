// Public RSVP (/w/[slug]/rsvp) — "find your invitation" by name, then respond for the
// whole party. Writes straight into the couple's Guest CRM, and doubles as the contact
// collector (the party can leave its mailing address).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadPublicPage } from '@/lib/guest-page/public';
import { submitRsvpAndThank } from '@/app/w/actions';

interface PartyGuest {
  id: string; firstName: string; lastName?: string; rsvp: string;
  meal?: string; dietary?: string; song?: string;
}

async function findParty(workspaceId: string, q: string): Promise<{ householdId: string | null; householdName: string; address?: string; guests: PartyGuest[] } | null> {
  const db = supabaseAdmin();
  const needle = q.trim().replace(/[%_]/g, '');
  if (needle.length < 2) return null;
  const { data: matches } = await db
    .from('guests')
    .select('id, first_name, last_name, household_id')
    .eq('workspace_id', workspaceId)
    .or(`first_name.ilike.%${needle}%,last_name.ilike.%${needle}%`)
    .limit(5);
  const hit = (matches ?? [])[0];
  if (!hit) return null;

  const mapGuest = (g: any): PartyGuest => ({
    id: g.id, firstName: g.first_name, lastName: g.last_name ?? undefined,
    rsvp: g.rsvp_status, meal: g.meal_choice ?? undefined, dietary: g.dietary ?? undefined, song: g.song_request ?? undefined,
  });

  if (hit.household_id) {
    const [{ data: household }, { data: members }] = await Promise.all([
      db.from('households').select('id, name, address').eq('id', hit.household_id).maybeSingle(),
      db.from('guests').select('id, first_name, last_name, rsvp_status, meal_choice, dietary, song_request').eq('workspace_id', workspaceId).eq('household_id', hit.household_id).order('created_at', { ascending: true }),
    ]);
    return {
      householdId: hit.household_id,
      householdName: household?.name ?? 'Your party',
      address: household?.address ?? undefined,
      guests: (members ?? []).map(mapGuest),
    };
  }
  const { data: solo } = await supabaseAdmin()
    .from('guests').select('id, first_name, last_name, rsvp_status, meal_choice, dietary, song_request')
    .eq('workspace_id', workspaceId).eq('id', hit.id).maybeSingle();
  return solo ? { householdId: null, householdName: `${solo.first_name} ${solo.last_name ?? ''}`.trim(), guests: [mapGuest(solo)] } : null;
}

export default async function RsvpPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sent?: string }>;
}) {
  const { slug } = await params;
  const page = await loadPublicPage(slug);
  if (!page || !page.rsvpOpen) notFound();
  const { q, sent } = await searchParams;
  const party = q ? await findParty(page.workspaceId, q) : null;

  return (
    <div>
      <p className="text-center text-[12px] uppercase tracking-[0.3em] text-[var(--gold)]">{page.coupleLine}</p>
      <h1 className="voice mt-2 text-center text-4xl">RSVP</h1>
      {page.dateLine && <p className="mt-1 text-center text-sm text-[var(--ink-soft)]">{page.dateLine}</p>}

      {sent ? (
        <div className="mx-auto mt-10 max-w-md rounded-[18px] border border-[var(--line)] bg-[var(--pearl)] p-8 text-center">
          <p className="text-3xl">✦</p>
          <h2 className="voice mt-2 text-2xl">Thank you</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Your response is with {page.coupleLine}. They can't wait.</p>
          <Link href={`/w/${slug}`} className="mt-5 inline-block rounded-full border border-[var(--line)] px-5 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Back to the celebration</Link>
        </div>
      ) : (
        <>
          <form method="get" className="mx-auto mt-8 flex max-w-md items-center gap-2">
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Enter your first or last name…"
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <button className="rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm text-white">Find us</button>
          </form>

          {q && !party && (
            <p className="mt-6 text-center text-sm text-[var(--ink-faint)]">
              We couldn't find that name. Try another spelling — or reach out to {page.coupleLine} directly.
            </p>
          )}

          {party && (
            <form action={submitRsvpAndThank} className="mx-auto mt-8 max-w-xl rounded-[18px] border border-[var(--line)] bg-[var(--pearl)] p-6">
              <input type="hidden" name="slug" value={slug} />
              {party.householdId && <input type="hidden" name="household_id" value={party.householdId} />}
              <h2 className="voice text-2xl">{party.householdName}</h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">Respond for everyone in your party below.</p>

              <div className="mt-4 space-y-5">
                {party.guests.map((g) => (
                  <fieldset key={g.id} className="rounded-[14px] border border-[var(--line)] bg-white p-4">
                    <input type="hidden" name="guest_id" value={g.id} />
                    <legend className="voice px-1 text-lg">{g.firstName} {g.lastName ?? ''}</legend>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <label className="inline-flex items-center gap-1.5">
                        <input type="radio" name={`rsvp_${g.id}`} value="accepted" defaultChecked={g.rsvp === 'accepted'} required /> Joyfully accepts
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input type="radio" name={`rsvp_${g.id}`} value="declined" defaultChecked={g.rsvp === 'declined'} /> Regretfully declines
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input name={`meal_${g.id}`} defaultValue={g.meal ?? ''} placeholder="Meal preference" className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm" />
                      <input name={`dietary_${g.id}`} defaultValue={g.dietary ?? ''} placeholder="Dietary needs" className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm" />
                      <input name={`song_${g.id}`} defaultValue={g.song ?? ''} placeholder="A song that gets you dancing ♪" className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm sm:col-span-2" />
                    </div>
                  </fieldset>
                ))}
              </div>

              {party.householdId && (
                <label className="mt-4 block text-sm text-[var(--ink-soft)]">
                  Mailing address {party.address ? '(update if needed)' : '(so nothing lovely gets lost)'}
                  <input name="address" defaultValue={party.address ?? ''} placeholder="Street, city, state, zip" className="mt-1 w-full rounded-full border border-[var(--line)] px-4 py-2 text-sm" />
                </label>
              )}

              <button className="mt-5 w-full rounded-full bg-[var(--clay)] px-6 py-2.5 text-sm text-white shadow-sm transition-transform hover:-translate-y-0.5">
                ✦ Send our response
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
