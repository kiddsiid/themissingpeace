export interface VersionedOutput {
  source_hash?: string | null;
  is_stale?: boolean | null;
}

/** Deterministic output-freshness selector. Existing exports are never discarded. */
export function staleOutput(sourceHash: string | null | undefined, output: VersionedOutput | null | undefined): boolean {
  if (!output) return true;
  if (output.is_stale) return true;
  if (!sourceHash || !output.source_hash) return true;
  return sourceHash !== output.source_hash;
}

export function stableSourceHash(value: unknown): string {
  const input = JSON.stringify(value, Object.keys((value as Record<string, unknown>) ?? {}).sort());
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `src_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
