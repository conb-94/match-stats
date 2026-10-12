import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, parseBackup } from './backup.ts';
import { finishedState, liveState } from './fixtures.ts';

test('a backup restores to the same state', () => {
  const s = liveState();
  const { filename, text } = exportBackup(s, Date.UTC(2026, 9, 10, 23, 30));
  assert.equal(filename, 'match-stats-backup-2026-10-10.json');
  assert.deepEqual(parseBackup(text), { ok: true, state: s });
  assert.deepEqual(parseBackup(exportBackup(finishedState(), 0).text), { ok: true, state: finishedState() });
});

test('files that are not a backup are refused', () => {
  const texts = [
    '', 'not json', '{}', 'null', '[]',
    '{"app":"other","version":1,"state":{"teams":[]}}',
    '{"app":"match-stats","version":2,"state":{"teams":[]}}',
    '{"app":"match-stats","version":1,"state":{"teams":"x"}}',
    '{"app":"match-stats","version":1,"state":{"teams":[{"players":[],"seasons":[{"matches":[{"starters":[],"bench":[],"events":[]}]}]}]}}',
    '{"app":"match-stats","version":1,"state":{"teams":[{"players":{},"seasons":[]}]}}',
  ];
  for (const text of texts) assert.deepEqual(parseBackup(text), { ok: false }, text);
});

test('damaged backups that are still valid JSON are refused', () => {
  const wrap = (state: unknown) => JSON.stringify({ app: 'match-stats', version: 1, exportedAt: 0, state });
  const good = liveState();
  const team = good.teams[0];
  const match = team.seasons[0].matches[0];
  const bad: unknown[] = [
    { teams: [{ players: [], seasons: [] }] },
    { ...good, activeTeamId: 'missing' },
    { ...good, version: 2 },
    { ...good, teams: [{ ...team, seasons: [] }] },
    { ...good, teams: [{ ...team, format: 6 }] },
    { ...good, teams: [{ ...team, players: [{ id: 'p1', number: 'one', name: 'P1', removed: false }] }] },
    { ...good, teams: [{ ...team, seasons: [{ ...team.seasons[0], matches: [{ ...match, events: [{ id: 'x', type: 'sub', t: 1, offId: 'p1', onId: 'p4' }] }] }] }] },
    { ...good, teams: [{ ...team, seasons: [{ ...team.seasons[0], matches: [{ ...match, events: [...match.events, { id: 'x', type: 'sub', t: 1, offId: 'p4', onId: 'p5' }] }] }] }] },
    { ...good, teams: [{ ...team, seasons: [{ ...team.seasons[0], matches: [{ ...match, events: [...match.events, { id: 'x', type: 'banana' }] }] }] }] },
  ];
  for (const state of bad) assert.deepEqual(parseBackup(wrap(state)), { ok: false }, JSON.stringify(state).slice(0, 120));
  assert.deepEqual(parseBackup(wrap({ version: 1, teams: [], activeTeamId: null })), { ok: true, state: { version: 1, teams: [], activeTeamId: null } });
});
