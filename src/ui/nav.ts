import type { Id } from '../domain/types.ts';

/** A team being picked but not yet kicked off: who's playing, and how each squad player is set. */
export interface Draft { opposition: string; status: Record<Id, 'bench' | 'start' | 'out'> }

export type Screen =
  | { name: 'settings' } | { name: 'pick'; draft?: Draft } | { name: 'kickoff'; draft: Draft } | { name: 'season' } | { name: 'live' } | { name: 'sub' }
  | { name: 'goal'; t: number } | { name: 'log'; matchId: Id } | { name: 'fulltime'; matchId: Id };

export interface Nav { go(screen: Screen): void }
