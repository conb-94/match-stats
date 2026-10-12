import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockMs, formatClock, period } from './clock.ts';
import { base, K, withEvents } from './fixtures.ts';

test('formatClock shows minutes and seconds', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(59_999), '00:59');
  assert.equal(formatClock(1_062_000), '17:42');
  assert.equal(formatClock(6_000_000), '100:00');
  assert.equal(formatClock(-5), '00:00');
});

test('clock runs from kick off', () => {
  assert.equal(period(base), 'first');
  assert.equal(clockMs(base, K + 600_000), 600_000);
});

test('half time freezes the clock and the second half carries on', () => {
  const m = withEvents(base, { type: 'halftime', at: K + 1_500_000 });
  assert.equal(period(m), 'halftime');
  assert.equal(clockMs(m, K + 1_800_000), 1_500_000);
  const m2 = withEvents(m, { type: 'secondhalf', at: K + 2_400_000 });
  assert.equal(clockMs(m2, K + 2_700_000), 1_800_000);
  const m3 = withEvents(m2, { type: 'fulltime', at: K + 3_900_000 });
  assert.equal(period(m3), 'finished');
  assert.equal(clockMs(m3, K + 99_000_000), 3_000_000);
});

test('clock never goes below zero or below the last logged event', () => {
  assert.equal(clockMs(base, K - 5_000), 0);
  const m = withEvents(base, { type: 'sub', t: 630_000, offId: 'c', onId: 'd' });
  assert.equal(clockMs(m, K + 100_000), 630_000);
});
