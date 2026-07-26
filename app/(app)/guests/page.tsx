import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { createHousehold, deleteHousehold, createGuest, updateGuestRsvp, deleteGuest, sendSongToPlaylist } from '@/app/(app)/guests/actions';

const RSVP = ['pending', 'accepted', 'declined'];
const VIEWS = [
  { value: 'all', label: 'Everyone' },
  { value: 'awaiting', label: 'Awaiting RSVP' },
  { value: 'accepted', label: 'Coming' },
  { value: 'traveling', label: 'Traveling' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'children', label: 'Children' },
  { value: 'needs_address', label: 'Needs address' },
];

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-[12px] bg-[var(--pearl)] p-3 text-center"><p className="text-2xl">{value}</p><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">{label}</p></div>;
}

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const view = (await searchParams)?.view ?? 'all';
  const db = supabaseAdmin();
  const [hhRes, gRes, profileRes] = await Promise.all([
    db.from('households').select('id, name, address, relationship_group, primary_contact, invitation_status').eq('workspace_id', ws.id).order('name', { ascending: true }),
    db.from('guests').select('id, household_id, first_name, last_name, preferred_name, pronouns, guest_group, email, phone, relationship, is_child, plus_one_eligible, plus_one_name, invited_ceremony, invited_reception, invited_rehearsal, invited_other_events, rsvp_status, meal_choice, dietary, accessibility, traveling_from, hotel_status, transportation_need, gift_received, thank_you_note_status, song_request').eq('workspace_id', ws.id).order('created_at', { ascending: true }),
    db.from('wedding_profiles').select('guest_estimate, guest_max').eq('workspace_id', ws.id).maybeSingle(),
  ]);
  const households = hhRes.data ?? [];
  const guests = gRes.data ?? [];
  const profile = profileRes.data;

  const accepted = guests.filter((guest: any) => guest.rsvp_status === 'accepted');
  const declined = guests.filter((guest: any) => guest.rsvp_status === 'declined').length;
  const pending = guests.filter((guest: any) => guest.rsvp_status === 'pending').length;
  const traveling = guests.filter((guest: any) => guest.traveling_from).length;
  const children = guests.filter((guest: any) => guest.is_child).length;
  const plusOnes = guests.filter((guest: any) => guest.plus_one_eligible).length;
  const requirementCount = guests.filter((guest: any) => guest.dietary || guest.accessibility || guest.transportation_need).length;
  const answeredRsvps = guests.length ? (guests.length - pending) / guests.length : 0;
  const addressedHouseholds = households.length ? households.filter((household: any) => household.address).length / households.length : 0;
  const mealCoverage = accepted.length ? accepted.filter((guest: any) => guest.meal_choice).length / accepted.length : 0;
  const coverage = Math.round(((answeredRsvps + addressedHouseholds + mealCoverage) / 3) * 100);
  const meals = new Map<string, number>();
  for (const guest of accepted) {
    const meal = (guest.meal_choice || 'no choice').toLowerCase();
    meals.set(meal, (meals.get(meal) ?? 0) + 1);
  }

  const guestPred = (guest: any) => view === 'awaiting' ? guest.rsvp_status === 'pending'
    : view === 'accepted' ? guest.rsvp_status === 'accepted'
    : view === 'traveling' ? !!guest.traveling_from
    : view === 'rehearsal' ? !!guest.invited_rehearsal
    : view === 'children' ? !!guest.is_child
    : true;
  const needsAddress = view === 'needs_address';
  const shownHouseholds = needsAddress ? households.filter((household: any) => !household.address) : households;
  const guestsOf = (householdId: string | null) => guests.filter((guest: any) => guest.household_id === householdId && guestPred(guest));
  const unhoused = guests.filter((guest: any) => !guest.household_id && guestPred(guest));

  function GuestRow({ guest }: { guest: any }) {
    return (
      <li className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">
            {guest.preferred_name || guest.first_name} {guest.last_name || ''}
            {guest.pronouns ? <span className="ml-1 text-[11px] text-[var(--ink-faint)]">({guest.pronouns})</span> : ''}
            {guest.is_child ? <span className="ml-1 text-[11px] text-[var(--ink-faint)]">- child</span> : ''}
            {guest.plus_one_eligible ? <span className="ml-1 text-[11px] text-[var(--ink-faint)]">- plus one{guest.plus_one_name ? `: ${guest.plus_one_name}` : ''}</span> : ''}
            {guest.relationship ? <span className="ml-1 text-[11px] text-[var(--ink-faint)]">- {guest.relationship}</span> : ''}
            {guest.guest_group ? <span className="ml-1 text-[11px] text-[var(--gold)]">· {guest.guest_group}</span> : ''}
          </span>
          <form action={updateGuestRsvp} className="flex items-center gap-1">
            <input type="hidden" name="id" value={guest.id} />
            <input name="meal_choice" defaultValue={guest.meal_choice || ''} placeholder="meal" className="w-24 rounded-full border border-[var(--line)] bg-white px-2 py-1 text-xs" />
            <select name="rsvp_status" defaultValue={guest.rsvp_status} className="rounded-full border border-[var(--line)] bg-white px-2 py-1 text-xs">{RSVP.map((rsvp) => <option key={rsvp} value={rsvp}>{rsvp}</option>)}</select>
            <input name="hotel_status" defaultValue={guest.hotel_status || ''} placeholder="hotel" className="w-20 rounded-full border border-[var(--line)] bg-white px-2 py-1 text-xs" />
            <select name="thank_you_note_status" defaultValue={guest.thank_you_note_status || ''} className="rounded-full border border-[var(--line)] bg-white px-2 py-1 text-xs">
              <option value="">thank-you</option><option value="not_sent">not sent</option><option value="sent">sent</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] text-[var(--ink-soft)]"><input type="checkbox" name="gift_received" defaultChecked={guest.gift_received} className="accent-[var(--clay)]" /> gift</label>
            <button className="rounded-full bg-[var(--gold-bg)] px-2 py-1 text-xs text-[var(--gold)]">save</button>
          </form>
          <form action={deleteGuest}><input type="hidden" name="id" value={guest.id} /><button className="px-1 text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
        </div>
        {(guest.email || guest.phone || guest.dietary || guest.accessibility || guest.traveling_from || guest.hotel_status || guest.transportation_need || guest.invited_rehearsal || guest.gift_received || guest.thank_you_note_status || guest.song_request) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--ink-faint)]">
            {guest.email && <span>{guest.email}</span>}
            {guest.phone && <span>{guest.phone}</span>}
            {guest.dietary && <span>dietary: {guest.dietary}</span>}
            {guest.accessibility && <span>accessibility: {guest.accessibility}</span>}
            {guest.traveling_from && <span>traveling from {guest.traveling_from}</span>}
            {guest.hotel_status && <span>hotel: {guest.hotel_status}</span>}
            {guest.transportation_need && <span>needs transport</span>}
            {guest.invited_rehearsal && <span>rehearsal</span>}
            {guest.gift_received && <span>gift received</span>}
            {guest.thank_you_note_status && <span>thank-you: {guest.thank_you_note_status.replace('_', ' ')}</span>}
            {guest.song_request && (
              <span className="inline-flex items-center gap-1">song: {guest.song_request}
                <form action={sendSongToPlaylist}><input type="hidden" name="id" value={guest.id} /><button className="text-[var(--clay-ink)] underline">send to playlist</button></form>
              </span>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Everyone you love, in one place</p>
        <h1 className="voice text-4xl">Guests</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">A household-first hospitality book for RSVPs, meals, travel, accessibility, invited events, and song requests.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="invited" value={guests.length} />
        <Stat label="coming" value={accepted.length} />
        <Stat label="declined" value={declined} />
        <Stat label="awaiting" value={pending} />
        <Stat label="traveling" value={traveling} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Guest count range</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{profile?.guest_estimate || profile?.guest_max ? `${profile?.guest_estimate ?? '?'} to ${profile?.guest_max ?? '?'}` : 'Not set in Dream.'}</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Plus one policy</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{plusOnes} guests are marked plus-one eligible.</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Child policy</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{children} children are currently invited.</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What this affects</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Venue, food, seating, invitations, budget, travel, and timeline.</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Hospitality coverage</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{coverage}% across RSVPs, household addresses, and accepted-guest meals.</p>
          <p className="mt-1 text-[11px] text-[var(--gold)]">{requirementCount} guests have dietary, accessibility, or transport requirements.</p>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((item) => (
            <Link key={item.value} href={item.value === 'all' ? '/guests' : `/guests?view=${item.value}`}
              className={'rounded-full px-3 py-1 text-xs ' + (view === item.value ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}>
              {item.label}
            </Link>
          ))}
        </div>
        <Link href="/guests/export" className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Export CSV</Link>
      </div>

      {meals.size > 0 && view === 'all' && (
        <div className="mt-3 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Meal choices for accepted guests</p>
          <div className="mt-1 flex flex-wrap gap-2 text-sm">{[...meals.entries()].map(([meal, count]) => <span key={meal} className="rounded-full bg-[var(--cream)] px-2.5 py-0.5">{meal}: {count}</span>)}</div>
        </div>
      )}

      {view === 'all' && (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <form action={createHousehold} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
            <p className="text-xs font-medium text-[var(--ink-soft)]">Add a household</p>
            <input name="name" required placeholder="The Rivera Family" className="mt-2 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="address" placeholder="Mailing address" className="mt-2 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="relationship_group" placeholder="Family priority group or relationship" className="mt-2 w-full rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="primary_contact" placeholder="Primary contact" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <select name="invitation_status" defaultValue="" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">
                <option value="">Invitation: not sent</option><option value="save_the_date">save the date sent</option><option value="invited">invited</option><option value="declined">declined</option>
              </select>
            </div>
            <button className="mt-2 rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add household</button>
          </form>

          <form action={createGuest} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
            <p className="text-xs font-medium text-[var(--ink-soft)]">Add a guest</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="first_name" required placeholder="First" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="last_name" placeholder="Last" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="email" placeholder="Email" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="phone" placeholder="Phone" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            </div>
            <select name="household_id" className="mt-2 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">No household</option>
              {households.map((household: any) => <option key={household.id} value={household.id}>{household.name}</option>)}
            </select>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="preferred_name" placeholder="Preferred name" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="pronouns" placeholder="Pronouns (optional)" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="relationship" placeholder="Relationship" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="guest_group" placeholder="Group (e.g. college friends)" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="meal_choice" placeholder="Meal choice" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="hotel_status" placeholder="Hotel status" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="dietary" placeholder="Dietary needs" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="accessibility" placeholder="Accessibility needs" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="traveling_from" placeholder="Traveling from" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <input name="plus_one_name" placeholder="Plus one name" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            </div>
            <input name="song_request" placeholder="Song request" className="mt-2 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--ink-soft)]">
              <label className="flex items-center gap-1"><input type="checkbox" name="is_child" className="accent-[var(--clay)]" /> child</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="plus_one_eligible" className="accent-[var(--clay)]" /> plus one</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="invited_ceremony" className="accent-[var(--clay)]" defaultChecked /> ceremony</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="invited_reception" className="accent-[var(--clay)]" defaultChecked /> reception</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="invited_rehearsal" className="accent-[var(--clay)]" /> rehearsal</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="transportation_need" className="accent-[var(--clay)]" /> transport</label>
              <button className="ml-auto rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add guest</button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-7 space-y-4">
        {shownHouseholds.map((household: any) => {
          const list = guestsOf(household.id);
          if (!needsAddress && list.length === 0) return null;
          return (
            <section key={household.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="voice text-lg">{household.name}</h2>
                  {household.address ? <p className="text-[11px] text-[var(--ink-faint)]">{household.address}</p> : <p className="text-[11px] text-[var(--clay-ink)]">no address yet</p>}
                  {household.relationship_group && <p className="text-[11px] text-[var(--ink-faint)]">{household.relationship_group}</p>}
                  {(household.primary_contact || household.invitation_status) && <p className="text-[11px] text-[var(--ink-faint)]">{[household.primary_contact, household.invitation_status ? household.invitation_status.replace(/_/g, ' ') : null].filter(Boolean).join(' · ')}</p>}
                </div>
                <form action={deleteHousehold}><input type="hidden" name="id" value={household.id} /><button className="text-xs text-[var(--ink-faint)] hover:text-[var(--clay-ink)]">remove household</button></form>
              </div>
              <ul className="mt-2 divide-y divide-[var(--line)]">
                {list.length ? list.map((guest: any) => <GuestRow key={guest.id} guest={guest} />) : <li className="py-2 text-[12px] text-[var(--ink-faint)]">No one here yet.</li>}
              </ul>
            </section>
          );
        })}

        {!needsAddress && unhoused.length > 0 && (
          <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
            <h2 className="voice text-lg">Individual guests</h2>
            <ul className="mt-2 divide-y divide-[var(--line)]">{unhoused.map((guest: any) => <GuestRow key={guest.id} guest={guest} />)}</ul>
          </section>
        )}

        {households.length === 0 && guests.length === 0 && (
          <p className="text-center text-sm text-[var(--ink-faint)]">Start with a household, then add the people you love.</p>
        )}
      </div>
    </div>
  );
}
