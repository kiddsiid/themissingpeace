import { redirect } from 'next/navigation';
import {
  outputSourceHash,
  regenerateOutput,
} from '@/app/(app)/outputs/actions';
import { staleOutput } from '@/lib/outputs/freshness';
import type { OutputKind } from '@/lib/outputs/kinds';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { Chip } from '@/design-system';

const ITEMS: { kind: OutputKind; title: string; desc: string; source: string }[] = [
  { kind: 'escort-cards', title: 'Escort cards', desc: 'Alphabetical cards telling each guest their table.', source: 'Seating assignments + guests' },
  { kind: 'place-cards', title: 'Place cards', desc: 'Per-seat cards with each guest’s name and meal choice.', source: 'Seating assignments + meal choices' },
  { kind: 'table-numbers', title: 'Table numbers', desc: 'Numbered cards for every table in the room.', source: 'Reception table plan' },
  { kind: 'seating-sign', title: 'Seating chart sign', desc: 'A find-your-seat sign listing every table and guest.', source: 'Reception table plan + guests' },
  { kind: 'menu', title: 'Menu cards', desc: 'A dinner menu assembled from accepted guest meal choices.', source: 'Guest meal choices' },
  { kind: 'caterer-brief', title: 'Caterer brief', desc: 'A private, versioned handoff of the current meal flow, guest-care confirmations, and execution plan.', source: 'Feast Plan + evidence' },
  { kind: 'save-the-date', title: 'Save the date', desc: 'Names, date, Compass tone, and approved palette.', source: 'Profile + Compass + Atmosphere' },
  { kind: 'invitation', title: 'Invitation', desc: 'The formal ask, connected to the current world.', source: 'Profile + Compass + Atmosphere' },
];

export default async function PrintablesPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');
  const db = supabaseAdmin();
  const { data: versionsData } = await db
    .from('output_versions')
    .select('id, output_kind, source_hash, is_stale, version, created_at')
    .eq('workspace_id', workspace.id)
    .in('output_kind', ITEMS.map((item) => item.kind))
    .order('version', { ascending: false });
  const versions = versionsData ?? [];
  const hashes = new Map(await Promise.all(ITEMS.map(async (item) => [item.kind, await outputSourceHash(workspace.id, item.kind)] as const)));

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Versioned paper, from your plan</p>
      <h1 className="voice text-4xl">Printables</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
        Each generated draft records the exact source plan it came from. If seating or guest data changes, the prior export stays intact and an update becomes available.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ITEMS.map((item) => {
          const history = versions.filter((version: any) => version.output_kind === item.kind);
          const latest = history[0];
          const stale = staleOutput(hashes.get(item.kind), latest);
          return (
            <article key={item.kind} className="rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--gold)]">Draft output · {item.source}</p>
                  <h2 className="voice mt-1 text-xl">{item.title}</h2>
                </div>
                <Chip tone={!latest ? 'neutral' : stale ? 'clay' : 'sage'}>
                  {!latest ? 'Not generated' : stale ? 'Update available' : `Current · v${latest.version}`}
                </Chip>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.desc}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={regenerateOutput}>
                  <input type="hidden" name="kind" value={item.kind} />
                  <button className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--pearl)]">
                    {!latest ? 'Generate draft' : stale ? 'Generate updated version' : 'Create new version'}
                  </button>
                </form>
                {latest && (
                  <a href={`/print/${item.kind}`} target="_blank" className="rounded-full border border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-soft)]">
                    Open latest ↗
                  </a>
                )}
              </div>

              {history.length > 0 && (
                <details className="mt-4 border-t border-[var(--line)] pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--ink)]">Version history ({history.length})</summary>
                  <ul className="mt-2 space-y-1.5">
                    {history.map((version: any) => (
                      <li key={version.id} className="flex items-center justify-between gap-3 rounded-[9px] bg-[var(--cream)]/60 px-3 py-2 text-xs">
                        <span>Version {version.version}</span>
                        <span className="text-[var(--ink-soft)]">{version.is_stale || version.source_hash !== hashes.get(item.kind) ? 'Prior source' : 'Current source'}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
