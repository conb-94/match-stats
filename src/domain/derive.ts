import { clockMs, period } from './clock.ts';
import type { DerivedMatch, GoalEvent, Id, Match, SubEvent } from './types.ts';

/** Subs and goals in replay order: by match time, ties in logged order. */
export function replayOrder(match: Match): (SubEvent | GoalEvent)[] {
  return match.events
    .filter((e): e is SubEvent | GoalEvent => e.type === 'sub' || e.type === 'goal')
    .map((e, i) => ({ e, i }))
    .sort((x, y) => x.e.t - y.e.t || x.i - y.i)
    .map(({ e }) => e);
}

/** Who was on the pitch and on the bench just before match time `t`, optionally ignoring one event. */
export function lineupAt(match: Match, t: number, excludeEventId?: Id): { onPitch: Id[]; bench: Id[] } {
  const onPitch = [...match.starters];
  const bench = [...match.bench];
  for (const e of replayOrder(match)) {
    if (e.t >= t) break;
    if (e.type !== 'sub' || e.id === excludeEventId) continue;
    swap(onPitch, bench, e);
  }
  return { onPitch, bench };
}

function swap(onPitch: Id[], bench: Id[], sub: SubEvent): void {
  const i = onPitch.indexOf(sub.offId);
  const j = bench.indexOf(sub.onId);
  if (i >= 0) onPitch[i] = sub.onId;
  if (j >= 0) bench.splice(j, 1);
  bench.push(sub.offId);
}

export function deriveMatch(match: Match, now: number): DerivedMatch {
  const clock = clockMs(match, now);
  const lineup = [...match.starters, ...match.bench];
  const onPitch = [...match.starters];
  const bench = [...match.bench];
  const playedMs: Record<Id, number> = Object.fromEntries(lineup.map((id) => [id, 0]));
  const wentOn: Record<Id, number> = Object.fromEntries(match.starters.map((id) => [id, 0]));
  const goals: Record<Id, number> = {};
  const assists: Record<Id, number> = {};
  const score = { us: 0, them: 0 };

  for (const e of replayOrder(match)) {
    if (e.type === 'sub') {
      playedMs[e.offId] = (playedMs[e.offId] ?? 0) + (e.t - (wentOn[e.offId] ?? e.t));
      delete wentOn[e.offId];
      wentOn[e.onId] = e.t;
      swap(onPitch, bench, e);
    } else {
      score[e.side] += 1;
      if (e.side === 'us' && !e.ownGoal && e.scorerId) goals[e.scorerId] = (goals[e.scorerId] ?? 0) + 1;
      if (e.side === 'us' && !e.ownGoal && e.assistId) assists[e.assistId] = (assists[e.assistId] ?? 0) + 1;
    }
  }
  for (const id of onPitch) playedMs[id] = (playedMs[id] ?? 0) + (clock - (wentOn[id] ?? clock));

  const order = (id: Id) => lineup.indexOf(id);
  bench.sort((x, y) => playedMs[x] - playedMs[y] || order(x) - order(y));

  return { period: period(match), clockMs: clock, score, onPitch, bench, playedMs, goals, assists };
}
