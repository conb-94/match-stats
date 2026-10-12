export type Id = string;
export type Format = 3 | 5 | 7 | 9 | 11;
export const FORMATS: Format[] = [3, 5, 7, 9, 11];
export type Side = 'us' | 'them';

export interface Player { id: Id; number: number; name: string; removed: boolean }

/**
 * `at` is wall-clock epoch ms (period whistles). `t` is match-clock ms:
 * play time since kick off with the half-time break removed.
 */
export type PeriodEvent = { id: Id; type: 'kickoff' | 'halftime' | 'secondhalf' | 'fulltime'; at: number };
export type SubEvent = { id: Id; type: 'sub'; t: number; offId: Id; onId: Id };
export type GoalEvent = { id: Id; type: 'goal'; t: number; side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean };
export type MatchEvent = PeriodEvent | SubEvent | GoalEvent;

/** `events` is kept in the order things were logged; `events[0]` is always the kickoff. */
export interface Match { id: Id; opposition: string; format: Format; starters: Id[]; bench: Id[]; events: MatchEvent[] }
export interface Season { id: Id; startedAt: number; closedAt: number | null; matches: Match[] }
/** The last season in `seasons` is the current one. */
export interface Team { id: Id; name: string; format: Format; players: Player[]; seasons: Season[] }
export interface AppState { version: 1; teams: Team[]; activeTeamId: Id | null }

export type Period = 'first' | 'halftime' | 'second' | 'finished';
export interface DerivedMatch {
  period: Period;
  clockMs: number;
  score: { us: number; them: number };
  onPitch: Id[];
  bench: Id[];
  playedMs: Record<Id, number>;
  goals: Record<Id, number>;
  assists: Record<Id, number>;
}

/** Omit that distributes over a union. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
