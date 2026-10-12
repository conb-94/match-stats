import type { Page } from 'playwright/test';
import type { AppState } from '../src/domain/types.ts';

export const START = Date.UTC(2026, 9, 10, 10, 0, 0);

/**
 * Opens the app with the clock paused just after `now` (within 250 ms), after writing `state` straight into IndexedDB
 * (the same record the app saves to). The test then moves time with `setNow`.
 */
export async function openApp(page: Page, opts: { state?: AppState; now?: number } = {}): Promise<void> {
  const now = opts.now ?? START;
  await page.clock.install({ time: now - 10_000 });
  await page.clock.pauseAt(now - 5_000);
  await page.goto('/');
  if (opts.state) {
    await page.evaluate((state) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('match-stats', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(state, 'match-stats/state');
        tx.oncomplete = () => { open.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    }), opts.state);
    await page.reload();
  }
  await page.clock.pauseAt(now);
  await page.clock.runFor(250);
}

/** Reads the app state the app has saved to IndexedDB. */
export async function readState(page: Page): Promise<AppState> {
  return page.evaluate(() => new Promise<AppState>((resolve, reject) => {
    const open = indexedDB.open('match-stats', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = open.result.transaction('kv', 'readonly').objectStore('kv').get('match-stats/state');
      req.onsuccess = () => { open.result.close(); resolve(req.result); };
      req.onerror = () => reject(req.error);
    };
  }));
}

/** The live (or last) match of the first team, as saved. */
export async function savedMatch(page: Page) {
  const state = await readState(page);
  return state.teams[0].seasons.at(-1)!.matches.at(-1)!;
}

/** Moves the paused clock to `ms`, then 250 ms on so the on-screen clocks tick once (times land within 250 ms of `ms`). */
export async function setNow(page: Page, ms: number): Promise<void> {
  await page.clock.pauseAt(ms);
  await page.clock.runFor(250);
}
