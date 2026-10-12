// Test fixtures for state, store and UI tests.
import type { AppState, Format, Match } from '../domain/types.ts';

export const KICK = 1_000_000;

/** One active team named T, format as given, players p1..pN numbered 1..N and named P1..PN. */
export function teamWithPlayers(format: Format, count: number): AppState {
  const players = Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, number: i + 1, name: `P${i + 1}`, removed: false }));
  return {
    version: 1,
    activeTeamId: 't1',
    teams: [{ id: 't1', name: 'T', format, players, seasons: [{ id: 's1', startedAt: 0, closedAt: null, matches: [] }] }],
  };
}

function withMatch(state: AppState, match: Match): AppState {
  const team = state.teams[0];
  const season = team.seasons[0];
  return { ...state, teams: [{ ...team, seasons: [{ ...season, matches: [...season.matches, match] }] }] };
}

/** teamWithPlayers(3, 5) with live match m1 v Rovers: starters p1 p2 p3, bench p4, kicked off at KICK. */
export function liveState(): AppState {
  return withMatch(teamWithPlayers(3, 5), {
    id: 'm1', opposition: 'Rovers', format: 3, starters: ['p1', 'p2', 'p3'], bench: ['p4'],
    events: [{ id: 'k1', type: 'kickoff', at: KICK }],
  });
}

/**
 * liveState() played to a finished 3_000_000 ms match: halves of 1_500_000, p3 off for p4 at
 * t = 1_200_000, one goal by p1 assisted by p2 at t = 600_000.
 */
export function finishedState(): AppState {
  return withMatch(teamWithPlayers(3, 5), {
    id: 'm1', opposition: 'Rovers', format: 3, starters: ['p1', 'p2', 'p3'], bench: ['p4'],
    events: [
      { id: 'k1', type: 'kickoff', at: KICK },
      { id: 'g1', type: 'goal', t: 600_000, side: 'us', scorerId: 'p1', assistId: 'p2', ownGoal: false },
      { id: 's1', type: 'sub', t: 1_200_000, offId: 'p3', onId: 'p4' },
      { id: 'h1', type: 'halftime', at: KICK + 1_500_000 },
      { id: 'sh1', type: 'secondhalf', at: KICK + 2_000_000 },
      { id: 'f1', type: 'fulltime', at: KICK + 3_500_000 },
    ],
  });
}
