# Match Stats Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the installable, offline Match Stats web app (stage 1 of the spec: the testing version handed out by link) covering all eight screens.

**Architecture:** A pure TypeScript domain core holds every rule: a match is a log of events, and the clock, score, play time and season totals are always derived from that log plus the current time. A reducer applies actions to one `AppState` object, which is saved whole to IndexedDB after every action. React screens only read derived values and dispatch actions.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, `idb-keyval`, `fake-indexeddb` (tests), `vite-plugin-pwa`, `@vite-pwa/assets-generator`, `@fontsource/barlow`, `@fontsource/barlow-condensed`, Playwright (one end-to-end file), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-10-match-stats-design.md`

**Out of this plan:** the Android and iPhone store builds (spec stages 2 and 3). Each gets its own plan once this version has been used at real matches.

## Global Constraints

- Formats are exactly 3, 5, 7, 9 or 11 a side. The number on the pitch always equals the format.
- Totally offline: no server calls, no accounts, no analytics. All data stays on the phone.
- A match is two halves. The match clock counts up until the coach taps. The app holds no match length.
- Clocks are never stored as running counters. Time is always worked out from saved timestamps and `Date.now()`.
- Every action is saved before the next one can happen. Reloading the page returns to the same match in the same state.
- The players picked before kick off are fixed: nobody is added after kick off, and a player only comes off when a replacement goes on.
- Must work from the home screen on both Android Chrome and iPhone Safari.
- Touch targets are at least 44 px. Text contrast is at least 4.5:1.
- Colours: ground `#F4F5F2`, ink `#14181A`, green `#0B6B3A`, grey text `#5A6165`, line `#DDE1DC`, bench line `#C3C9C3`, panel `#E4E8E2`, delete red `#A4281B`. Fonts: Barlow (text), Barlow Condensed (clocks and numbers), bundled with the app, never loaded from the network.
- Button labels used by tests are fixed: `Start match`, `Half time`, `Start 2nd half`, `Full time`, `Sub`, `Goal`, `Undo`, `Confirm sub`, `Confirm goal`, `Cancel`, `Your team`, `Opposition`, `Own goal`, `No assist`, `Add player`, `New team`, `Change players`, `Change time`, `Delete`, `Back up`, `Restore`, `Start new season`.
- Node 22. Use the versions `npm create vite@latest` installs. Add no dependency that is not in the Tech Stack line.
- All times in code are milliseconds. `at` means wall-clock epoch ms. `t` means match-clock ms (play time since kick off, with the half-time break removed).

## Review Focus

1. The coach forgets to tap Full time and reopens the app hours later. They expect to end the match and then correct the full-time whistle to the real time. Pinned in Task 3 (`editEvent` on `fulltime`).
2. The phone's clock jumps backwards mid-match (time zone or manual change). No clock may go negative or run backwards past the last logged event. Pinned in Task 2 (`clockMs` clamp).
3. A double tap on Confirm goal. Only one goal is logged. Pinned in Task 3 (`duplicate`).
4. Settings input that breaks the squad: a blank name, a shirt number already in use, a number outside 1 to 99. Each is refused with a message and nothing is saved. Pinned in Task 5.
5. Restore is given a file that is not a Match Stats backup, or is damaged. It is refused and the existing data is untouched. Pinned in Task 6.

## File Structure

```
src/
  domain/types.ts       all shared types
  domain/clock.ts       formatClock, period, clockMs
  domain/derive.ts      deriveMatch: score, who is on, play time, goals, assists
  domain/log.ts         logging, undo, edit, delete, validateLog
  domain/season.ts      seasonTotals
  state/reducer.ts      Action, reduce, initialState
  state/selectors.ts    activeTeam, currentSeason, liveMatch, findMatch
  state/storage.ts      loadState, saveState (IndexedDB)
  state/backup.ts       exportBackup, parseBackup
  state/store.ts        createStore, StoreContext, ClockContext, hooks
  ui/App.tsx            screen switching and bottom tabs
  ui/theme.css          tokens and shared classes
  ui/messages.ts        errorMessage(code)
  ui/testing.tsx        renderApp test helper
  ui/components/        PlayerCard.tsx, Header.tsx
  ui/screens/           Settings, PickTeam, Live, Sub, Goal, MatchLog, FullTime, Season (.tsx)
  main.tsx              loads state, mounts App
e2e/match.spec.ts       one end-to-end run
```

Each test file sits beside its source as `<name>.test.ts(x)`.

---

### Task 1: Project scaffold and `formatClock`

**Files:**
- Create: project root via `npm create vite@latest . -- --template react-ts`
- Create: `src/domain/clock.ts`, `src/domain/clock.test.ts`, `src/ui/theme.css`
- Modify: `vite.config.ts`, `package.json`, `index.html`

**Interfaces:**
- Produces: `formatClock(ms: number): string`; scripts `npm test` (Vitest, jsdom), `npm run build`, `npm run dev`.

- [ ] **Step 1: Scaffold.** Run `git init`, scaffold Vite React TS into the existing folder (keep `docs/`), install `vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb` as dev dependencies and `idb-keyval @fontsource/barlow @fontsource/barlow-condensed` as dependencies. Set `base: './'` and a Vitest block (`environment: 'jsdom'`, setup file importing `@testing-library/jest-dom/vitest` and `fake-indexeddb/auto`) in `vite.config.ts`. Set `"test": "vitest run"`.
- [ ] **Step 2: Write the failing test** in `src/domain/clock.test.ts`:

```ts
import { formatClock } from './clock';
test('formatClock shows minutes and seconds', () => {
  expect(formatClock(0)).toBe('00:00');
  expect(formatClock(59_999)).toBe('00:59');
  expect(formatClock(1_062_000)).toBe('17:42');
  expect(formatClock(6_000_000)).toBe('100:00');
  expect(formatClock(-5)).toBe('00:00');
});
```

- [ ] **Step 3: Run** `npm test`. Expected: FAIL, `formatClock` not found.
- [ ] **Step 4: Implement** `formatClock(ms: number): string` in `src/domain/clock.ts`. Seconds round down. Minutes are not capped at 59.
- [ ] **Step 5: Theme.** In `src/ui/theme.css` define the Global Constraints colours as CSS variables on `:root`, import both fonts (weights 400, 600, 700), set `body` background to the ground colour. In `index.html` set `<title>Match Stats</title>` and `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Delete the Vite demo content.
- [ ] **Step 6: Run** `npm test` and `npm run build`. Expected: both PASS.
- [ ] **Step 7: Commit** `chore: scaffold app and add formatClock` (include `docs/`).

### Task 2: Types, match clock and `deriveMatch`

**Files:**
- Create: `src/domain/types.ts`, `src/domain/derive.ts`, `src/domain/derive.test.ts`
- Modify: `src/domain/clock.ts`, `src/domain/clock.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, in `types.ts`:

```ts
export type Id = string;
export type Format = 3 | 5 | 7 | 9 | 11;
export const FORMATS: Format[] = [3, 5, 7, 9, 11];
export type Side = 'us' | 'them';
export interface Player { id: Id; number: number; name: string; removed: boolean }
export type MatchEvent =
  | { id: Id; type: 'kickoff' | 'halftime' | 'secondhalf' | 'fulltime'; at: number }
  | { id: Id; type: 'sub'; t: number; offId: Id; onId: Id }
  | { id: Id; type: 'goal'; t: number; side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean };
export interface Match { id: Id; opposition: string; format: Format; starters: Id[]; bench: Id[]; events: MatchEvent[] }
export interface Season { id: Id; startedAt: number; closedAt: number | null; matches: Match[] }
export interface Team { id: Id; name: string; format: Format; players: Player[]; seasons: Season[] }
export interface AppState { version: 1; teams: Team[]; activeTeamId: Id | null }
export type Period = 'first' | 'halftime' | 'second' | 'finished';
export interface DerivedMatch {
  period: Period; clockMs: number; score: { us: number; them: number };
  onPitch: Id[]; bench: Id[];
  playedMs: Record<Id, number>; goals: Record<Id, number>; assists: Record<Id, number>;
}
```

- Produces, in `clock.ts`: `period(match: Match): Period`, `elapsedMs(match: Match, now: number): number` (first half plus second half from the period events and `now` only, never below 0), `clockMs(match: Match, now: number): number` (the larger of `elapsedMs` and the largest `t` in the log).
- Produces, in `derive.ts`: `deriveMatch(match: Match, now: number): DerivedMatch` and `lineupAt(match: Match, t: number, excludeEventId?: Id): { onPitch: Id[]; bench: Id[] }` (who was where just before match time `t`, ignoring one event if asked).
- Rules the signatures do not show: `events` is kept in the order things were logged. `events[0]` is always the `kickoff`. The last season in `Team.seasons` is the current one. A match is finished when it has a `fulltime` event. Replay order for subs and goals is by `t`, ties in logged order. `bench` in `DerivedMatch` is sorted least `playedMs` first, ties in lineup order (`starters` then `bench`). `playedMs` has an entry for every player in the lineup. An own goal (`ownGoal: true`, `side: 'us'`) adds to `score.us` and to nobody's `goals`.

- [ ] **Step 1: Write the failing tests.** Use this fixture in both test files: `K = 1_000_000`; `base: Match` with `format: 3`, `starters: ['a','b','c']`, `bench: ['d','e']`, `events: [{ id: 'k', type: 'kickoff', at: K }]`.

```ts
// clock.test.ts
test('clock runs from kick off', () => {
  expect(period(base)).toBe('first');
  expect(clockMs(base, K + 600_000)).toBe(600_000);
});
test('half time freezes the clock and the second half carries on', () => {
  const m = withEvents(base, { type: 'halftime', at: K + 1_500_000 });
  expect(period(m)).toBe('halftime');
  expect(clockMs(m, K + 1_800_000)).toBe(1_500_000);
  const m2 = withEvents(m, { type: 'secondhalf', at: K + 2_400_000 });
  expect(clockMs(m2, K + 2_700_000)).toBe(1_800_000);
  const m3 = withEvents(m2, { type: 'fulltime', at: K + 3_900_000 });
  expect(period(m3)).toBe('finished');
  expect(clockMs(m3, K + 99_000_000)).toBe(3_000_000);
});
test('clock never goes below zero or below the last logged event', () => {
  expect(clockMs(base, K - 5_000)).toBe(0);
  const m = withEvents(base, { type: 'sub', t: 630_000, offId: 'c', onId: 'd' });
  expect(clockMs(m, K + 100_000)).toBe(630_000);
});
```

```ts
// derive.test.ts
test('a sub stops one clock and starts the other', () => {
  const m = withEvents(base, { type: 'sub', t: 630_000, offId: 'c', onId: 'd' });
  const d = deriveMatch(m, K + 1_062_000);
  expect(d.playedMs).toEqual({ a: 1_062_000, b: 1_062_000, c: 630_000, d: 432_000, e: 0 });
  expect(d.onPitch).toEqual(['a', 'b', 'd']);
  expect(d.bench).toEqual(['e', 'c']);
});
test('a player who goes back on carries on from their earlier total', () => {
  const m = withEvents(base,
    { type: 'sub', t: 600_000, offId: 'c', onId: 'd' },
    { type: 'sub', t: 900_000, offId: 'd', onId: 'c' });
  const d = deriveMatch(m, K + 1_200_000);
  expect(d.playedMs.c).toBe(900_000);
  expect(d.playedMs.d).toBe(300_000);
});
test('play time does not count the half-time break', () => {
  const m = withEvents(base, { type: 'halftime', at: K + 1_500_000 }, { type: 'secondhalf', at: K + 2_400_000 });
  expect(deriveMatch(m, K + 2_700_000).playedMs.a).toBe(1_800_000);
});
test('score, goals and assists', () => {
  const m = withEvents(base,
    { type: 'goal', t: 100_000, side: 'us', scorerId: 'a', assistId: 'b', ownGoal: false },
    { type: 'goal', t: 200_000, side: 'them', scorerId: null, assistId: null, ownGoal: false },
    { type: 'goal', t: 300_000, side: 'us', scorerId: null, assistId: null, ownGoal: true });
  const d = deriveMatch(m, K + 400_000);
  expect(d.score).toEqual({ us: 2, them: 1 });
  expect(d.goals).toEqual({ a: 1 });
  expect(d.assists).toEqual({ b: 1 });
});
test('lineupAt gives who was on the pitch at a match time', () => {
  const m = withEvents(base, { id: 's1', type: 'sub', t: 630_000, offId: 'c', onId: 'd' });
  expect(lineupAt(m, 600_000).onPitch).toEqual(['a', 'b', 'c']);
  expect(lineupAt(m, 700_000).onPitch).toEqual(['a', 'b', 'd']);
  expect(lineupAt(m, 700_000, 's1').onPitch).toEqual(['a', 'b', 'c']);
});
```

`withEvents(match, ...partials)` is a test helper that appends events with generated ids; put it in `src/domain/fixtures.ts` and export `K` and `base` from there too.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL, missing exports.
- [ ] **Step 3: Implement** `types.ts`, then `period`, `elapsedMs` and `clockMs` in `clock.ts`, then `lineupAt` and `deriveMatch` in `derive.ts`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: match clock and derived match state`.

### Task 3: Logging, undo and corrections

**Files:**
- Create: `src/domain/log.ts`, `src/domain/log.test.ts`

**Interfaces:**
- Consumes: `Match`, `MatchEvent`, `Id`, `Side` from Task 2; `clockMs`, `period`; `deriveMatch`; `base`, `K`, `withEvents`.
- Produces:

```ts
export type LogError =
  | 'off_not_on_pitch' | 'on_not_on_bench' | 'scorer_not_on_pitch' | 'assist_not_on_pitch'
  | 'assist_is_scorer' | 'time_out_of_range' | 'duplicate' | 'wrong_period'
  | 'nothing_to_undo' | 'not_deletable' | 'not_found';
export type LogResult = { ok: true; match: Match } | { ok: false; error: LogError };
export interface GoalInput { t: number; side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean }
export type EventPatch = Partial<{ t: number; offId: Id; onId: Id; side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean }>;
export function validateLog(match: Match, now: number): LogError | null;
export function logSub(match: Match, offId: Id, onId: Id, now: number, id: Id): LogResult;
export function logGoal(match: Match, goal: GoalInput, now: number, id: Id): LogResult;
export function logPeriod(match: Match, type: 'halftime' | 'secondhalf' | 'fulltime', now: number, id: Id): LogResult;
export function undoLast(match: Match): LogResult;
export function editEvent(match: Match, eventId: Id, patch: EventPatch, now: number): LogResult;
export function deleteEvent(match: Match, eventId: Id, now: number): LogResult;
```

- Rules: every function returns a new `Match` and never changes its input. `logSub` stamps `t = clockMs(match, now)`. Every change is accepted only if `validateLog` passes on the result; otherwise the error is returned. `validateLog` replays the log and checks each sub and each `us` goal against who is on the pitch at that `t`, that no `t` is below 0, that in a finished match no `t` is above `elapsedMs(match, now)` and the second half is not shorter than 0, and that no two goals share `t`, `side` and `scorerId`. `logGoal` and `editEvent` also return `time_out_of_range` when the `t` they are given is below 0 or above `clockMs` of the match as it was before the change. `logPeriod` allows `halftime` only in `first`, `secondhalf` only in `halftime`, `fulltime` only in `second`. `undoLast` removes the last event of any type except the `kickoff`. `deleteEvent` works on `sub` and `goal` only. `editEvent` with `t` on a `halftime` event sets `at = kickoff.at + t`; on a `fulltime` event it sets `at = secondhalf.at + (t - firstHalfMs)`; `kickoff` and `secondhalf` cannot be edited (`not_deletable`).

- [ ] **Step 1: Write the failing tests** in `log.test.ts`:

```ts
const now = K + 1_062_000;
test('logSub stamps the match time and swaps the players', () => {
  const r = logSub(base, 'c', 'd', now, 's1');
  expect(r.ok && r.match.events.at(-1)).toMatchObject({ type: 'sub', t: 1_062_000, offId: 'c', onId: 'd' });
});
test('logSub refuses players in the wrong place', () => {
  expect(logSub(base, 'd', 'e', now, 's1')).toEqual({ ok: false, error: 'off_not_on_pitch' });
  expect(logSub(base, 'a', 'b', now, 's1')).toEqual({ ok: false, error: 'on_not_on_bench' });
});
test('logGoal checks scorer, assist and double taps', () => {
  const g = { t: 500_000, side: 'us' as const, scorerId: 'a', assistId: 'b', ownGoal: false };
  expect(logGoal(base, { ...g, scorerId: 'd' }, now, 'g1')).toEqual({ ok: false, error: 'scorer_not_on_pitch' });
  expect(logGoal(base, { ...g, assistId: 'a' }, now, 'g1')).toEqual({ ok: false, error: 'assist_is_scorer' });
  const once = logGoal(base, g, now, 'g1');
  expect(once.ok && logGoal(once.match, g, now, 'g2')).toEqual({ ok: false, error: 'duplicate' });
});
test('periods must happen in order', () => {
  expect(logPeriod(base, 'fulltime', now, 'p')).toEqual({ ok: false, error: 'wrong_period' });
});
test('undo removes the last thing logged, including full time', () => {
  expect(undoLast(base)).toEqual({ ok: false, error: 'nothing_to_undo' });
  const done = withEvents(base, { type: 'halftime', at: K + 1 }, { type: 'secondhalf', at: K + 2 }, { type: 'fulltime', at: K + 3 });
  const r = undoLast(done);
  expect(r.ok && period(r.match)).toBe('second');
});
test('a correction that breaks a later entry is refused', () => {
  const m = withEvents(base,
    { id: 's1', type: 'sub', t: 600_000, offId: 'c', onId: 'd' },
    { id: 's2', type: 'sub', t: 900_000, offId: 'd', onId: 'c' });
  expect(deleteEvent(m, 's1', now)).toEqual({ ok: false, error: 'off_not_on_pitch' });
  expect(editEvent(m, 's2', { t: 500_000 }, now)).toEqual({ ok: false, error: 'off_not_on_pitch' });
});
test('changing a scorer moves the goal', () => {
  const m = withEvents(base, { id: 'g1', type: 'goal', t: 500_000, side: 'us', scorerId: 'a', assistId: null, ownGoal: false });
  const r = editEvent(m, 'g1', { scorerId: 'b' }, now);
  expect(r.ok && deriveMatch(r.match, now).goals).toEqual({ b: 1 });
});
test('a late full time can be corrected to the real time', () => {
  const m = withEvents(base,
    { type: 'halftime', at: K + 1_500_000 }, { type: 'secondhalf', at: K + 2_400_000 },
    { id: 'g1', type: 'goal', t: 2_000_000, side: 'them', scorerId: null, assistId: null, ownGoal: false },
    { id: 'ft', type: 'fulltime', at: K + 30_000_000 });
  const r = editEvent(m, 'ft', { t: 3_000_000 }, K + 31_000_000);
  expect(r.ok && clockMs(r.match, K + 31_000_000)).toBe(3_000_000);
  expect(editEvent(m, 'ft', { t: 1_900_000 }, K + 31_000_000)).toEqual({ ok: false, error: 'time_out_of_range' });
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL, missing exports.
- [ ] **Step 3: Implement** `log.ts`. Build `validateLog` first; every other function produces a candidate match and returns it only if `validateLog` passes.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: event logging, undo and corrections`.

### Task 4: Season totals

**Files:**
- Create: `src/domain/season.ts`, `src/domain/season.test.ts`

**Interfaces:**
- Consumes: `Team`, `Season`, `Id`; `deriveMatch`; `period`.
- Produces:

```ts
export interface SeasonRow { playerId: Id; matches: number; totalMs: number; avgMs: number; goals: number; assists: number }
export function seasonTotals(team: Team, season: Season): SeasonRow[];
```

- Rules: only finished matches count. A player attended a match if they are in its `starters` or `bench`. `avgMs = totalMs / matches` (0 when `matches` is 0). One row per player who is not removed, plus removed players who attended at least one match. Sorted by `avgMs` ascending; players with 0 matches come last; ties by shirt number.

- [ ] **Step 1: Write the failing test.** Build a team with players `a` (no. 1), `b` (no. 2), `c` (no. 3), `d` (no. 4) and a season with two finished 3-a-side matches of 3_000_000 ms each and one live match. Match 1: starters `a b c`, bench empty. Match 2: starters `a b d`, bench `c`, one sub at `t = 1_200_000` taking `d` off for `c`, and a goal by `a` assisted by `b`.

```ts
const rows = seasonTotals(team, season);
expect(rows.map(r => r.playerId)).toEqual(['d', 'c', 'a', 'b']);
expect(rows[0]).toMatchObject({ matches: 1, totalMs: 1_200_000, avgMs: 1_200_000 });
expect(rows[1]).toMatchObject({ matches: 2, totalMs: 4_800_000, avgMs: 2_400_000 });
expect(rows[2]).toMatchObject({ matches: 2, totalMs: 6_000_000, goals: 1, assists: 0 });
expect(rows[3]).toMatchObject({ assists: 1 });
```

Add a second test: a player with no matches is last, and the live match adds nothing.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `seasonTotals`. Derive each finished match with `deriveMatch(match, 0)`; a finished match's result does not depend on `now`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: season totals`.

### Task 5: App state reducer

**Files:**
- Create: `src/state/reducer.ts`, `src/state/reducer.test.ts`, `src/state/selectors.ts`

**Interfaces:**
- Consumes: Task 2 types; Task 3 functions and `LogError`, `GoalInput`, `EventPatch`.
- Produces, in `selectors.ts`: `activeTeam(state: AppState): Team | null`, `currentSeason(team: Team): Season`, `liveMatch(team: Team): Match | null`, `findMatch(team: Team, matchId: Id): Match | null`.
- Produces, in `reducer.ts`:

```ts
export type ErrorCode = LogError | 'name_required' | 'number_invalid' | 'number_taken'
  | 'wrong_starter_count' | 'match_in_progress' | 'player_in_live_match' | 'no_live_match';
export type Action =
  | { type: 'team/create'; name: string; format: Format }
  | { type: 'team/select'; teamId: Id }
  | { type: 'team/rename'; name: string }
  | { type: 'team/setFormat'; format: Format }
  | { type: 'player/add'; number: number; name: string }
  | { type: 'player/edit'; playerId: Id; number: number; name: string }
  | { type: 'player/remove'; playerId: Id }
  | { type: 'season/startNew' }
  | { type: 'match/start'; opposition: string; starters: Id[]; bench: Id[] }
  | { type: 'match/period'; period: 'halftime' | 'secondhalf' | 'fulltime' }
  | { type: 'match/sub'; offId: Id; onId: Id }
  | { type: 'match/goal'; goal: GoalInput }
  | { type: 'match/undo' }
  | { type: 'match/editEvent'; matchId: Id; eventId: Id; patch: EventPatch }
  | { type: 'match/deleteEvent'; matchId: Id; eventId: Id }
  | { type: 'match/discard'; matchId: Id }
  | { type: 'state/replace'; state: AppState };
export interface Ctx { now: number; newId: () => Id }
export type ReduceResult = { state: AppState; error: ErrorCode | null };
export function initialState(): AppState;
export function reduce(state: AppState, action: Action, ctx: Ctx): ReduceResult;
```

- Rules: on any error the returned `state` is the input object, unchanged. Every action except `team/create`, `team/select` and `state/replace` acts on the active team. `team/create` makes the team active and gives it one open season. Names are trimmed; a player name must be 1 to 20 characters and a team name 1 to 30, else `name_required`. A shirt number must be a whole number from 1 to 99, else `number_invalid`, and unique among the team's players that are not removed, else `number_taken`. `player/remove` deletes a player who is in no match, and sets `removed: true` on one who is; it returns `player_in_live_match` if they are in the live match. `match/start` copies the team's format into the match and needs `starters.length === team.format`, else `wrong_starter_count`. While the active team has a live match, `team/select`, `team/setFormat`, `season/startNew`, `match/start` and `state/replace` return `match_in_progress`. `match/period`, `match/sub`, `match/goal` and `match/undo` return `no_live_match` when there is none. `match/undo` on a match with only a kick off discards the match. `season/startNew` sets `closedAt` on the current season and adds a new one. `match/editEvent` and `match/deleteEvent` work on any match of the active team, in any season.

- [ ] **Step 1: Write the failing tests.** A helper `run(state, ...actions)` applies actions in turn with `now` starting at 2_000_000 and rising by 1000 per action and ids `id1`, `id2`, and returns the last `ReduceResult`. Fixtures in `src/state/fixtures.ts`: `KICK = 1_000_000`; `teamWithPlayers(format, count)` is a state with one active team named `T` whose players have ids `p1`, `p2`, numbers 1, 2 and names `P1`, `P2`; `liveState()` is `teamWithPlayers(3, 5)` plus a live match with id `m1`, opposition `Rovers`, starters `p1 p2 p3`, bench `p4`, kicked off at `KICK`.

```ts
test('creating a team selects it and opens a season', () => {
  const { state } = run(initialState(), { type: 'team/create', name: ' Under 10s ', format: 7 });
  expect(activeTeam(state)).toMatchObject({ name: 'Under 10s', format: 7 });
  expect(activeTeam(state)!.seasons).toHaveLength(1);
});
test('bad player input is refused and nothing changes', () => {
  const s = run(initialState(), { type: 'team/create', name: 'T', format: 3 }, { type: 'player/add', number: 5, name: 'Alfie' }).state;
  for (const [action, error] of [
    [{ type: 'player/add', number: 6, name: '   ' }, 'name_required'],
    [{ type: 'player/add', number: 5, name: 'Leo' }, 'number_taken'],
    [{ type: 'player/add', number: 0, name: 'Leo' }, 'number_invalid'],
    [{ type: 'player/add', number: 2.5, name: 'Leo' }, 'number_invalid'],
    [{ type: 'player/add', number: 100, name: 'Leo' }, 'number_invalid'],
  ] as const) {
    const r = run(s, action);
    expect(r.error).toBe(error);
    expect(r.state).toBe(s);
  }
});
test('a match cannot start short or over', () => {
  const s = teamWithPlayers(3, 5); // format 3, players p1..p5
  expect(run(s, { type: 'match/start', opposition: '', starters: ['p1', 'p2'], bench: [] }).error).toBe('wrong_starter_count');
  expect(run(s, { type: 'match/start', opposition: '', starters: ['p1', 'p2', 'p3', 'p4'], bench: [] }).error).toBe('wrong_starter_count');
  const live = run(s, { type: 'match/start', opposition: 'Rovers', starters: ['p1', 'p2', 'p3'], bench: ['p4'] }).state;
  expect(liveMatch(activeTeam(live)!)).toMatchObject({ opposition: 'Rovers', format: 3 });
});
test('team and season changes are blocked during a live match', () => {
  const live = liveState();
  for (const action of [{ type: 'team/setFormat', format: 5 }, { type: 'season/startNew' }, { type: 'state/replace', state: initialState() }] as const)
    expect(run(live, action).error).toBe('match_in_progress');
  expect(run(live, { type: 'player/remove', playerId: 'p1' }).error).toBe('player_in_live_match');
});
test('removing a player keeps their saved matches', () => {
  const s = run(liveState(), { type: 'match/period', period: 'halftime' }, { type: 'match/period', period: 'secondhalf' }, { type: 'match/period', period: 'fulltime' }).state;
  const after = run(s, { type: 'player/remove', playerId: 'p1' }, { type: 'player/remove', playerId: 'p5' }).state;
  const players = activeTeam(after)!.players;
  expect(players.find(p => p.id === 'p1')).toMatchObject({ removed: true });
  expect(players.find(p => p.id === 'p5')).toBeUndefined();
});
test('undo with only a kick off discards the match', () => {
  expect(liveMatch(activeTeam(run(liveState(), { type: 'match/undo' }).state)!)).toBeNull();
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `selectors.ts` then `reduce`. Match actions call the Task 3 functions and pass their `LogError` straight through.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: app state reducer`.

### Task 6: Saving, the store and backup

**Files:**
- Create: `src/state/storage.ts`, `src/state/backup.ts`, `src/state/store.ts`, and a `.test.ts` beside each
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `AppState`, `initialState`, `reduce`, `Action`, `ErrorCode`.
- Produces:

```ts
// storage.ts  (idb-keyval, key 'match-stats/state')
export function loadState(): Promise<AppState>;      // initialState() when nothing is saved
export function saveState(state: AppState): Promise<void>;
// backup.ts
export function exportBackup(state: AppState, now: number): { filename: string; text: string };
export function parseBackup(text: string): { ok: true; state: AppState } | { ok: false };
// store.ts
export interface Clock { now(): number }
export interface Store {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  dispatch(action: Action): ErrorCode | null;
  saveFailed(): boolean;
}
export function createStore(initial: AppState, save: (s: AppState) => Promise<void>, clock: Clock, newId: () => string): Store;
export const StoreContext: React.Context<Store>;
export const ClockContext: React.Context<Clock>;
export function useStore(): Store;
export function useAppState(): AppState;
export function useNow(): number;   // clock.now(), re-read every 250 ms
```

- Rules: `dispatch` runs `reduce`, and when there is no error it swaps the state, calls `save` and notifies listeners. If `save` rejects, `saveFailed()` becomes true and listeners are notified. The backup file is JSON `{ app: 'match-stats', version: 1, exportedAt, state }` named `match-stats-backup-YYYY-MM-DD.json` using the UTC date of `now`. `parseBackup` returns `{ ok: false }` unless the text is JSON with `app === 'match-stats'`, `version === 1`, and a `state` whose `teams` is an array in which every team has `players` and `seasons` arrays and every match has `starters`, `bench` and a non-empty `events` array.

- [ ] **Step 1: Write the failing tests.**

```ts
// storage.test.ts
test('state survives a save and load', async () => {
  expect(await loadState()).toEqual(initialState());
  const s = teamWithPlayers(3, 5);
  await saveState(s);
  expect(await loadState()).toEqual(s);
});
// backup.test.ts
test('a backup restores to the same state', () => {
  const s = liveState();
  const { filename, text } = exportBackup(s, Date.UTC(2026, 9, 10));
  expect(filename).toBe('match-stats-backup-2026-10-10.json');
  expect(parseBackup(text)).toEqual({ ok: true, state: s });
});
test('files that are not a backup are refused', () => {
  for (const text of ['', 'not json', '{}', '{"app":"other","version":1,"state":{"teams":[]}}',
    '{"app":"match-stats","version":2,"state":{"teams":[]}}', '{"app":"match-stats","version":1,"state":{"teams":"x"}}'])
    expect(parseBackup(text)).toEqual({ ok: false });
});
// store.test.ts
test('dispatch saves after every action and reports errors', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const store = createStore(initialState(), save, { now: () => 1000 }, () => 'id');
  expect(store.dispatch({ type: 'team/create', name: 'T', format: 5 })).toBeNull();
  expect(save).toHaveBeenCalledWith(store.getState());
  expect(store.dispatch({ type: 'match/undo' })).toBe('no_live_match');
  expect(save).toHaveBeenCalledTimes(1);
});
test('a failed save is reported', async () => {
  const store = createStore(initialState(), () => Promise.reject(new Error('full')), { now: () => 1 }, () => 'id');
  store.dispatch({ type: 'team/create', name: 'T', format: 5 });
  await Promise.resolve(); await Promise.resolve();
  expect(store.saveFailed()).toBe(true);
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the three files. `useAppState` uses `useSyncExternalStore`.
- [ ] **Step 4: Wire `main.tsx`:** await `loadState()`, call `navigator.storage?.persist?.()`, create the store with `saveState`, `{ now: () => Date.now() }` and `crypto.randomUUID`, and render `<App />` inside both context providers.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: saving, store and backup`.

### Task 7: App shell and Settings screen

**Files:**
- Create: `src/ui/App.tsx`, `src/ui/testing.tsx`, `src/ui/messages.ts`, `src/ui/components/Header.tsx`, `src/ui/components/PlayerCard.tsx`, `src/ui/screens/Settings.tsx`, `src/ui/screens/Settings.test.tsx`
- Modify: `src/ui/theme.css`

**Interfaces:**
- Consumes: Task 6 store and hooks; Task 5 selectors and `ErrorCode`; `exportBackup`, `parseBackup`.
- Produces:

```ts
// App.tsx
export type Screen =
  | { name: 'settings' } | { name: 'pick' } | { name: 'season' } | { name: 'live' } | { name: 'sub' }
  | { name: 'goal'; t: number } | { name: 'log'; matchId: Id } | { name: 'fulltime'; matchId: Id };
export interface Nav { go(screen: Screen): void }
export function App(props: { initialScreen?: Screen }): ReactElement;
// testing.tsx
export function renderApp(opts?: { state?: AppState; now?: number; screen?: Screen }): { store: Store; setNow(ms: number): void; user: UserEvent };
// messages.ts
export function errorMessage(code: ErrorCode): string;
// components
export function PlayerCard(props: { number: number; name: string; clock?: string; tone: 'pitch' | 'bench' | 'off' | 'selected-ink' | 'selected-green' | 'disabled'; badge?: string; onClick?: () => void }): ReactElement;
export function Header(props: { title: string; subtitle?: string; onClose?: () => void }): ReactElement;
```

- Rules: every screen component takes `{ nav: Nav }`. `App` opens on `initialScreen` when given; otherwise on `live` when the active team has a live match, on `settings` when there is no team, and on `pick` in every other case. A bottom tab bar with `New match`, `Season`, `Settings` shows on `pick`, `season` and `settings` only. While a live match exists, any screen other than `live`, `sub`, `goal` and `log` redirects to `live`. `App` shows a banner reading `Could not save. Back up your data in Settings.` when `store.saveFailed()` is true. `PlayerCard` renders a `<button>` whose accessible name is `"<number> <name>"`. `renderApp` builds a store with a no-op save and a clock it controls, and renders `<App />`.
- Settings layout follows mockup 1: a `Team` select with `New team` beside it, a `Team name` input, five format buttons (accessible names `3 a side` to `11 a side`, the chosen one `aria-pressed="true"`), the squad as a two-column grid of `PlayerCard`s in shirt-number order ending in `Add player`, then `Back up`, `Restore` and `Start new season`. Tapping a player opens a small form with inputs labelled `Shirt number` and `Name`, and buttons `Save` and `Remove`. `Add player` opens the same form without `Remove`. `New team` opens a form with `Team name`, the format buttons and `Create team`. With no team yet, the screen shows only that new-team form. Reducer errors show as `errorMessage(code)` in an element with `role="alert"`. `Back up` uses `navigator.share({ files })` when `navigator.canShare` accepts the file, otherwise a download link. `Restore` reads a chosen file, and on `parseBackup` success asks `Replace everything on this phone with this backup?` before dispatching `state/replace`; on failure it shows `That file is not a Match Stats backup.` `Start new season` asks for confirmation first.

- [ ] **Step 1: Write the failing tests** in `Settings.test.tsx`:

```ts
test('first run: create a team, pick a format, add a player', async () => {
  const { store, user } = renderApp();
  await user.type(screen.getByLabelText('Team name'), 'Under 10s');
  await user.click(screen.getByRole('button', { name: '7 a side' }));
  await user.click(screen.getByRole('button', { name: 'Create team' }));
  await user.click(screen.getByRole('button', { name: 'Add player' }));
  await user.type(screen.getByLabelText('Shirt number'), '5');
  await user.type(screen.getByLabelText('Name'), 'Alfie');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('button', { name: '5 Alfie' })).toBeInTheDocument();
  expect(activeTeam(store.getState())).toMatchObject({ name: 'Under 10s', format: 7 });
});
test('a duplicate shirt number shows a message and adds nothing', async () => {
  const { store, user } = renderApp({ state: teamWithPlayers(3, 5) });
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await user.click(screen.getByRole('button', { name: 'Add player' }));
  await user.type(screen.getByLabelText('Shirt number'), '1');
  await user.type(screen.getByLabelText('Name'), 'Leo');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent(errorMessage('number_taken'));
  expect(activeTeam(store.getState())!.players).toHaveLength(5);
});
test('a second team can be added and switched to', async () => { /* New team -> 'Under 8s', 5 a side; select shows both; choosing 'T' makes it active */ });
test('a bad restore file is refused', async () => { /* upload new File(['nope'], 'x.json'); expect text 'That file is not a Match Stats backup.'; state unchanged */ });
```

Write the last two tests out in full in the same style. `teamWithPlayers` gives players numbered 1 upward named `P1`, `P2`, and a team named `T`.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `testing.tsx`, `messages.ts`, the two components, `App.tsx` and `Settings.tsx`. Add shared classes to `theme.css` for the header band, section labels, the two-column grid, cards, and the primary (green), dark (ink) and outline buttons, matching the mockup description in the spec.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: app shell and settings screen`.

### Task 8: Pick the team screen

**Files:**
- Create: `src/ui/screens/PickTeam.tsx`, `src/ui/screens/PickTeam.test.tsx`

**Interfaces:**
- Consumes: `renderApp`, `PlayerCard`, `Header`, `Nav`, `activeTeam`, action `match/start`.
- Produces: `PickTeam(props: { nav: Nav }): ReactElement`.
- Rules, following mockup 2: header `Pick the team` with `<team name> · <format> a side`. A `Playing against` input. The squad (not removed) in shirt-number order; every player begins on `Bench`; each tap moves that player on a step: bench, start, not here, bench. Card badges read `START`, `BENCH`, `OUT`. Three counters: `<n> of <format>` starting, on the bench, not here. `Start match` is `disabled` unless starters equal the format. It dispatches `starters` and `bench` in shirt-number order, and on success navigates to `live`. A squad smaller than the format shows `Add more players in Settings to start a <format> a side match.`

- [ ] **Step 1: Write the failing test:**

```ts
test('start match unlocks only with the full number of starters', async () => {
  const { store, user } = renderApp({ state: teamWithPlayers(3, 5), now: 5_000 });
  const start = screen.getByRole('button', { name: 'Start match' });
  expect(start).toBeDisabled();
  for (const n of ['1 P1', '2 P2']) await user.click(screen.getByRole('button', { name: n }));
  expect(screen.getByText('2 of 3')).toBeInTheDocument();
  expect(start).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '3 P3' }));
  await user.click(screen.getByRole('button', { name: '5 P5' }));
  await user.click(screen.getByRole('button', { name: '5 P5' })); // start -> not here
  await user.type(screen.getByLabelText('Playing against'), 'Rovers');
  await user.click(start);
  const m = liveMatch(activeTeam(store.getState())!)!;
  expect(m).toMatchObject({ opposition: 'Rovers', starters: ['p1', 'p2', 'p3'], bench: ['p4'] });
  expect(m.events[0]).toMatchObject({ type: 'kickoff', at: 5_000 });
});
```

Add a test that a fourth starter leaves `Start match` disabled and shows `4 of 3`.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `PickTeam.tsx`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: pick the team screen`.

### Task 9: Live match screen

**Files:**
- Create: `src/ui/screens/Live.tsx`, `src/ui/screens/Live.test.tsx`

**Interfaces:**
- Consumes: `renderApp` (with `setNow`), `useNow`, `deriveMatch`, `formatClock`, `liveMatch`, actions `match/period` and `match/undo`.
- Produces: `Live(props: { nav: Nav }): ReactElement`.
- Rules, following mockup 3: the dark header shows the team name, score `<us> – <them>`, opposition name (or `Opposition` when blank), the period label (`1st half`, `Half time`, `2nd half`, in an element with `data-testid="period"`) and the match clock (`data-testid="match-clock"`). One period button: `Half time` in the first half, `Start 2nd half` at half time, `Full time` in the second half. `Full time` asks `End the match?` with `End match` and `Keep playing`; ending navigates to `fulltime` for that match. `On the pitch · <n>` lists on-pitch players in shirt-number order with their clocks. `Bench · <n>` lists bench players in `DerivedMatch.bench` order. Both lists scroll inside the screen; the bottom bar stays fixed. A strip shows the last logged entry as `Last: <mm>' <description>` and an `Undo` button; tapping the text opens `log`. Bottom bar: `Sub` (opens `sub`) and `Goal` (opens `goal` with `t` set to the clock at the tap). Player cards on this screen do nothing when tapped.

- [ ] **Step 1: Write the failing tests:**

```ts
test('clocks tick from saved time, not from a counter', async () => {
  const { setNow } = renderApp({ state: liveState(), now: KICK + 600_000 }); // liveState kicks off at KICK
  expect(screen.getByTestId('match-clock')).toHaveTextContent('10:00');
  expect(within(screen.getByRole('button', { name: '1 P1' })).getByText('10:00')).toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: '4 P4' })).getByText('00:00')).toBeInTheDocument();
  setNow(KICK + 1_062_000); // as if the phone had been locked for 7 minutes
  await waitFor(() => expect(screen.getByTestId('match-clock')).toHaveTextContent('17:42'));
});
test('half time freezes every clock and the second half carries on', async () => {
  const { setNow, user } = renderApp({ state: liveState(), now: KICK + 1_500_000 });
  await user.click(screen.getByRole('button', { name: 'Half time' }));
  setNow(KICK + 2_400_000);
  await waitFor(() => expect(screen.getByText('Half time', { selector: '[data-testid=period]' })).toBeInTheDocument());
  expect(screen.getByTestId('match-clock')).toHaveTextContent('25:00');
  await user.click(screen.getByRole('button', { name: 'Start 2nd half' }));
  setNow(KICK + 2_700_000);
  await waitFor(() => expect(screen.getByTestId('match-clock')).toHaveTextContent('30:00'));
});
test('undo takes back the last entry', async () => { /* state with one sub logged; click Undo; the sub is gone from the store and the off player is back on the pitch list */ });
test('full time asks first, then shows the summary', async () => { /* second-half state; click Full time; 'Keep playing' leaves it live; 'End match' -> heading 'Full time' */ });
```

Write the last two out in full. Export `KICK` from `src/state/fixtures.ts`.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `Live.tsx`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: live match screen`.

### Task 10: Make a sub and Log a goal screens

**Files:**
- Create: `src/ui/screens/Sub.tsx`, `src/ui/screens/Goal.tsx`, and a `.test.tsx` beside each

**Interfaces:**
- Consumes: as Task 9, plus actions `match/sub` and `match/goal`, and `Screen` `{ name: 'goal'; t: number }`.
- Produces: `Sub(props: { nav: Nav }): ReactElement`, `Goal(props: { nav: Nav; t: number }): ReactElement`.
- Rules for Sub, mockup 4: header `Make a sub` with the running clock. `1. Coming off` lists on-pitch players; `2. Coming on` lists the bench, least played first. One player can be chosen in each list; chosen cards show `OFF` and `ON`. A summary line reads `<n> <name> off` and `<n> <name> on`. `Confirm sub` is disabled until both are chosen; it dispatches and returns to `live`. `Cancel` and the close button return to `live` with nothing logged. With an empty bench the screen says `Nobody on the bench.`
- Rules for Goal, mockup 5: header `Goal` with `formatClock(t)`, which does not tick. A `Your team` / `Opposition` switch, `Your team` chosen first. For your team: `1. Who scored` lists on-pitch players plus `Own goal`; `2. Assist` lists the same players plus `No assist`, with the chosen scorer disabled. `No assist` is chosen by default. Choosing `Own goal` or `Opposition` hides the assist list. Each list is a `role="group"` named `Who scored` or `Assist`. `Confirm goal` is disabled until there is a scorer, `Own goal` or `Opposition`. It dispatches `match/goal` with the `t` it was given and returns to `live`.

- [ ] **Step 1: Write the failing tests:**

```ts
// Sub.test.tsx
test('a sub is pick off, pick on, confirm, stamped at confirm time', async () => {
  const { store, setNow, user } = renderApp({ state: liveState(), now: KICK + 600_000 });
  await user.click(screen.getByRole('button', { name: 'Sub' }));
  const confirm = screen.getByRole('button', { name: 'Confirm sub' });
  expect(confirm).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '3 P3' }));
  await user.click(screen.getByRole('button', { name: '4 P4' }));
  setNow(KICK + 630_000);
  await user.click(confirm);
  expect(liveMatch(activeTeam(store.getState())!)!.events.at(-1)).toMatchObject({ type: 'sub', t: 630_000, offId: 'p3', onId: 'p4' });
  expect(screen.getByRole('button', { name: 'Goal' })).toBeInTheDocument(); // back on the live screen
});
// Goal.test.tsx
test('the goal keeps the time of the Goal tap', async () => {
  const { store, setNow, user } = renderApp({ state: liveState(), now: KICK + 494_000 });
  await user.click(screen.getByRole('button', { name: 'Goal' }));
  setNow(KICK + 530_000);
  await user.click(within(screen.getByRole('group', { name: 'Who scored' })).getByRole('button', { name: '1 P1' }));
  await user.click(within(screen.getByRole('group', { name: 'Assist' })).getByRole('button', { name: '2 P2' }));
  await user.click(screen.getByRole('button', { name: 'Confirm goal' }));
  expect(liveMatch(activeTeam(store.getState())!)!.events.at(-1))
    .toMatchObject({ type: 'goal', t: 494_000, side: 'us', scorerId: 'p1', assistId: 'p2', ownGoal: false });
});
test('the scorer cannot be picked as the assist', async () => { /* after choosing 1 P1 as scorer, the Assist group's '1 P1' button is disabled */ });
test('an opposition goal needs no players', async () => { /* click Opposition, Confirm goal -> event side 'them', scorerId null; live header shows '0 – 1' */ });
test('an own goal counts for us with no scorer', async () => { /* click Own goal, Confirm goal -> ownGoal true, side 'us'; header '1 – 0' */ });
```

Write the three commented tests out in full, plus a Sub test that `Cancel` logs nothing.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** both screens.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: sub and goal screens`.

### Task 11: Match log screen

**Files:**
- Create: `src/ui/screens/MatchLog.tsx`, `src/ui/screens/MatchLog.test.tsx`

**Interfaces:**
- Consumes: `findMatch`, `deriveMatch`, `formatClock`, `errorMessage`, actions `match/editEvent`, `match/deleteEvent`, `match/discard`.
- Produces: `MatchLog(props: { nav: Nav; matchId: Id }): ReactElement`.
- Rules, following mockup 6: header `Match log`. Entries newest first by match time, each showing `formatClock` of its time, a title (`Kick off`, `Half time`, `2nd half`, `Full time`, `Sub`, `Goal`) and a description (`5 Alfie off, 13 Leo on`; `6 Harry, assist 3 Jack`; `Opposition goal`; `Own goal`). Tapping an entry opens its actions. `Sub` and `Goal` entries offer `Change players`, `Change time`, `Delete`. `Half time` and `Full time` entries offer `Change time` only. `Kick off` offers `Discard match`, which asks `Delete this whole match?` first. `2nd half` offers nothing. `Change time` is a form with `Minutes` and `Seconds` number inputs and `Save`. `Change players` reuses the same pick lists as the Sub and Goal screens, filled with who was on the pitch at that entry's time. `Delete` asks `Delete this entry?` first. A refused change shows `errorMessage(code)` in `role="alert"` and changes nothing. Closing returns to `live` for a live match and to `fulltime` for a finished one.

- [ ] **Step 1: Write the failing tests:**

```ts
test('entries are listed newest first', () => { /* state: sub at 630_000, goal at 494_000 -> titles in order Sub, Goal, Kick off; times 10:30, 08:14, 00:00 */ });
test('changing a goal scorer updates the score sheet', async () => { /* open Goal entry, Change players, pick 2 P2, Confirm goal -> event scorerId 'p2' */ });
test('changing a time re-stamps the entry', async () => { /* open Sub entry, Change time 9 min 0 sec, Save -> event t 540_000 */ });
test('a change that breaks a later entry is refused with a message', async () => { /* two dependent subs; delete the first -> alert with errorMessage('off_not_on_pitch'); events unchanged */ });
test('a forgotten full time can be corrected', async () => { /* finished match ended hours late; open Full time entry, Change time 50 min 0 sec -> clockMs is 3_000_000 */ });
```

Write all five out in full in the style of the earlier tasks.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `MatchLog.tsx`. Move the pick lists out of `Sub.tsx` and `Goal.tsx` into `src/ui/components/SubPicker.tsx` and `GoalPicker.tsx` so the log reuses them; the Task 10 tests must still pass unchanged.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: match log and corrections`.

### Task 12: Full time and Season totals screens

**Files:**
- Create: `src/ui/screens/FullTime.tsx`, `src/ui/screens/Season.tsx`, and a `.test.tsx` beside each

**Interfaces:**
- Consumes: `findMatch`, `deriveMatch`, `seasonTotals`, `currentSeason`, `formatClock`.
- Produces: `FullTime(props: { nav: Nav; matchId: Id }): ReactElement`, `Season(props: { nav: Nav }): ReactElement`.
- Rules for Full time, mockup 7: header `Full time`, team name, final score, opposition. A table with columns `No`, `Player`, `Played`, `G`, `A`, one row per player in the match lineup in shirt-number order, `Played` as `formatClock`. A bar under each name shows that player's share of the match clock. Buttons: `Match log` (opens `log`) and `Done` (opens `season`).
- Rules for Season, mockup 8: header `Season totals` with `<n> matches played` (`1 match played` for one). A table with columns `No`, `Player`, `M`, `Mins`, `Avg`, `G`, `A` in `seasonTotals` order. `Mins` and `Avg` are whole minutes, rounded. A key line under the table explains the columns. Below it, `Matches` lists the season's finished matches newest first as `<us> – <them> v <opposition>`; tapping one opens `fulltime` for it. With more than one season, a select switches between them, the open one labelled `This season`. With no finished matches it says `No matches saved yet.`

- [ ] **Step 1: Write the failing tests:**

```ts
// FullTime.test.tsx
test('shows each player\'s time, goals and assists', () => {
  renderApp({ state: finishedState(), screen: { name: 'fulltime', matchId: 'm1' } });
  expect(within(screen.getByRole('row', { name: /P3/ })).getByText('20:00')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /P4/ })).getByText('30:00')).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /P1/ })).toHaveTextContent(/50:00\s*1\s*0/);
});
// Season.test.tsx
test('lists players lowest average first, in whole minutes', () => {
  renderApp({ state: finishedState(), screen: { name: 'season' } });
  const rows = screen.getAllByRole('row').slice(1).map(r => r.textContent);
  expect(rows[0]).toMatch(/P3.*1.*20.*20/);
  expect(rows.at(-1)).toMatch(/P5/); // attended no match
});
test('a saved match opens its full-time summary', async () => { /* click '1 – 0 v Rovers' -> heading 'Full time' */ });
```

Add `finishedState()` to `src/state/fixtures.ts`: `liveState()` played to a finished match of 3_000_000 ms, with `p3` off for `p4` at `t = 1_200_000` and one goal by `p1` assisted by `p2`. Write the commented test out in full.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** both screens.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: full time and season totals screens`.

### Task 13: Offline install and the end-to-end run

**Files:**
- Create: `public/logo.svg`, `pwa-assets.config.ts`, `playwright.config.ts`, `e2e/match.spec.ts`
- Modify: `vite.config.ts`, `index.html`, `package.json`

**Interfaces:**
- Consumes: the finished app.
- Produces: scripts `npm run e2e` and `npm run icons`; a production build that installs to the home screen and runs offline.
- Rules: `vite-plugin-pwa` with `registerType: 'autoUpdate'` and a manifest of `name: 'Match Stats'`, `short_name: 'Match Stats'`, `display: 'standalone'`, `start_url: '.'`, `scope: '.'`, `theme_color: '#14181A'`, `background_color: '#F4F5F2'`. The service worker precaches every built file including fonts. Icons are generated from `public/logo.svg` (a white football-pitch centre circle on `#0B6B3A`) by `@vite-pwa/assets-generator` with its `minimal2023Preset`. `index.html` gains `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="theme-color" content="#14181A">` and the apple-touch-icon link. Page padding respects `env(safe-area-inset-*)`. Playwright runs against `npm run build && npm run preview` using the Chromium already installed (never download browsers when `PLAYWRIGHT_BROWSERS_PATH` is set), with a 390 by 844 viewport.

- [ ] **Step 1: Write the failing end-to-end test** in `e2e/match.spec.ts`. One test, in this order, using only visible labels:
  1. Create team `Under 10s`, 3 a side; add players 1 to 4.
  2. New match: start three, leave one on the bench, `Start match`.
  3. Note the match clock. Reload the page. Expect to be on the live screen and the clock to be at or beyond the noted value.
  4. Make a sub; expect the bench player's card to show a running clock.
  5. Log a goal with a scorer; expect the score `1 – 0`.
  6. `context.setOffline(true)`, reload; expect the live screen with the score `1 – 0`.
  7. `Half time`, `Start 2nd half`, `Full time`, `End match`; expect the `Full time` heading; `Done`; expect `1 match played`.
- [ ] **Step 2: Run** `npm run e2e`. Expected: FAIL at step 6 (no service worker yet).
- [ ] **Step 3: Implement** the PWA config, icons and meta tags.
- [ ] **Step 4: Run** `npm test`, `npm run build`, `npm run e2e`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat: offline install and end-to-end test`.

### Task 14: Publish to GitHub Pages and write the tester guide

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: `npm test`, `npm run build`.
- Produces: a public link that serves `dist/`.
- Needs from Connor before this task: a GitHub account connected to Claude and a public repository named `match-stats`.

- [ ] **Step 1: Write** `deploy.yml`: on push to `main`, run `npm ci`, `npm test`, `npm run build`, then publish `dist` with `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`, with `pages: write` and `id-token: write` permissions.
- [ ] **Step 2: Write** `README.md` in plain language with three sections: what Match Stats is (two sentences from the spec); how to put it on a phone (Android: open the link in Chrome, menu, `Add to Home screen`; iPhone: open the link in Safari, Share, `Add to Home Screen`; open it once with signal before the first match); and how to back up and restore.
- [ ] **Step 3: Push** to `main` and set the repository's Pages source to GitHub Actions.
- [ ] **Step 4: Verify.** The workflow run is green. Open the link in a 390 px wide browser window, create a team, reload, and confirm the team is still there.
- [ ] **Step 5: Commit** any fixes as `chore: publish to GitHub Pages`, then hand Connor the link for the phone check on both his Android phone and his iPhone: install to the home screen, start a match, lock the phone for two minutes, unlock, and confirm the clocks moved on by two minutes.
