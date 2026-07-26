export interface FeastOfflineDraft<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  workspaceId: string;
  objectType: 'plan' | 'dish';
  objectId: string;
  sceneId?: string;
  baseVersion: number;
  changes: T;
  timestamp: number;
  retryCount: number;
}

const DATABASE = 'missing-peace';
const STORE = 'feast-drafts';
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('workspaceId', 'workspaceId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local draft store'));
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    run(store, resolve, reject);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Local draft transaction failed'));
    };
  });
}

export async function putFeastDraft<T extends Record<string, unknown>>(
  draft: FeastOfflineDraft<T>,
): Promise<void> {
  return transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(draft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFeastDraft(id: string): Promise<void> {
  return transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getFeastDrafts(workspaceId: string): Promise<FeastOfflineDraft[]> {
  return transact<FeastOfflineDraft[]>('readonly', (store, resolve, reject) => {
    const request = store.index('workspaceId').getAll(workspaceId);
    request.onsuccess = () => resolve(
      (request.result as FeastOfflineDraft[]).sort((left, right) => left.timestamp - right.timestamp),
    );
    request.onerror = () => reject(request.error);
  });
}

