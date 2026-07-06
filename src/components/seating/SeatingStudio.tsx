'use client';
// The Seating Studio (North Star Wave A — flagship). A tactile, drag-and-drop seating
// chart built on the guest CRM: drag tables around the room, drag guests (or whole
// households) onto tables, click seats to place or release. planning.wedding's most-loved
// tool, rebuilt through the engine — seats know RSVPs, households, meals, and dietary needs.
import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { addTable, updateTable, deleteTable, assignSeat, unassignSeat, seatHousehold } from '@/app/(app)/seating/actions';
import { seatPositions, seatInitials, type TableShape } from '@/lib/seating/layout';

export interface StudioGuest {
  id: string; firstName: string; lastName?: string;
  householdId?: string; householdName?: string;
  rsvp: 'pending' | 'accepted' | 'declined';
  meal?: string; dietary?: string; isChild?: boolean;
}
export interface StudioTable {
  id: string; label: string; shape: TableShape; capacity: number;
  x: number; y: number; w: number; h: number; rotation: number;
}
export interface StudioAssignment { tableId: string; guestId: string; seatIndex: number }

const SHAPES: { value: TableShape; label: string }[] = [
  { value: 'round', label: 'Round table' },
  { value: 'rect', label: 'Long table' },
  { value: 'square', label: 'Square table' },
  { value: 'head', label: 'Head table' },
  { value: 'row', label: 'Ceremony row' },
];

const RSVP_DOT: Record<string, string> = {
  accepted: 'bg-[var(--sage)]',
  pending: 'bg-[var(--gold)]',
  declined: 'bg-[var(--line)]',
};

export function SeatingStudio({ workspaceId, chartId, chartKind, tables: initialTables, assignments, guests }: {
  workspaceId: string; chartId: string; chartKind: string;
  tables: StudioTable[]; assignments: StudioAssignment[]; guests: StudioGuest[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [tables, setTables] = useState<Record<string, StudioTable>>(
    () => Object.fromEntries(initialTables.map((t) => [t.id, t])),
  );
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [shape, setShape] = useState<TableShape>(chartKind === 'ceremony' ? 'row' : 'round');
  const [capacity, setCapacity] = useState(chartKind === 'ceremony' ? 10 : 8);
  const [notice, setNotice] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const byTable = useMemo(() => {
    const m = new Map<string, Map<number, string>>();
    for (const a of assignments) {
      if (!m.has(a.tableId)) m.set(a.tableId, new Map());
      m.get(a.tableId)!.set(a.seatIndex, a.guestId);
    }
    return m;
  }, [assignments]);
  const seatedGuestIds = useMemo(() => new Set(assignments.map((a) => a.guestId)), [assignments]);

  const unseated = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests
      .filter((g) => g.rsvp !== 'declined' && !seatedGuestIds.has(g.id))
      .filter((g) => !q || `${g.firstName} ${g.lastName ?? ''} ${g.householdName ?? ''}`.toLowerCase().includes(q));
  }, [guests, seatedGuestIds, search]);

  const households = useMemo(() => {
    const m = new Map<string, { id: string | null; name: string; members: StudioGuest[] }>();
    for (const g of unseated) {
      const key = g.householdId ?? '__solo__';
      if (!m.has(key)) m.set(key, { id: g.householdId ?? null, name: g.householdName ?? 'Individuals', members: [] });
      m.get(key)!.members.push(g);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [unseated]);

  const acceptedCount = guests.filter((g) => g.rsvp === 'accepted').length;
  const seatedAccepted = guests.filter((g) => g.rsvp === 'accepted' && seatedGuestIds.has(g.id)).length;
  const everyoneSeated = acceptedCount > 0 && seatedAccepted === acceptedCount;

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2600);
  }

  // ── table dragging (pointer-based, optimistic; persisted on release) ──
  function onTablePointerDown(e: React.PointerEvent, id: string) {
    if ((e.target as HTMLElement).closest('[data-seat]')) return; // seats handle their own clicks
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = tables[id];
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: t.x, origY: t.y };
    setSelectedTable(id);
  }
  function onTablePointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    setTables((ts) => ({
      ...ts,
      [d.id]: { ...ts[d.id], x: Math.max(0, d.origX + e.clientX - d.startX), y: Math.max(0, d.origY + e.clientY - d.startY) },
    }));
  }
  function onTablePointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const t = tables[d.id];
    if (t && (t.x !== d.origX || t.y !== d.origY)) {
      start(async () => { await updateTable({ workspaceId, tableId: d.id, x: Math.round(t.x), y: Math.round(t.y) }); });
    }
  }

  // ── seating ──
  function placeGuest(tableId: string, guestId: string, seatIndex?: number) {
    start(async () => {
      const r = await assignSeat({ workspaceId, chartId, tableId, guestId, seatIndex });
      if (!r.seated) flash(r.reason === 'table_full' ? 'That table is full — try another, or add a seat.' : 'That seat is taken.');
      else setSelectedGuest(null);
      router.refresh();
    });
  }
  function releaseGuest(guestId: string) {
    start(async () => { await unassignSeat(workspaceId, chartId, guestId); router.refresh(); });
  }
  function onTableDrop(e: React.DragEvent, tableId: string) {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('application/x-guest');
    const householdId = e.dataTransfer.getData('application/x-household');
    if (guestId) placeGuest(tableId, guestId);
    else if (householdId) {
      start(async () => {
        const r = await seatHousehold({ workspaceId, chartId, tableId, householdId });
        flash(r.seatedCount === r.total ? 'Household seated together ♥' : `Seated ${r.seatedCount} of ${r.total} — the table filled up.`);
        router.refresh();
      });
    }
  }

  // ── toolbar ──
  function onAddTable() {
    start(async () => { await addTable({ workspaceId, chartId, shape, capacity }); router.refresh(); });
  }
  const sel = selectedTable ? tables[selectedTable] : null;

  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row">
      {/* ─── guest sidebar ─── */}
      <aside className="w-full shrink-0 rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-3 lg:w-72">
        <div className="flex items-center justify-between">
          <h2 className="voice text-lg">Still to seat <span className="text-xs text-[var(--ink-faint)]">· {unseated.length}</span></h2>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a guest…"
          className="mt-2 w-full rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--gold)]"
        />
        <div className="mt-3 max-h-[58vh] space-y-3 overflow-y-auto pr-1">
          {unseated.length === 0 && (
            <p className="text-sm text-[var(--ink-faint)]">{everyoneSeated ? 'Everyone has a seat. Beautifully done. ✦' : 'No one matches — or everyone is seated.'}</p>
          )}
          {households.map((h) => (
            <div key={h.id ?? 'solo'}>
              <div
                draggable={!!h.id}
                onDragStart={(e) => { if (h.id) e.dataTransfer.setData('application/x-household', h.id); }}
                className={'flex items-center justify-between text-[11px] uppercase tracking-wide text-[var(--ink-faint)] ' + (h.id ? 'cursor-grab' : '')}
                title={h.id ? 'Drag to seat this household together' : undefined}
              >
                <span>{h.name}</span>
                {h.id && <span className="text-[var(--gold)]">⠿ together</span>}
              </div>
              <div className="mt-1 space-y-1">
                {h.members.map((g) => (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/x-guest', g.id)}
                    onClick={() => setSelectedGuest(selectedGuest === g.id ? null : g.id)}
                    className={'flex cursor-grab items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-sm transition-all hover:-translate-y-0.5 ' +
                      (selectedGuest === g.id ? 'border-[var(--clay)] bg-[var(--clay-bg)]' : 'border-[var(--line)] bg-white')}
                    title={g.rsvp === 'pending' ? 'Awaiting RSVP' : undefined}
                  >
                    <span className={'h-2 w-2 shrink-0 rounded-full ' + (RSVP_DOT[g.rsvp] ?? 'bg-[var(--line)]')} />
                    <span className="min-w-0 flex-1 truncate">{g.firstName} {g.lastName ?? ''}{g.isChild ? ' 🧒' : ''}</span>
                    {g.dietary && <span title={g.dietary}>🍽</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--ink-faint)]">Drag a guest onto a table — or click a guest, then click their seat. Drag a household name to seat them together.</p>
      </aside>

      {/* ─── the room ─── */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select value={shape} onChange={(e) => setShape(e.target.value as TableShape)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm">
              {SHAPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input
              type="number" min={1} max={40} value={capacity}
              onChange={(e) => setCapacity(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
              className="w-16 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm"
              aria-label="Seats"
            />
            <button onClick={onAddTable} className="rounded-full bg-[var(--clay)] px-4 py-1.5 text-sm text-white transition-transform hover:-translate-y-0.5">+ Add</button>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--ink-soft)]">
            {everyoneSeated
              ? <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full bg-[var(--sage)] px-3 py-1 text-white">✦ Everyone seated</motion.span>
              : <span>{seatedAccepted} of {acceptedCount} accepted guests seated</span>}
          </div>
        </div>

        {sel && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--gold-bg)] px-3 py-2 text-sm">
            <input
              defaultValue={sel.label}
              key={sel.id}
              onBlur={(e) => { const v = e.target.value; if (v !== sel.label) start(async () => { await updateTable({ workspaceId, tableId: sel.id, label: v }); router.refresh(); }); }}
              className="w-36 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-sm"
              aria-label="Table name"
            />
            <span className="text-[var(--ink-faint)]">seats</span>
            <button onClick={() => start(async () => { await updateTable({ workspaceId, tableId: sel.id, capacity: sel.capacity - 1 }); router.refresh(); })} className="rounded-full border border-[var(--line)] bg-white px-2 leading-5">−</button>
            <span>{sel.capacity}</span>
            <button onClick={() => start(async () => { await updateTable({ workspaceId, tableId: sel.id, capacity: sel.capacity + 1 }); router.refresh(); })} className="rounded-full border border-[var(--line)] bg-white px-2 leading-5">+</button>
            <button onClick={() => { setSelectedTable(null); start(async () => { await deleteTable(workspaceId, sel.id); router.refresh(); }); }} className="ml-auto rounded-full px-3 py-1 text-[var(--clay-ink)] hover:bg-[var(--clay-bg)]">Remove table</button>
          </div>
        )}

        {notice && <p className="mt-2 text-sm text-[var(--clay-ink)]">{notice}</p>}

        <div className="relative mt-3 h-[68vh] overflow-auto rounded-[18px] border border-[var(--line)] bg-[var(--cream)]" onClick={() => setSelectedTable(null)}>
          <div className="relative" style={{ width: 1600, height: 1000, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
            {Object.values(tables).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="max-w-sm text-center text-sm text-[var(--ink-faint)]">The room is empty. Add a table above — round, long, head table, or ceremony rows — then drag your people to their places.</p>
              </div>
            )}
            {Object.values(tables).map((t) => {
              const seats = seatPositions({ shape: t.shape, w: t.w, h: t.h, capacity: t.capacity });
              const occupants = byTable.get(t.id) ?? new Map<number, string>();
              const isRow = t.shape === 'row';
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => { e.stopPropagation(); onTablePointerDown(e, t.id); }}
                  onPointerMove={onTablePointerMove}
                  onPointerUp={onTablePointerUp}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onTableDrop(e, t.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute cursor-grab select-none touch-none"
                  style={{ left: t.x, top: t.y, width: t.w, height: t.h, transform: `rotate(${t.rotation}deg)` }}
                >
                  <div
                    className={'absolute inset-0 border transition-shadow ' +
                      (selectedTable === t.id ? 'border-[var(--clay)] shadow-md ' : 'border-[#D8C7A6] shadow-sm ') +
                      (isRow ? 'rounded-full bg-[var(--pearl)]' : t.shape === 'round' ? 'rounded-full bg-[var(--pearl)]' : 'rounded-[14px] bg-[var(--pearl)]')}
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                    <span className="voice truncate text-sm text-[var(--ink)]">{t.label}</span>
                    <span className="text-[10px] text-[var(--ink-faint)]">{occupants.size}/{t.capacity}</span>
                  </div>
                  {seats.map((s) => {
                    const gid = occupants.get(s.index);
                    const g = gid ? guestById.get(gid) : undefined;
                    return (
                      <button
                        key={s.index}
                        data-seat
                        onClick={(e) => {
                          e.stopPropagation();
                          if (g) releaseGuest(g.id);
                          else if (selectedGuest) placeGuest(t.id, selectedGuest, s.index);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.stopPropagation(); e.preventDefault();
                          const guestId = e.dataTransfer.getData('application/x-guest');
                          if (guestId) placeGuest(t.id, guestId, s.index);
                        }}
                        title={g ? `${g.firstName} ${g.lastName ?? ''}${g.meal ? ` · ${g.meal}` : ''}${g.dietary ? ` · ${g.dietary}` : ''} — click to release` : selectedGuest ? 'Click to seat here' : `Seat ${s.index + 1}`}
                        className={'absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[9px] transition-transform hover:scale-125 ' +
                          (g
                            ? 'bg-[var(--clay)] text-white shadow'
                            : selectedGuest
                              ? 'border-2 border-dashed border-[var(--clay)] bg-white text-transparent'
                              : 'border border-[#D8C7A6] bg-white text-transparent')}
                        style={{ left: s.x, top: s.y }}
                      >
                        {g ? seatInitials(g.firstName, g.lastName) : '·'}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
