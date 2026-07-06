import { redirect } from 'next/navigation';
import { createVendor, deleteVendor, updateVendorStatus } from '@/app/(app)/planning/actions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';

const CATEGORIES = ['venue','planner','photographer','videographer','caterer','bar_service','cake_desserts','florist','decorator','rental_company','dj','band','ceremony_musicians','officiant','hair','makeup','attire','alterations','stationery','signage','transportation','hotel_room_block','travel_advisor','honeymoon_advisor','content_creator','photo_booth','childcare','pet_attendant','security','insurance','other'];
const STATUSES = ['idea','shortlisted','inquired','responded','quote_received','comparing','selected','booked','paid_deposit','fully_paid','declined','unavailable','archived'];
const CORE = ['venue', 'caterer', 'photographer', 'officiant', 'florist'];

function label(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'not set';
}

function money(value: number | string | null | undefined) {
  if (value == null || value === '') return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

export default async function VendorsPage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();
  const { data: vendors } = await db
    .from('vendors')
    .select('id, name, category, status, website, contact_name, email, phone, quote_amount, internal_notes, inquiry_date, response_date, availability, contract_status, deposit_amount, payment_schedule, cancellation_terms, insurance_required, meals_required, arrival_time, departure_time, setup_time, breakdown_time')
    .eq('workspace_id', ws.id)
    .order('created_at', { ascending: true });
  const list = vendors ?? [];
  const ready = new Set(['selected', 'booked', 'paid_deposit', 'fully_paid']);
  const missingCore = CORE.filter((category) => !list.some((vendor: any) => vendor.category === category && ready.has(vendor.status)));
  const statusCounts = STATUSES.map((status) => ({ status, count: list.filter((vendor: any) => vendor.status === status).length })).filter((item) => item.count > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The hands that make it real</p>
        <h1 className="voice text-4xl">Vendors</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Track ideas, outreach, quotes, contracts, payments, and what each vendor unlocks.</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What is missing?</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{missingCore.length ? `Still needed: ${missingCore.map(label).join(', ')}.` : 'Core vendors are selected or booked.'}</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What does this affect?</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Deposits, contracts, timeline handoffs, documents, and budget pressure.</p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{missingCore[0] ? `Shortlist a ${label(missingCore[0])}.` : 'Compare quotes and lock payment dates.'}</p>
        </section>
      </div>

      <form action={createVendor} className="mt-5 grid gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input name="name" required placeholder="Vendor name" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <select name="category" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select>
          <select name="status" defaultValue="idea" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
          <input name="quote_amount" placeholder="Quote amount" inputMode="numeric" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <input name="website" placeholder="Website" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <input name="contact_name" placeholder="Contact name" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <input name="email" placeholder="Email" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <input name="phone" placeholder="Phone" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        </div>
        <details className="rounded-[12px] border border-[var(--line)] bg-white/60 px-3 py-2">
          <summary className="cursor-pointer text-xs text-[var(--ink-soft)]">Contract, payments &amp; day-of logistics</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <label className="text-[11px] text-[var(--ink-faint)]">Inquiry date<input type="date" name="inquiry_date" className="mt-0.5 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]" /></label>
            <label className="text-[11px] text-[var(--ink-faint)]">Response date<input type="date" name="response_date" className="mt-0.5 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]" /></label>
            <input name="availability" placeholder="Availability" className="self-end rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <select name="contract_status" defaultValue="" className="self-end rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Contract: none</option><option value="verbal">verbal hold</option><option value="sent">sent</option><option value="signed">signed</option>
            </select>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input name="deposit_amount" placeholder="Deposit amount" inputMode="numeric" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="payment_schedule" placeholder="Payment schedule" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="cancellation_terms" placeholder="Cancellation terms" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <input name="arrival_time" placeholder="Arrival time" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="departure_time" placeholder="Departure time" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="setup_time" placeholder="Setup time" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input name="breakdown_time" placeholder="Breakdown time" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--ink-soft)]">
            <label className="flex items-center gap-1"><input type="checkbox" name="insurance_required" className="accent-[var(--clay)]" /> insurance required</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="meals_required" className="accent-[var(--clay)]" /> vendor meals required</label>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <input name="internal_notes" placeholder="Package notes, internal notes" className="min-w-[240px] flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
          <button className="rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">Add vendor</button>
        </div>
      </form>

      {statusCounts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {statusCounts.map((item) => <span key={item.status} className="rounded-full bg-[var(--gold-bg)] px-3 py-1 text-[var(--gold)]">{label(item.status)}: {item.count}</span>)}
        </div>
      )}

      {list.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--ink-faint)]">No vendors yet. Add the first possibility above.</p>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {list.map((vendor: any) => (
            <li key={vendor.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{vendor.website ? <a href={vendor.website} target="_blank" rel="noreferrer" className="hover:underline">{vendor.name}</a> : vendor.name}</p>
                  <p className="text-[11px] text-[var(--ink-faint)]">{label(vendor.category)}{money(vendor.quote_amount) ? ` - ${money(vendor.quote_amount)}` : ''}</p>
                </div>
                <form action={updateVendorStatus} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={vendor.id} />
                  <select name="status" defaultValue={vendor.status} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs">{STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
                  <button className="rounded-full bg-[var(--gold-bg)] px-2.5 py-1.5 text-xs text-[var(--gold)]">save</button>
                </form>
              </div>
              {(vendor.contact_name || vendor.email || vendor.phone || vendor.internal_notes) && (
                <div className="mt-3 grid gap-1 text-xs text-[var(--ink-soft)]">
                  {vendor.contact_name && <p>Contact: {vendor.contact_name}</p>}
                  {(vendor.email || vendor.phone) && <p>{[vendor.email, vendor.phone].filter(Boolean).join(' / ')}</p>}
                  {vendor.internal_notes && <p>{vendor.internal_notes}</p>}
                </div>
              )}
              {(vendor.contract_status || vendor.deposit_amount != null || vendor.availability || vendor.payment_schedule || vendor.cancellation_terms) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {vendor.contract_status && <span className="rounded-full bg-[var(--sage-bg)] px-2 py-0.5 text-[var(--sage)]">contract: {vendor.contract_status}</span>}
                  {vendor.deposit_amount != null && <span className="rounded-full bg-[var(--gold-bg)] px-2 py-0.5 text-[var(--gold)]">deposit {money(vendor.deposit_amount)}</span>}
                  {vendor.availability && <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-[var(--ink-soft)]">{vendor.availability}</span>}
                  {vendor.payment_schedule && <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-[var(--ink-soft)]">pay: {vendor.payment_schedule}</span>}
                  {vendor.cancellation_terms && <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-[var(--ink-soft)]">cancel: {vendor.cancellation_terms}</span>}
                </div>
              )}
              {(vendor.arrival_time || vendor.departure_time || vendor.setup_time || vendor.breakdown_time || vendor.insurance_required || vendor.meals_required) && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--ink-faint)]">
                  {vendor.arrival_time && <span>arrive {vendor.arrival_time}</span>}
                  {vendor.departure_time && <span>depart {vendor.departure_time}</span>}
                  {vendor.setup_time && <span>setup {vendor.setup_time}</span>}
                  {vendor.breakdown_time && <span>breakdown {vendor.breakdown_time}</span>}
                  {vendor.insurance_required && <span>· insurance required</span>}
                  {vendor.meals_required && <span>· vendor meals</span>}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--ink-faint)]">
                <span>Documents can be linked to this vendor from the Documents module.</span>
                <form action={deleteVendor}><input type="hidden" name="id" value={vendor.id} /><button className="text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
