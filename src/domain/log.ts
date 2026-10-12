import { clockMs, elapsedMs, firstHalfMs, lastLoggedT, period, whistle } from './clock.ts';
import { replayOrder } from './derive.ts';
import type { GoalEvent, Id, Match, MatchEvent, Side, SubEvent } from './types.ts';

export type LogError =
  | 'off_not_on_pitch' | 'on_not_on_bench' | 'scorer_not_on_pitch' | 'assist_not_on_pitch'
  | 'assist_is_scorer' | 'time_out_of_range' | 'duplicate' | 'wrong_period'
  | 'nothing_to_undo' | 'not_deletable' | 'not_found';
export type LogResult = { ok: true; match: Match } | { ok: false; error: LogError };
export interface GoalInput { t: number; side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean }
export type EventPatch = Partial<{ t: number; at: number; offId: Id; onId: Id; side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean }>;

const fail = (error: LogError): LogResult => ({ ok: false, error });

/** Replays the log and returns the first problem found, or null when every entry makes sense. */
export function validateLog(match: Match, now: number): LogError | null {
  const at = (type: 'kickoff' | 'halftime' | 'secondhalf' | 'fulltime') => whistle(match, type)?.at;
  const order = [at('kickoff'), at('halftime'), at('secondhalf'), at('fulltime')].filter((x): x is number => x !== undefined);
  for (let i = 1; i < order.length; i++) if (order[i] < order[i - 1]) return 'time_out_of_range';

  const onPitch = new Set(match.starters);
  const bench = new Set(match.bench);
  const seenGoals = new Set<string>();
  const finished = period(match) === 'finished';
  const end = finished ? elapsedMs(match, now) : Infinity;

  for (const e of replayOrder(match)) {
    if (e.t < 0 || e.t > end) return 'time_out_of_range';
    if (e.type === 'sub') {
      if (!onPitch.has(e.offId)) return 'off_not_on_pitch';
      if (!bench.has(e.onId)) return 'on_not_on_bench';
      onPitch.delete(e.offId); bench.delete(e.onId);
      onPitch.add(e.onId); bench.add(e.offId);
      continue;
    }
    if (e.side === 'us' && !e.ownGoal) {
      if (!e.scorerId || !onPitch.has(e.scorerId)) return 'scorer_not_on_pitch';
      if (e.assistId !== null) {
        if (e.assistId === e.scorerId) return 'assist_is_scorer';
        if (!onPitch.has(e.assistId)) return 'assist_not_on_pitch';
      }
    }
    const key = `${e.t}|${e.side}|${e.scorerId ?? ''}`;
    if (seenGoals.has(key)) return 'duplicate';
    seenGoals.add(key);
  }
  return null;
}

function accept(candidate: Match, now: number): LogResult {
  const error = validateLog(candidate, now);
  return error ? fail(error) : { ok: true, match: candidate };
}

const append = (match: Match, event: MatchEvent): Match => ({ ...match, events: [...match.events, event] });

export function logSub(match: Match, offId: Id, onId: Id, now: number, id: Id): LogResult {
  if (period(match) === 'finished') return fail('wrong_period');
  const sub: SubEvent = { id, type: 'sub', t: clockMs(match, now), offId, onId };
  return accept(append(match, sub), now);
}

export function logGoal(match: Match, goal: GoalInput, now: number, id: Id): LogResult {
  if (period(match) === 'finished') return fail('wrong_period');
  // The time comes from the app's own clock at the Goal tap; the phone's clock may have moved since.
  if (goal.t < 0) return fail('time_out_of_range');
  const event: GoalEvent = { id, type: 'goal', ...goal };
  return accept(append(match, event), now);
}

const allowedFrom = { halftime: 'first', secondhalf: 'halftime', fulltime: 'second' } as const;

export function logPeriod(match: Match, type: 'halftime' | 'secondhalf' | 'fulltime', now: number, id: Id): LogResult {
  if (period(match) !== allowedFrom[type]) return fail('wrong_period');
  // If the phone's clock has jumped backwards, stamp the whistle no earlier than the clock already shown.
  let earliest = -Infinity;
  if (type === 'halftime') earliest = whistle(match, 'kickoff')!.at + lastLoggedT(match);
  if (type === 'secondhalf') earliest = whistle(match, 'halftime')!.at;
  if (type === 'fulltime') earliest = whistle(match, 'secondhalf')!.at + Math.max(0, lastLoggedT(match) - (firstHalfMs(match) ?? 0));
  return accept(append(match, { id, type, at: Math.max(now, earliest) }), now);
}

export function undoLast(match: Match): LogResult {
  const last = match.events.at(-1);
  if (!last || last.type === 'kickoff') return fail('nothing_to_undo');
  return { ok: true, match: { ...match, events: match.events.slice(0, -1) } };
}

/** Moves every sub and goal whose time matches `pick` by `by` ms. */
function shiftEntries(events: MatchEvent[], pick: (t: number) => boolean, by: number): MatchEvent[] {
  return events.map((e) => ((e.type === 'sub' || e.type === 'goal') && pick(e.t) ? { ...e, t: e.t + by } : e));
}

/**
 * Corrects one entry. Subs and goals take new players or a new match time. Half time and full time take a
 * new match time (`t`); kick off and the start of the second half take a new wall-clock time (`at`).
 * Moving a whistle moves the entries after it, so they stay where they really happened.
 */
export function editEvent(match: Match, eventId: Id, patch: EventPatch, now: number): LogResult {
  const index = match.events.findIndex((e) => e.id === eventId);
  if (index < 0) return fail('not_found');
  const event = match.events[index];
  if (patch.t !== undefined && (patch.t < 0 || patch.t > clockMs(match, now))) return fail('time_out_of_range');
  const replace = (events: MatchEvent[], updated: MatchEvent) => events.map((e) => (e.id === eventId ? updated : e));

  if (event.type === 'goal') {
    const updated: GoalEvent = {
      ...event,
      t: patch.t ?? event.t,
      side: patch.side ?? event.side,
      scorerId: patch.scorerId !== undefined ? patch.scorerId : event.scorerId,
      assistId: patch.assistId !== undefined ? patch.assistId : event.assistId,
      ownGoal: patch.ownGoal ?? event.ownGoal,
    };
    return accept({ ...match, events: replace(match.events, updated) }, now);
  }
  if (event.type === 'sub') {
    const updated: SubEvent = { ...event, t: patch.t ?? event.t, offId: patch.offId ?? event.offId, onId: patch.onId ?? event.onId };
    return accept({ ...match, events: replace(match.events, updated) }, now);
  }

  const firstHalf = firstHalfMs(match);
  if (event.type === 'kickoff') {
    if (patch.at === undefined) return { ok: true, match };
    const by = patch.at - event.at;
    const events = shiftEntries(replace(match.events, { ...event, at: patch.at }), () => true, -by);
    return accept({ ...match, events }, now);
  }
  if (event.type === 'secondhalf') {
    if (patch.at === undefined || firstHalf === null) return { ok: true, match };
    const by = patch.at - event.at;
    const secondHalf = (t: number) => t > firstHalf;
    if (match.events.some((e) => (e.type === 'sub' || e.type === 'goal') && secondHalf(e.t) && e.t - by <= firstHalf)) return fail('time_out_of_range');
    const events = shiftEntries(replace(match.events, { ...event, at: patch.at }), secondHalf, -by);
    return accept({ ...match, events }, now);
  }
  if (event.type === 'halftime') {
    if (patch.t === undefined || firstHalf === null) return { ok: true, match };
    const newFirstHalf = patch.t;
    const by = newFirstHalf - firstHalf;
    if (by < 0 && match.events.some((e) => (e.type === 'sub' || e.type === 'goal') && e.t > newFirstHalf && e.t < firstHalf)) return fail('time_out_of_range');
    const kickoff = whistle(match, 'kickoff')!;
    const events = shiftEntries(replace(match.events, { ...event, at: kickoff.at + newFirstHalf }), (t) => t >= firstHalf, by);
    return accept({ ...match, events }, now);
  }
  // Full time: a new match time for the final whistle.
  if (patch.t === undefined) return { ok: true, match };
  const second = whistle(match, 'secondhalf');
  if (!second || patch.t < (firstHalf ?? 0)) return fail('time_out_of_range');
  return accept({ ...match, events: replace(match.events, { ...event, at: second.at + (patch.t - (firstHalf ?? 0)) }) }, now);
}

export function deleteEvent(match: Match, eventId: Id, now: number): LogResult {
  const event = match.events.find((e) => e.id === eventId);
  if (!event) return fail('not_found');
  if (event.type !== 'sub' && event.type !== 'goal') return fail('not_deletable');
  return accept({ ...match, events: match.events.filter((e) => e.id !== eventId) }, now);
}
