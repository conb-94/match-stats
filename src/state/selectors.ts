import { period } from '../domain/clock.ts';
import type { AppState, Id, Match, Player, Season, Team } from '../domain/types.ts';

export function activeTeam(state: AppState): Team | null {
  return state.teams.find((t) => t.id === state.activeTeamId) ?? null;
}

/** The last season is the current one. */
export function currentSeason(team: Team): Season {
  return team.seasons[team.seasons.length - 1];
}

export function liveMatch(team: Team): Match | null {
  return currentSeason(team).matches.find((m) => period(m) !== 'finished') ?? null;
}

export function findMatch(team: Team, matchId: Id): Match | null {
  for (const season of team.seasons) {
    const match = season.matches.find((m) => m.id === matchId);
    if (match) return match;
  }
  return null;
}

export function playerById(team: Team, id: Id): Player | undefined {
  return team.players.find((p) => p.id === id);
}

/** Squad players who have not been removed, in shirt-number order. */
export function squad(team: Team): Player[] {
  return team.players.filter((p) => !p.removed).sort((a, b) => a.number - b.number);
}
