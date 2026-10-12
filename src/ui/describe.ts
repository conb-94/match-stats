import { elapsedMs, firstHalfMs } from '../domain/clock.ts';
import type { Id, Match, MatchEvent, Team } from '../domain/types.ts';
import { playerById } from '../state/selectors.ts';

/** "5 Alfie" for a player id, or "Unknown" if the player is gone. */
export function playerLabel(team: Team, id: Id | null): string {
  const p = id ? playerById(team, id) : undefined;
  return p ? `${p.number} ${p.name}` : 'Unknown';
}

/** The match-clock time an entry happened at. */
export function eventTime(match: Match, e: MatchEvent): number {
  switch (e.type) {
    case 'kickoff': return 0;
    case 'halftime':
    case 'secondhalf': return firstHalfMs(match) ?? 0;
    case 'fulltime': return elapsedMs(match, e.at);
    default: return e.t;
  }
}

export function describeEvent(team: Team, match: Match, e: MatchEvent): { title: string; desc: string } {
  switch (e.type) {
    case 'kickoff': return { title: 'Kick off', desc: `${match.starters.length} starters, ${match.bench.length} on the bench` };
    case 'halftime': return { title: 'Half time', desc: '' };
    case 'secondhalf': return { title: '2nd half', desc: '' };
    case 'fulltime': return { title: 'Full time', desc: '' };
    case 'sub': return { title: 'Sub', desc: `${playerLabel(team, e.offId)} off, ${playerLabel(team, e.onId)} on` };
    case 'goal':
      if (e.side === 'them') return { title: 'Goal', desc: 'Opposition goal' };
      if (e.ownGoal) return { title: 'Goal', desc: 'Own goal' };
      return { title: 'Goal', desc: e.assistId ? `${playerLabel(team, e.scorerId)}, assist ${playerLabel(team, e.assistId)}` : playerLabel(team, e.scorerId) };
  }
}

/** Whole minutes for "10'" style labels. */
export const minuteOf = (ms: number): number => Math.floor(ms / 60_000);
