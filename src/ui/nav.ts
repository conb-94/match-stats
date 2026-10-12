import type { Id } from '../domain/types.ts';

export type Screen =
  | { name: 'settings' } | { name: 'pick' } | { name: 'season' } | { name: 'live' } | { name: 'sub' }
  | { name: 'goal'; t: number } | { name: 'log'; matchId: Id } | { name: 'fulltime'; matchId: Id };

export interface Nav { go(screen: Screen): void }
