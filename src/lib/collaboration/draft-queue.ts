export interface DraftQueueItem<T extends object = Record<string, unknown>> {
  id: string;
  baseVersion: number;
  changes: T;
  timestamp: number;
  retryCount: number;
}

export function parseDraftQueue<T extends object>(raw: string | null): DraftQueueItem<T>[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DraftQueueItem<T> => (
      !!item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      Number.isFinite(item.baseVersion) &&
      !!item.changes &&
      typeof item.changes === 'object' &&
      Number.isFinite(item.timestamp) &&
      Number.isFinite(item.retryCount)
    ));
  } catch {
    return [];
  }
}

export function upsertDraft<T extends object>(
  queue: DraftQueueItem<T>[],
  item: DraftQueueItem<T>,
): DraftQueueItem<T>[] {
  return [...queue.filter((queued) => queued.id !== item.id), item].sort((a, b) => a.timestamp - b.timestamp);
}

export function removeDraft<T extends object>(queue: DraftQueueItem<T>[], id: string): DraftQueueItem<T>[] {
  return queue.filter((item) => item.id !== id);
}

export function markDraftRetry<T extends object>(
  queue: DraftQueueItem<T>[],
  id: string,
  timestamp: number,
): DraftQueueItem<T>[] {
  return queue.map((item) => item.id === id
    ? { ...item, retryCount: item.retryCount + 1, timestamp }
    : item);
}
