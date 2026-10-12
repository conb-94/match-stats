import React from 'react';
import type { AppState } from '../domain/types.ts';
import { reduce, type Action, type ErrorCode } from './reducer.ts';

export interface Clock { now(): number }

export interface Store {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  dispatch(action: Action): ErrorCode | null;
  saveFailed(): boolean;
}

/**
 * Holds the app state. Every accepted action is saved before the next save starts,
 * so saves land in the order the actions were made.
 */
export function createStore(initial: AppState, save: (s: AppState) => Promise<void>, clock: Clock, newId: () => string): Store {
  let state = initial;
  let failed = false;
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveFailed: () => failed,
    dispatch(action) {
      const result = reduce(state, action, { now: clock.now(), newId });
      if (result.error) return result.error;
      state = result.state;
      const snapshot = state;
      queue = queue
        .then(() => save(snapshot))
        .then(() => {
          if (failed) { failed = false; notify(); }
        })
        .catch(() => {
          failed = true;
          notify();
        });
      notify();
      return null;
    },
  };
}

export const StoreContext = React.createContext<Store>(null as unknown as Store);
export const ClockContext = React.createContext<Clock>({ now: () => Date.now() });

export function useStore(): Store {
  return React.useContext(StoreContext);
}

export function useAppState(): AppState {
  const store = useStore();
  return React.useSyncExternalStore(store.subscribe, store.getState);
}

/** The clock's current time, re-read every 250 ms so running clocks tick on screen. */
export function useNow(): number {
  const clock = React.useContext(ClockContext);
  const [now, setNow] = React.useState(() => clock.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(clock.now()), 250);
    return () => clearInterval(id);
  }, [clock]);
  return now;
}
