import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce, type Action, type ReduceResult } from './reducer.ts';
import { activeTeam, currentSeason, findMatch, liveMatch } from './selectors.ts';
import { liveState, teamWithPlayers } from './fixtures.ts';
import type { AppState } from '../domain/types.ts';

function run(state: AppState, ...actions: Action[]): ReduceResult {
  let result: ReduceResult = { state, error: null };
  let now = 2_000_000;
  let n = 0;
  for (const action of actions) {
    now += 1000;
    result = reduce(result.state, action, { now, newId: () => `id${++n}` });
  }
  return result;
}

test('creating a team selects it and opens a season', () => {
  const { state } = run(initialState(), { type: 'team/create', name: ' Under 10s ', format: 7 });
  const team = activeTeam(state)!;
  assert.equal(team.name, 'Under 10s');
  assert.equal(team.format, 7);
  assert.equal(team.seasons.length, 1);
});

test('a second team can be created and selected', () => {
  const two = run(teamWithPlayers(3, 5), { type: 'team/create', name: 'Under 8s', format: 5 }).state;
  assert.equal(activeTeam(two)!.name, 'Under 8s');
  assert.equal(activeTeam(run(two, { type: 'team/select', teamId: 't1' }).state)!.name, 'T');
});

test('bad player input is refused and nothing changes', () => {
  const s = run(initialState(), { type: 'team/create', name: 'T', format: 3 }, { type: 'player/add', number: 5, name: 'Alfie' }).state;
  const cases: [Action, string][] = [
    [{ type: 'player/add', number: 6, name: '   ' }, 'name_required'],
    [{ type: 'player/add', number: 6, name: 'A name far too long to fit' }, 'name_required'],
    [{ type: 'player/add', number: 5, name: 'Leo' }, 'number_taken'],
    [{ type: 'player/add', number: 0, name: 'Leo' }, 'number_invalid'],
    [{ type: 'player/add', number: 2.5, name: 'Leo' }, 'number_invalid'],
    [{ type: 'player/add', number: 100, name: 'Leo' }, 'number_invalid'],
    [{ type: 'team/rename', name: '' }, 'name_required'],
  ];
  for (const [action, error] of cases) {
    const r = run(s, action);
    assert.equal(r.error, error, JSON.stringify(action));
    assert.equal(r.state, s);
  }
});

test('players can be edited, keeping their own number', () => {
  const s = teamWithPlayers(3, 5);
  const r = run(s, { type: 'player/edit', playerId: 'p1', number: 1, name: 'Sam' });
  assert.equal(r.error, null);
  assert.equal(activeTeam(r.state)!.players[0].name, 'Sam');
  assert.equal(run(s, { type: 'player/edit', playerId: 'p1', number: 2, name: 'Sam' }).error, 'number_taken');
});

test('a match cannot start short or over', () => {
  const s = teamWithPlayers(3, 5);
  assert.equal(run(s, { type: 'match/start', opposition: '', starters: ['p1', 'p2'], bench: [] }).error, 'wrong_starter_count');
  assert.equal(run(s, { type: 'match/start', opposition: '', starters: ['p1', 'p2', 'p3', 'p4'], bench: [] }).error, 'wrong_starter_count');
  const live = run(s, { type: 'match/start', opposition: ' Rovers ', starters: ['p1', 'p2', 'p3'], bench: ['p4'] }).state;
  const m = liveMatch(activeTeam(live)!)!;
  assert.equal(m.opposition, 'Rovers');
  assert.equal(m.format, 3);
  assert.deepEqual({ ...m.events[0], id: '' }, { id: '', type: 'kickoff', at: 2_001_000 });
});

test('team and season changes are blocked during a live match', () => {
  const live = liveState();
  const blocked: Action[] = [
    { type: 'team/setFormat', format: 5 },
    { type: 'season/startNew' },
    { type: 'state/replace', state: initialState() },
    { type: 'team/select', teamId: 't1' },
    { type: 'team/create', name: 'Other', format: 5 },
    { type: 'match/start', opposition: '', starters: ['p1', 'p2', 'p5'], bench: [] },
  ];
  for (const action of blocked) assert.equal(run(live, action).error, 'match_in_progress', action.type);
  assert.equal(run(live, { type: 'player/remove', playerId: 'p1' }).error, 'player_in_live_match');
});

test('match actions need a live match', () => {
  const s = teamWithPlayers(3, 5);
  assert.equal(run(s, { type: 'match/undo' }).error, 'no_live_match');
  assert.equal(run(s, { type: 'match/sub', offId: 'p1', onId: 'p4' }).error, 'no_live_match');
  assert.equal(run(s, { type: 'match/period', period: 'halftime' }).error, 'no_live_match');
});

test('subs and goals are logged through the reducer and errors pass through', () => {
  const live = liveState();
  const r = run(live, { type: 'match/sub', offId: 'p3', onId: 'p4' });
  assert.equal(r.error, null);
  assert.deepEqual(liveMatch(activeTeam(r.state)!)!.events.at(-1), { id: 'id1', type: 'sub', t: 1_001_000, offId: 'p3', onId: 'p4' });
  assert.equal(run(live, { type: 'match/sub', offId: 'p4', onId: 'p5' }).error, 'off_not_on_pitch');
  const g = run(live, { type: 'match/goal', goal: { t: 500_000, side: 'us', scorerId: 'p1', assistId: null, ownGoal: false } });
  assert.equal(liveMatch(activeTeam(g.state)!)!.events.length, 2);
});

test('removing a player keeps their saved matches', () => {
  const s = run(liveState(), { type: 'match/period', period: 'halftime' }, { type: 'match/period', period: 'secondhalf' }, { type: 'match/period', period: 'fulltime' }).state;
  assert.equal(liveMatch(activeTeam(s)!), null);
  const after = run(s, { type: 'player/remove', playerId: 'p1' }, { type: 'player/remove', playerId: 'p5' }).state;
  const players = activeTeam(after)!.players;
  assert.equal(players.find((p) => p.id === 'p1')!.removed, true);
  assert.equal(players.find((p) => p.id === 'p5'), undefined);
  assert.equal(run(after, { type: 'player/add', number: 1, name: 'New' }).error, null);
});

test('undo with only a kick off discards the match', () => {
  assert.equal(liveMatch(activeTeam(run(liveState(), { type: 'match/undo' }).state)!), null);
});

test('saved matches can be corrected and discarded', () => {
  const s = run(liveState(), { type: 'match/sub', offId: 'p3', onId: 'p4' }, { type: 'match/period', period: 'halftime' },
    { type: 'match/period', period: 'secondhalf' }, { type: 'match/period', period: 'fulltime' }).state;
  const subId = findMatch(activeTeam(s)!, 'm1')!.events.find((e) => e.type === 'sub')!.id;
  const edited = run(s, { type: 'match/editEvent', matchId: 'm1', eventId: subId, patch: { t: 500 } });
  assert.equal(edited.error, null);
  const deleted = run(s, { type: 'match/deleteEvent', matchId: 'm1', eventId: subId });
  assert.equal(findMatch(activeTeam(deleted.state)!, 'm1')!.events.some((e) => e.type === 'sub'), false);
  assert.equal(findMatch(activeTeam(run(s, { type: 'match/discard', matchId: 'm1' }).state)!, 'm1'), null);
});

test('starting a new season closes the current one', () => {
  const r = run(teamWithPlayers(3, 5), { type: 'season/startNew' });
  const team = activeTeam(r.state)!;
  assert.equal(team.seasons.length, 2);
  assert.equal(team.seasons[0].closedAt, 2_001_000);
  assert.equal(currentSeason(team).closedAt, null);
});

test('a mistaken full time can be reopened while it is the latest match', () => {
  const ended = run(liveState(), { type: 'match/period', period: 'halftime' }, { type: 'match/period', period: 'secondhalf' }, { type: 'match/period', period: 'fulltime' }).state;
  const r = run(ended, { type: 'match/reopen', matchId: 'm1' });
  assert.equal(r.error, null);
  assert.equal(liveMatch(activeTeam(r.state)!)!.id, 'm1');
  assert.equal(run(liveState(), { type: 'match/reopen', matchId: 'm1' }).error, 'match_in_progress');
  assert.equal(run(ended, { type: 'match/reopen', matchId: 'nope' }).error, 'not_found');
});
