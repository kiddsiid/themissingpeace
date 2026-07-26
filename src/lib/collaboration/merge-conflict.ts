export interface FieldConflict {
  field: string;
  base: unknown;
  mine: unknown;
  theirs: unknown;
  canCombine: boolean;
}

export interface MergeResult<T extends Record<string, unknown>> {
  merged: T;
  conflicts: FieldConflict[];
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Pure field-level three-way merge. Non-overlapping changes merge automatically. */
export function mergeConflict<T extends Record<string, unknown>>(base: T, mine: T, theirs: T): MergeResult<T> {
  const merged = { ...base } as T;
  const conflicts: FieldConflict[] = [];
  const fields = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);

  for (const field of fields) {
    const before = base[field];
    const mineValue = mine[field];
    const theirValue = theirs[field];
    const mineChanged = !same(before, mineValue);
    const theirsChanged = !same(before, theirValue);

    if (mineChanged && !theirsChanged) merged[field as keyof T] = mineValue as T[keyof T];
    else if (!mineChanged && theirsChanged) merged[field as keyof T] = theirValue as T[keyof T];
    else if (!mineChanged && !theirsChanged) merged[field as keyof T] = before as T[keyof T];
    else if (same(mineValue, theirValue)) merged[field as keyof T] = mineValue as T[keyof T];
    else {
      conflicts.push({
        field,
        base: before,
        mine: mineValue,
        theirs: theirValue,
        canCombine: typeof mineValue === 'string' && typeof theirValue === 'string',
      });
    }
  }

  return { merged, conflicts };
}

export function combineConflictValues(mine: unknown, theirs: unknown): unknown {
  if (typeof mine === 'string' && typeof theirs === 'string') {
    const parts = [mine.trim(), theirs.trim()].filter(Boolean);
    return [...new Set(parts)].join('\n');
  }
  if (Array.isArray(mine) && Array.isArray(theirs)) {
    return [...mine, ...theirs.filter((value) => !mine.some((existing) => same(existing, value)))];
  }
  return mine;
}
