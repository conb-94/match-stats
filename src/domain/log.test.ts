import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteEvent, editEvent, logGoal, logPeriod, logSub, undoLast } from './log.ts';
import { clockMs, period } from './clock.ts';
import { deriveMatch } from './derive.ts';
import { base, K, withEvents } from './fixtures.ts';

const now = K + 1_062_000;

test('logSub stamps the match time and swaps the players', () => {
  const r = logSub(base, 'c', 'd', now, 's1');
  assert.ok(r.ok);
  assert.deepEqual(r.match.events.at(-1), { id: 's1', type: 'sub', t: 1_062_000, offId: 'c', onId: 'd' });
});

test('logSub refuses players in the wrong place', () => {
  assert.deepEqual(logSub(base, 'd', 'e', now, 's1'), { ok: false, error: 'off_not_on_pitch' });
  assert.deepEqual(logSub(base, 'a', 'b', now, 's1'), { ok: false, error: 'on_not_on_bench' });
});

test('logGoal checks scorer, assist and double taps', () => {
  const g = { t: 500_000, side: 'us' as const, scorerId: 'a', assistId: 'b', ownGoal: false };
  assert.deepEqual(logGoal(base, { ...g, scorerId: 'd' }, now, 'g1'), { ok: false, error: 'scorer_not_on_pitch' });
  assert.deepEqual(logGoal(base, { ...g, assistId: 'a' }, now, 'g1'), { ok: false, error: 'assist_is_scorer' });
  const once = logGoal(base, g, now, 'g1');
  assert.ok(once.ok);
  assert.deepEqual(logGoal(once.match, g, now, 'g2'), { ok: false, error: 'duplicate' });
});

test('logGoal refuses a negative time', () => {
  const g = { t: -1, side: 'them' as const, scorerId: null, assistId: null, ownGoal: false };
  assert.deepEqual(logGoal(base, g, now, 'g1'), { ok: false, error: 'time_out_of_range' });
});

test('periods must happen in order', () => {
  assert.deepEqual(logPeriod(base, 'fulltime', now, 'p'), { ok: false, error: 'wrong_period' });
  assert.deepEqual(logPeriod(base, 'secondhalf', now, 'p'), { ok: false, error: 'wrong_period' });
  const h = logPeriod(base, 'halftime', now, 'h');
  assert.ok(h.ok);
  assert.equal(period(h.match), 'halftime');
  assert.deepEqual(logPeriod(h.match, 'halftime', now, 'h2'), { ok: false, error: 'wrong_period' });
});

test('undo removes the last thing logged, including full time', () => {
  assert.deepEqual(undoLast(base), { ok: false, error: 'nothing_to_undo' });
  const done = withEvents(base, { type: 'halftime', at: K + 1 }, { type: 'secondhalf', at: K + 2 }, { type: 'fulltime', at: K + 3 });
  const r = undoLast(done);
  assert.ok(r.ok);
  assert.equal(period(r.match), 'second');
});

test('a correction that breaks a later entry is refused', () => {
  const m = withEvents(base,
    { id: 's1', type: 'sub', t: 600_000, offId: 'c', onId: 'd' },
    { id: 's2', type: 'sub', t: 900_000, offId: 'd', onId: 'c' });
  assert.deepEqual(deleteEvent(m, 's1', now), { ok: false, error: 'off_not_on_pitch' });
  assert.deepEqual(editEvent(m, 's2', { t: 500_000 }, now), { ok: false, error: 'off_not_on_pitch' });
});

test('changing a scorer moves the goal', () => {
  const m = withEvents(base, { id: 'g1', type: 'goal', t: 500_000, side: 'us', scorerId: 'a', assistId: null, ownGoal: false });
  const r = editEvent(m, 'g1', { scorerId: 'b' }, now);
  assert.ok(r.ok);
  assert.deepEqual(deriveMatch(r.match, now).goals, { b: 1 });
});

test('a late full time can be corrected to the real time', () => {
  const m = withEvents(base,
    { type: 'halftime', at: K + 1_500_000 }, { type: 'secondhalf', at: K + 2_400_000 },
    { id: 'g1', type: 'goal', t: 2_000_000, side: 'them', scorerId: null, assistId: null, ownGoal: false },
    { id: 'ft', type: 'fulltime', at: K + 30_000_000 });
  const r = editEvent(m, 'ft', { t: 3_000_000 }, K + 31_000_000);
  assert.ok(r.ok);
  assert.equal(clockMs(r.match, K + 31_000_000), 3_000_000);
  assert.deepEqual(editEvent(m, 'ft', { t: 1_900_000 }, K + 31_000_000), { ok: false, error: 'time_out_of_range' });
});

test('whistles cannot be deleted, and unknown ids are reported', () => {
  const m = withEvents(base, { id: 'h', type: 'halftime', at: K + 1_500_000 }, { id: 'sh', type: 'secondhalf', at: K + 2_400_000 });
  assert.deepEqual(deleteEvent(m, 'h', now), { ok: false, error: 'not_deletable' });
  assert.deepEqual(deleteEvent(m, 'k', now), { ok: false, error: 'not_deletable' });
  assert.deepEqual(deleteEvent(m, 'zzz', now), { ok: false, error: 'not_found' });
  assert.deepEqual(editEvent(m, 'zzz', { t: 0 }, now), { ok: false, error: 'not_found' });
});

test('inputs are never changed', () => {
  const before = JSON.stringify(base);
  logSub(base, 'c', 'd', now, 's1');
  undoLast(withEvents(base, { type: 'halftime', at: K + 1 }));
  assert.equal(JSON.stringify(base), before);
});

// --- Final review fixes ---

test('correcting half time moves the second-half entries with it', () => {
  const m = withEvents(base,
    { id: 'h', type: 'halftime', at: K + 1_800_000 }, { id: 'sh', type: 'secondhalf', at: K + 2_400_000 },
    { id: 's', type: 'sub', t: 2_400_000, offId: 'c', onId: 'd' },
    { id: 'ft', type: 'fulltime', at: K + 3_900_000 });
  const r = editEvent(m, 'h', { t: 1_500_000 }, K + 5_000_000);
  assert.ok(r.ok);
  assert.equal(r.match.events.find((e) => e.id === 's')!.type === 'sub' && (r.match.events.find((e) => e.id === 's') as { t: number }).t, 2_100_000);
  assert.equal(clockMs(r.match, K + 5_000_000), 3_000_000);
});

test('half time cannot be moved before something logged in the first half', () => {
  const m = withEvents(base,
    { id: 'g', type: 'goal', t: 1_700_000, side: 'them', scorerId: null, assistId: null, ownGoal: false },
    { id: 'h', type: 'halftime', at: K + 1_800_000 });
  assert.deepEqual(editEvent(m, 'h', { t: 1_500_000 }, K + 2_000_000), { ok: false, error: 'time_out_of_range' });
});

test('moving kick off later shifts every entry', () => {
  const m = withEvents(base, { id: 's', type: 'sub', t: 600_000, offId: 'c', onId: 'd' });
  const r = editEvent(m, 'k', { at: K + 300_000 }, K + 1_000_000);
  assert.ok(r.ok);
  assert.equal((r.match.events.find((e) => e.id === 's') as { t: number }).t, 300_000);
  assert.equal(clockMs(r.match, K + 1_000_000), 700_000);
  assert.deepEqual(editEvent(m, 'k', { at: K + 700_000 }, K + 1_000_000), { ok: false, error: 'time_out_of_range' });
});

test('a late start to the second half can be corrected', () => {
  const m = withEvents(base,
    { id: 'h', type: 'halftime', at: K + 1_500_000 }, { id: 'sh', type: 'secondhalf', at: K + 2_400_000 },
    { id: 'g', type: 'goal', t: 1_800_000, side: 'them', scorerId: null, assistId: null, ownGoal: false });
  const r = editEvent(m, 'sh', { at: K + 2_100_000 }, K + 2_700_000);
  assert.ok(r.ok);
  assert.equal((r.match.events.find((e) => e.id === 'g') as { t: number }).t, 2_100_000);
  assert.equal(clockMs(r.match, K + 2_700_000), 2_100_000);
  assert.deepEqual(editEvent(m, 'sh', { at: K + 1_400_000 }, K + 2_700_000), { ok: false, error: 'time_out_of_range' });
});

test('full time can be blown after the phone clock jumps backwards', () => {
  const m = withEvents(base,
    { type: 'halftime', at: K + 1_500_000 }, { type: 'secondhalf', at: K + 2_000_000 },
    { type: 'goal', t: 2_400_000, side: 'them', scorerId: null, assistId: null, ownGoal: false });
  const jumpedBack = K + 2_300_000; // elapsed would be 1_800_000, behind the goal at 2_400_000
  const r = logPeriod(m, 'fulltime', jumpedBack, 'ft');
  assert.ok(r.ok);
  assert.equal(period(r.match), 'finished');
  assert.equal(clockMs(r.match, jumpedBack), 2_400_000);
});

test('a goal tapped before a backwards clock jump is still logged', () => {
  const goal = { t: 900_000, side: 'them' as const, scorerId: null, assistId: null, ownGoal: false };
  const r = logGoal(base, goal, K + 600_000, 'g');
  assert.ok(r.ok);
});
