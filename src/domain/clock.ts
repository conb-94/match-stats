import type { Match, Period, PeriodEvent } from './types.ts';

/** Formats a duration as mm:ss. Minutes are not capped at 59; negative values show as 00:00. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function whistle(match: Match, type: PeriodEvent['type']): PeriodEvent | undefined {
  return match.events.find((e): e is PeriodEvent => e.type === type);
}

export function period(match: Match): Period {
  if (whistle(match, 'fulltime')) return 'finished';
  if (whistle(match, 'secondhalf')) return 'second';
  if (whistle(match, 'halftime')) return 'halftime';
  return 'first';
}

/** Length of the first half once half time has been blown, else null. */
export function firstHalfMs(match: Match): number | null {
  const kickoff = whistle(match, 'kickoff');
  const half = whistle(match, 'halftime');
  if (!kickoff || !half) return null;
  return Math.max(0, half.at - kickoff.at);
}

/** Play time worked out from the whistles and `now` only, never below 0. */
export function elapsedMs(match: Match, now: number): number {
  const kickoff = whistle(match, 'kickoff');
  if (!kickoff) return 0;
  const half = whistle(match, 'halftime');
  if (!half) return Math.max(0, now - kickoff.at);
  const first = Math.max(0, half.at - kickoff.at);
  const second = whistle(match, 'secondhalf');
  if (!second) return first;
  const end = whistle(match, 'fulltime')?.at ?? now;
  return first + Math.max(0, end - second.at);
}

/** Largest match time of any sub or goal in the log (0 when there are none). */
export function lastLoggedT(match: Match): number {
  let max = 0;
  for (const e of match.events) if ((e.type === 'sub' || e.type === 'goal') && e.t > max) max = e.t;
  return max;
}

/** The match clock: elapsed play time, never behind the last logged sub or goal. */
export function clockMs(match: Match, now: number): number {
  return Math.max(elapsedMs(match, now), lastLoggedT(match));
}
