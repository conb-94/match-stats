// Saves the whole app state as one record in the phone's IndexedDB.
import type { AppState } from '../domain/types.ts';
import { initialState } from './reducer.ts';

const DB_NAME = 'match-stats';
const STORE = 'kv';
export const STATE_KEY = 'match-stats/state';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

export async function loadState(): Promise<AppState> {
  const value = await run<AppState | undefined>('readonly', (s) => s.get(STATE_KEY));
  return value ?? initialState();
}

export function saveState(state: AppState): Promise<void> {
  return run('readwrite', (s) => s.put(state, STATE_KEY)).then(() => undefined);
}
