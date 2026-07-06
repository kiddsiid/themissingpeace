import { redirect } from 'next/navigation';
import { deleteDocumentRecord } from '@/app/(app)/planning/actions';
import { uploadDocument } from '@/app/(app)/documents/upload';
import { signUploads } from '@/lib/supabase/storage';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';

const TYPES = ['contracts', 'quotes', 'invoices', 'mood_sheets', 'menu', 'floor_plans', 'guest_lists', 'legal', 'insurance', 'honeymoon', 'attire', 'venue', 'seating_charts', 'misc'];
const CONTRACT = ['', 'draft', 'sent', 'signed', 'expired'];
function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : 'other'; }

export default async function DocumentsPage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();
  const [docsRes, vendorsRes, decisionsRes] = await Promise.all([
    db.from('documents').select('id, folder, title, created_at, upload_id, contract_status, due_date, notes, linked_vendor_id, linked_decision_id').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
    db.from('vendors').select('id, name').eq('workspace_id', ws.id).order('name'),
    db.from('decisions').select('id, title').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
  ]);
  const list = docsRes.data ?? [];
  const vendors = vendorsRes.data ?? [];
  const decisions = decisionsRes.data ?? [];
  const vendorName = new Map(vendors.map((v: any) => [v.id, v.name]));
  const decisionName = new Map(decisions.map((d: any) => [d.id, d.title]));
  const upById = await signUploads([...new Set(list.map((doc: any) => doc.upload_id).filter(Boolean))] as string[]);

  const today = new Date().toISOString().slice(0, 10);
  const noFile = list.filter((doc: any) => !doc.upload_id).length;
  const expiringSoon = list.filter((doc: any) => doc.due_date && doc.due_date >= today).length;
  const unsigned = list.filter((doc: any) => doc.folder === 'contracts' && doc.contract_status && doc.contract_status !== 'signed').length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Real planning records</p>
        <h1 className="voice text-4xl">Documents</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Contracts, quotes, invoices, and more — with type, status, due dates, and links to vendors and decisions.</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What is missing?</p><p className="mt-2 text-sm text-[var(--ink-soft)]">{list.length ? `${noFile} records without files, ${unsigned} contracts not yet signed.` : 'No documents yet.'}</p></section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What does this affect?</p><p className="mt-2 text-sm text-[var(--ink-soft)]">Vendor status, Money Map payments, and decision records stay aligned to signed paperwork.</p></section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p><p className="mt-2 text-sm text-[var(--ink-soft)]">Upload signed contracts first, then link each to its vendor.</p></section>
      </div>

      <form action={uploadDocument} className="mt-5 grid gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-3 sm:grid-cols-2">
        <input name="title" required placeholder="Document name" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm sm:col-span-2" />
        <select name="folder" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
        <select name="contract_status" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{CONTRACT.map((c) => <option key={c} value={c}>{c ? `contract: ${c}` : 'contract status —'}</option>)}</select>
        <select name="linked_vendor_id" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="">link a vendor…</option>{vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
        <select name="linked_decision_id" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="">link a decision…</option>{decisions.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}</select>
        <label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-soft)]">Due <input type="date" name="due_date" className="flex-1 bg-transparent outline-none" /></label>
        <input name="notes" placeholder="Notes (optional)" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        <label className="cursor-pointer rounded-full border border-[#D8C7A6] px-4 py-2 text-center text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Attach file<input type="file" name="file" className="hidden" /></label>
        <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white sm:col-span-2">Add document</button>
      </form>

      {list.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--ink-faint)]">No documents yet.</p>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {list.map((doc: any) => {
            const signed = doc.upload_id ? upById.get(doc.upload_id) : undefined;
            return (
              <li key={doc.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 rounded-full bg-[var(--gold-bg)] px-2.5 py-0.5 text-[11px] text-[var(--gold)]">{label(doc.folder)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{signed?.url ? <a href={signed.url} target="_blank" rel="noreferrer" className="hover:underline">{doc.title}</a> : doc.title}</span>
                  <form action={deleteDocumentRecord}><input type="hidden" name="id" value={doc.id} /><button className="text-xs text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
                </div>
                {(doc.contract_status || doc.due_date || doc.linked_vendor_id || doc.linked_decision_id || doc.notes) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--ink-faint)]">
                    {doc.contract_status && <span>📝 {doc.contract_status}</span>}
                    {doc.due_date && <span>⏳ due {doc.due_date}</span>}
                    {doc.linked_vendor_id && <span>🏷 {vendorName.get(doc.linked_vendor_id) || 'vendor'}</span>}
                    {doc.linked_decision_id && <span>✦ {decisionName.get(doc.linked_decision_id) || 'decision'}</span>}
                    {doc.notes && <span className="truncate">“{doc.notes}”</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
