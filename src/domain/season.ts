import { period } from './clock.ts';
import { deriveMatch } from './derive.ts';
import type { Id, Season, Team } from './types.ts';

export interface SeasonRow { playerId: Id; matches: number; totalMs: number; avgMs: number; goals: number; assists: number }

/**
 * Per-player totals over the season's finished matches, lowest average first.
 * The average counts only the matches a player was at; players with no matches come last.
 */
export function seasonTotals(team: Team, season: Season): SeasonRow[] {
  const rows = new Map<Id, SeasonRow>();
  const row = (playerId: Id) => {
    let r = rows.get(playerId);
    if (!r) rows.set(playerId, (r = { playerId, matches: 0, totalMs: 0, avgMs: 0, goals: 0, assists: 0 }));
    return r;
  };
  for (const p of team.players) if (!p.removed) row(p.id);

  for (const match of season.matches) {
    if (period(match) !== 'finished') continue;
    const d = deriveMatch(match, 0);
    for (const id of [...match.starters, ...match.bench]) {
      const r = row(id);
      r.matches += 1;
      r.totalMs += d.playedMs[id] ?? 0;
      r.goals += d.goals[id] ?? 0;
      r.assists += d.assists[id] ?? 0;
    }
  }

  const numberOf = (id: Id) => team.players.find((p) => p.id === id)?.number ?? Number.MAX_SAFE_INTEGER;
  return [...rows.values()]
    .map((r) => ({ ...r, avgMs: r.matches ? r.totalMs / r.matches : 0 }))
    .sort((x, y) => {
      if ((x.matches === 0) !== (y.matches === 0)) return x.matches === 0 ? 1 : -1;
      return x.avgMs - y.avgMs || numberOf(x.playerId) - numberOf(y.playerId);
    });
}
