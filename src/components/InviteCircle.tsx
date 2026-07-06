'use client';
// "Invite your circle" — partner / planner / helper. Calls the Clerk-org invite action.
import { useState, useTransition } from 'react';
import { inviteMember } from '@/app/(app)/peace-center/invite';

export function InviteCircle() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setMsg(null); setErr(null);
    start(async () => {
      const r = await inviteMember(fd);
      if (r.ok) { setMsg('Invitation sent ✦'); }
      else setErr(r.error || 'Something went wrong.');
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-[#D8C7A6] px-4 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">
        ✦ Invite your circle
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="voice text-xl">Invite your circle</h2>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">Bring your partner or planner into the dream.</p>
            <form action={submit} className="mt-4 space-y-3">
              <input name="email" type="email" required placeholder="their@email.com"
                className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]" />
              <select name="appRole" defaultValue="partner" className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">
                <option value="partner">Partner</option>
                <option value="planner">Wedding planner</option>
                <option value="collaborator">Helper (family / friend)</option>
              </select>
              {msg && <p className="rounded-md bg-[var(--sage-bg)] px-3 py-2 text-sm text-[#566049]">{msg}</p>}
              {err && <p className="rounded-md bg-[var(--clay-bg)] px-3 py-2 text-sm text-[var(--clay-ink)]">{err}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)]">Close</button>
                <button type="submit" disabled={pending} className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white disabled:opacity-60">{pending ? 'Sending…' : 'Send invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
