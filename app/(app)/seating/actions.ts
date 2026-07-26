'use server';
// Seating Studio actions (0012 / North Star Wave A — flagship). Charts, tables, and
// per-seat assignments on top of the guest CRM. Workspace-scoped via requireActiveWorkspace;
// seat writes verify the chart belongs to the active workspace.
import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { defaultFrame, firstOpenSeat, type TableShape } from '@/lib/seating/layout';
import { markSeatingOutputsStale } from '@/app/(app)/outputs/actions';

async function requireWrite() {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full')) throw new Error('You do not have permission to arrange seating');
  return ws;
}

async function assertChart(workspaceId: string, chartId: string) {
  const { data } = await supabaseAdmin()
    .from('seating_charts').select('id').eq('id', chartId).eq('workspace_id', workspaceId).maybeSingle();
  if (!data) throw new Error('Chart not found');
}

// ─────────────────────────── charts ───────────────────────────

/** Ensure the default charts exist (Reception + Ceremony); returns nothing, page reloads. */
export async function seedCharts() {
  const ws = await requireWrite();
  const db = supabaseAdmin();
  const { count } = await db.from('seating_charts').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id);
  if (count && count > 0) { revalidatePath('/seating'); return; }
  await db.from('seating_charts').insert([
    { workspace_id: ws.id, name: 'Reception', kind: 'reception', created_by: ws.userId },
    { workspace_id: ws.id, name: 'Ceremony', kind: 'ceremony', created_by: ws.userId },
  ]);
  revalidatePath('/seating');
}

// ─────────────────────────── tables ───────────────────────────

export async function addTable(args: {
  workspaceId: string; chartId: string; shape: TableShape; capacity: number; label?: string;
}) {
  const ws = await requireWrite();
  if (ws.id !== args.workspaceId) throw new Error('Workspace mismatch');
  await assertChart(ws.id, args.chartId);
  const db = supabaseAdmin();
  const capacity = Math.max(1, Math.min(40, Math.round(args.capacity)));
  const { w, h } = defaultFrame(args.shape, capacity);
  const { count } = await db.from('seating_tables').select('id', { count: 'exact', head: true }).eq('chart_id', args.chartId);
  const n = count ?? 0;
  // Stagger new tables so they don't stack.
  const x = 80 + (n % 4) * 240;
  const y = 80 + Math.floor(n / 4) * 240;
  const label = args.label?.trim() || (args.shape === 'row' ? `Row ${n + 1}` : args.shape === 'head' ? 'Head table' : `Table ${n + 1}`);
  const { data, error } = await db.from('seating_tables').insert({
    chart_id: args.chartId, workspace_id: ws.id, label, shape: args.shape,
    capacity, x, y, w, h, sort: n,
  }).select('id').single();
  if (error) throw error;
  await markSeatingOutputsStale(ws.id);
  revalidatePath('/seating');
  return { id: data!.id as string };
}

export async function updateTable(args: {
  workspaceId: string; tableId: string;
  x?: number; y?: number; w?: number; h?: number; rotation?: number;
  label?: string; capacity?: number;
}) {
  const ws = await requireWrite();
  if (ws.id !== args.workspaceId) throw new Error('Workspace mismatch');
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  for (const k of ['x', 'y', 'w', 'h', 'rotation'] as const) if (args[k] !== undefined) patch[k] = args[k];
  if (args.label !== undefined) patch.label = args.label.trim() || 'Table';
  if (args.capacity !== undefined) patch.capacity = Math.max(1, Math.min(40, Math.round(args.capacity)));
  if (!Object.keys(patch).length) return;
  await db.from('seating_tables').update(patch).eq('id', args.tableId).eq('workspace_id', ws.id);
  // Shrinking capacity may strand assignments past the new capacity — release them kindly.
  if (patch.capacity !== undefined) {
    const { data: t } = await db.from('seating_tables').select('capacity').eq('id', args.tableId).maybeSingle();
    if (t) await db.from('seat_assignments').delete().eq('table_id', args.tableId).gte('seat_index', t.capacity);
  }
  await markSeatingOutputsStale(ws.id);
  revalidatePath('/seating');
}

export async function deleteTable(workspaceId: string, tableId: string) {
  const ws = await requireWrite();
  if (ws.id !== workspaceId) throw new Error('Workspace mismatch');
  await supabaseAdmin().from('seating_tables').delete().eq('id', tableId).eq('workspace_id', ws.id);
  await markSeatingOutputsStale(ws.id);
  revalidatePath('/seating');
}

// ─────────────────────────── seats ───────────────────────────

/** Seat a guest at a table. Specific seat when given; otherwise first open seat.
 *  Re-seating a guest already placed elsewhere on this chart moves them. */
export async function assignSeat(args: {
  workspaceId: string; chartId: string; tableId: string; guestId: string; seatIndex?: number;
}) {
  const ws = await requireWrite();
  if (ws.id !== args.workspaceId) throw new Error('Workspace mismatch');
  await assertChart(ws.id, args.chartId);
  const db = supabaseAdmin();

  const [{ data: table }, { data: taken }] = await Promise.all([
    db.from('seating_tables').select('capacity').eq('id', args.tableId).eq('chart_id', args.chartId).maybeSingle(),
    db.from('seat_assignments').select('seat_index, guest_id').eq('table_id', args.tableId),
  ]);
  if (!table) throw new Error('Table not found');

  let seatIndex = args.seatIndex;
  if (seatIndex === undefined || seatIndex === null) {
    const open = firstOpenSeat(table.capacity, (taken ?? []).map((t: any) => t.seat_index));
    if (open === null) return { seated: false, reason: 'table_full' as const };
    seatIndex = open;
  } else {
    if (seatIndex < 0 || seatIndex >= table.capacity) throw new Error('No such seat');
    const occupant = (taken ?? []).find((t: any) => t.seat_index === seatIndex);
    if (occupant && occupant.guest_id !== args.guestId) return { seated: false, reason: 'seat_taken' as const };
  }

  // Move semantics: clear any previous seat for this guest on this chart, then place.
  await db.from('seat_assignments').delete().eq('chart_id', args.chartId).eq('guest_id', args.guestId);
  const { error } = await db.from('seat_assignments').insert({
    chart_id: args.chartId, table_id: args.tableId, guest_id: args.guestId,
    seat_index: seatIndex, created_by: ws.userId,
  });
  if (error) throw error;
  await markSeatingOutputsStale(ws.id);
  revalidatePath('/seating');
  return { seated: true as const, seatIndex };
}

export async function unassignSeat(workspaceId: string, chartId: string, guestId: string) {
  const ws = await requireWrite();
  if (ws.id !== workspaceId) throw new Error('Workspace mismatch');
  await assertChart(ws.id, chartId);
  await supabaseAdmin().from('seat_assignments').delete().eq('chart_id', chartId).eq('guest_id', guestId);
  await markSeatingOutputsStale(ws.id);
  revalidatePath('/seating');
}

/** Seat a whole household together at a table (fills open seats in order; skips who doesn't fit). */
export async function seatHousehold(args: { workspaceId: string; chartId: string; tableId: string; householdId: string }) {
  const ws = await requireWrite();
  if (ws.id !== args.workspaceId) throw new Error('Workspace mismatch');
  await assertChart(ws.id, args.chartId);
  const db = supabaseAdmin();
  const [{ data: table }, { data: members }] = await Promise.all([
    db.from('seating_tables').select('capacity').eq('id', args.tableId).eq('chart_id', args.chartId).maybeSingle(),
    db.from('guests').select('id').eq('workspace_id', ws.id).eq('household_id', args.householdId).neq('rsvp_status', 'declined').order('created_at', { ascending: true }),
  ]);
  if (!table) throw new Error('Table not found');
  let seatedCount = 0;
  for (const g of members ?? []) {
    const { data: taken } = await db.from('seat_assignments').select('seat_index').eq('table_id', args.tableId);
    const open = firstOpenSeat(table.capacity, (taken ?? []).map((t: any) => t.seat_index));
    if (open === null) break;
    await db.from('seat_assignments').delete().eq('chart_id', args.chartId).eq('guest_id', g.id);
    await db.from('seat_assignments').insert({
      chart_id: args.chartId, table_id: args.tableId, guest_id: g.id, seat_index: open, created_by: ws.userId,
    });
    seatedCount++;
  }
  if (seatedCount) await markSeatingOutputsStale(ws.id);
  revalidatePath('/seating');
  return { seatedCount, total: (members ?? []).length };
}
