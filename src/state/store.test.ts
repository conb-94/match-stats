import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.ts';
import { initialState } from './reducer.ts';
import type { AppState } from '../domain/types.ts';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('dispatch saves after every action and reports errors', async () => {
  const saved: AppState[] = [];
  const store = createStore(initialState(), async (s) => { saved.push(s); }, { now: () => 1000 }, () => 'id');
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  assert.equal(store.dispatch({ type: 'team/create', name: 'T', format: 5 }), null);
  await tick();
  assert.deepEqual(saved, [store.getState()]);
  assert.equal(notified, 1);
  assert.equal(store.dispatch({ type: 'match/undo' }), 'no_live_match');
  await tick();
  assert.equal(saved.length, 1);
});

test('a failed save is reported', async () => {
  const store = createStore(initialState(), () => Promise.reject(new Error('full')), { now: () => 1 }, () => 'id');
  assert.equal(store.saveFailed(), false);
  store.dispatch({ type: 'team/create', name: 'T', format: 5 });
  await tick();
  assert.equal(store.saveFailed(), true);
});

test('saves happen in the order actions were made', async () => {
  const order: number[] = [];
  let calls = 0;
  const save = (s: AppState) => {
    const n = ++calls;
    return new Promise<void>((resolve) => setTimeout(() => { order.push(n); resolve(); }, n === 1 ? 20 : 0));
  };
  const store = createStore(initialState(), save, { now: () => 1 }, () => `id${calls}`);
  store.dispatch({ type: 'team/create', name: 'A', format: 5 });
  store.dispatch({ type: 'team/rename', name: 'B' });
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(order, [1, 2]);
});
