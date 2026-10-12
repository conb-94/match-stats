// Test fixtures shared by the domain tests.
import type { DistributiveOmit, Match, MatchEvent } from './types.ts';

export const K = 1_000_000;

export const base: Match = {
  id: 'm',
  opposition: '',
  format: 3,
  starters: ['a', 'b', 'c'],
  bench: ['d', 'e'],
  events: [{ id: 'k', type: 'kickoff', at: K }],
};

export type EventInput = DistributiveOmit<MatchEvent, 'id'> & { id?: string };

let counter = 0;

/** Appends events to a match, generating ids where none are given. */
export function withEvents(match: Match, ...partials: EventInput[]): Match {
  const added = partials.map((p) => ({ ...p, id: p.id ?? `e${++counter}` }) as MatchEvent);
  return { ...match, events: [...match.events, ...added] };
}
