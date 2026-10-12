import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveMatch, lineupAt } from './derive.ts';
import { base, K, withEvents } from './fixtures.ts';

test('a sub stops one clock and starts the other', () => {
  const m = withEvents(base, { type: 'sub', t: 630_000, offId: 'c', onId: 'd' });
  const d = deriveMatch(m, K + 1_062_000);
  assert.deepEqual(d.playedMs, { a: 1_062_000, b: 1_062_000, c: 630_000, d: 432_000, e: 0 });
  assert.deepEqual(d.onPitch, ['a', 'b', 'd']);
  assert.deepEqual(d.bench, ['e', 'c']);
});

test('a player who goes back on carries on from their earlier total', () => {
  const m = withEvents(base,
    { type: 'sub', t: 600_000, offId: 'c', onId: 'd' },
    { type: 'sub', t: 900_000, offId: 'd', onId: 'c' });
  const d = deriveMatch(m, K + 1_200_000);
  assert.equal(d.playedMs.c, 900_000);
  assert.equal(d.playedMs.d, 300_000);
});

test('play time does not count the half-time break', () => {
  const m = withEvents(base, { type: 'halftime', at: K + 1_500_000 }, { type: 'secondhalf', at: K + 2_400_000 });
  assert.equal(deriveMatch(m, K + 2_700_000).playedMs.a, 1_800_000);
});

test('score, goals and assists', () => {
  const m = withEvents(base,
    { type: 'goal', t: 100_000, side: 'us', scorerId: 'a', assistId: 'b', ownGoal: false },
    { type: 'goal', t: 200_000, side: 'them', scorerId: null, assistId: null, ownGoal: false },
    { type: 'goal', t: 300_000, side: 'us', scorerId: null, assistId: null, ownGoal: true });
  const d = deriveMatch(m, K + 400_000);
  assert.deepEqual(d.score, { us: 2, them: 1 });
  assert.deepEqual(d.goals, { a: 1 });
  assert.deepEqual(d.assists, { b: 1 });
});

test('lineupAt gives who was on the pitch at a match time', () => {
  const m = withEvents(base, { id: 's1', type: 'sub', t: 630_000, offId: 'c', onId: 'd' });
  assert.deepEqual(lineupAt(m, 600_000).onPitch, ['a', 'b', 'c']);
  assert.deepEqual(lineupAt(m, 700_000).onPitch, ['a', 'b', 'd']);
  assert.deepEqual(lineupAt(m, 700_000, 's1').onPitch, ['a', 'b', 'c']);
});
