// Weaver maturity (Phase 2, P3) — the deterministic guard that makes AI insights
// trustworthy: every AI "claim" must cite a real entity/fact from the context, or it
// is dropped. Pure + I/O-free so it is fully unit-testable without a model call.
//
// Vocabulary:
//  - a *claim* is an actionable AI assertion (a next action or an AI-authored risk).
//  - a *citation* points at something concrete in the context the engine was given.
//  - deterministic insights (from rules.ts) are NOT subject to this guard — they *are*
//    the facts, and carry source='deterministic'.

export type CitationType =
  | 'board_item' | 'budget_item' | 'vendor' | 'decision' | 'task' | 'compass' | 'fact';

export interface Citation {
  type: CitationType;
  /** entity id, or — for `fact` — the fact `kind`; omitted for `compass`. */
  id?: string;
  label?: string;
}

export interface EntityIndex {
  ids: Record<string, Set<string>>;
  factKinds: Set<string>;
  hasCompass: boolean;
}

interface WithId { id?: string | null }

/** Build the set of citable things from the engine context handed to the model. */
export function buildEntityIndex(context: Record<string, unknown>): EntityIndex {
  const setOf = (arr: unknown, key = 'id'): Set<string> => {
    const s = new Set<string>();
    if (Array.isArray(arr)) {
      for (const row of arr as WithId[]) {
        const v = (row as Record<string, unknown>)?.[key];
        if (typeof v === 'string' && v) s.add(v);
      }
    }
    return s;
  };
  const facts = context.deterministicFacts;
  const factKinds = new Set<string>();
  if (Array.isArray(facts)) {
    for (const f of facts as { kind?: unknown }[]) {
      if (typeof f?.kind === 'string') factKinds.add(f.kind);
    }
  }
  return {
    ids: {
      board_item: setOf(context.boardItems),
      budget_item: setOf(context.budgetItems),
      vendor: setOf(context.vendors),
      decision: setOf(context.decisions),
      task: setOf(context.tasks),
    },
    factKinds,
    hasCompass: !!context.weddingCompass,
  };
}

/** True when a citation points at something that actually exists in the context. */
export function isCitationGrounded(c: Citation, idx: EntityIndex): boolean {
  if (!c || typeof c.type !== 'string') return false;
  if (c.type === 'compass') return idx.hasCompass;
  if (c.type === 'fact') return !!c.id && idx.factKinds.has(c.id);
  const set = idx.ids[c.type];
  return !!set && !!c.id && set.has(c.id);
}

/** Keep only the grounded citations (deduped by type+id). */
export function groundedCitations(cs: Citation[] | undefined, idx: EntityIndex): Citation[] {
  if (!Array.isArray(cs)) return [];
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of cs) {
    if (!isCitationGrounded(c, idx)) continue;
    const key = `${c.type}:${c.id ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: c.type, id: c.id, label: c.label });
  }
  return out;
}

export interface Claim {
  type: string;      // recommendation_type, e.g. 'next_action' | risk type
  title: string;
  detail?: string;
  citations?: Citation[];
}
export interface GuardedClaim {
  type: string;
  title: string;
  detail?: string;
  source: 'ai';
  citations: Citation[];
  kept: boolean;
  dropReason?: string;
}

/**
 * Deterministic guard: drop any AI claim that, after grounding, cites nothing real.
 * Returns kept + dropped claims and the citation coverage (grounded / total).
 */
export function guardClaims(
  claims: Claim[],
  idx: EntityIndex,
): { kept: GuardedClaim[]; dropped: GuardedClaim[]; coverage: number } {
  const kept: GuardedClaim[] = [];
  const dropped: GuardedClaim[] = [];
  for (const claim of claims) {
    const citations = groundedCitations(claim.citations, idx);
    const g: GuardedClaim = {
      type: claim.type,
      title: claim.title,
      detail: claim.detail,
      source: 'ai',
      citations,
      kept: citations.length > 0,
    };
    if (g.kept) kept.push(g);
    else { g.dropReason = 'no grounded citation'; dropped.push(g); }
  }
  const total = claims.length;
  const coverage = total === 0 ? 1 : Number((kept.length / total).toFixed(4));
  return { kept, dropped, coverage };
}

/**
 * Stable, runtime-agnostic hash of the engine input (FNV-1a over a key-sorted JSON
 * projection). Used as `planning_engine_runs.input_hash` for reproducibility/audit.
 * Avoids node:crypto so it runs identically in workerd and in tests.
 */
export function contextInputHash(context: Record<string, unknown>): string {
  const json = stableStringify(context);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
