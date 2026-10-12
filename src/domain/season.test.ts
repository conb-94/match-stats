import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonTotals } from './season.ts';
import type { Match, Season, Team } from './types.ts';

const K = 1_000_000;
// A 3_000_000 ms match: two halves of 1_500_000.
const whistles = (id: string) => [
  { id: `${id}k`, type: 'kickoff' as const, at: K },
  { id: `${id}h`, type: 'halftime' as const, at: K + 1_500_000 },
  { id: `${id}s`, type: 'secondhalf' as const, at: K + 2_000_000 },
  { id: `${id}f`, type: 'fulltime' as const, at: K + 3_500_000 },
];

const m1: Match = { id: 'm1', opposition: '', format: 3, starters: ['a', 'b', 'c'], bench: [], events: whistles('1') };
const m2: Match = {
  id: 'm2', opposition: '', format: 3, starters: ['a', 'b', 'd'], bench: ['c'],
  events: [
    ...whistles('2'),
    { id: 's', type: 'sub', t: 1_200_000, offId: 'd', onId: 'c' },
    { id: 'g', type: 'goal', t: 2_000_000, side: 'us', scorerId: 'a', assistId: 'b', ownGoal: false },
  ],
};
const live: Match = { id: 'm3', opposition: '', format: 3, starters: ['a', 'b', 'e'], bench: [], events: [{ id: 'k3', type: 'kickoff', at: K }] };

const team: Team = {
  id: 't', name: 'T', format: 3,
  players: [
    { id: 'a', number: 1, name: 'A', removed: false },
    { id: 'b', number: 2, name: 'B', removed: false },
    { id: 'c', number: 3, name: 'C', removed: false },
    { id: 'd', number: 4, name: 'D', removed: false },
    { id: 'e', number: 5, name: 'E', removed: false },
    { id: 'x', number: 9, name: 'X', removed: true },
  ],
  seasons: [],
};
const season: Season = { id: 's1', startedAt: 0, closedAt: null, matches: [m1, m2, live] };

test('season totals average over the matches each player was at', () => {
  const rows = seasonTotals(team, season);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.playerId), ['d', 'c', 'a', 'b']);
  assert.deepEqual(rows[0], { playerId: 'd', matches: 1, totalMs: 1_200_000, avgMs: 1_200_000, goals: 0, assists: 0 });
  assert.deepEqual(rows[1], { playerId: 'c', matches: 2, totalMs: 4_800_000, avgMs: 2_400_000, goals: 0, assists: 0 });
  assert.deepEqual(rows[2], { playerId: 'a', matches: 2, totalMs: 6_000_000, avgMs: 3_000_000, goals: 1, assists: 0 });
  assert.equal(rows[3].assists, 1);
});

test('a player with no matches is last, the live match adds nothing, and removed players with no matches are left out', () => {
  const rows = seasonTotals(team, season);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[4], { playerId: 'e', matches: 0, totalMs: 0, avgMs: 0, goals: 0, assists: 0 });
});
