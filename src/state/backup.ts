import { FORMATS, type AppState, type Match } from '../domain/types.ts';
import { validateLog } from '../domain/log.ts';

const APP = 'match-stats';
const VERSION = 1;

export function exportBackup(state: AppState, now: number): { filename: string; text: string } {
  const date = new Date(now).toISOString().slice(0, 10);
  const text = JSON.stringify({ app: APP, version: VERSION, exportedAt: now, state });
  return { filename: `match-stats-backup-${date}.json`, text };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isString = (x: unknown): x is string => typeof x === 'string';
const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isFormat = (x: unknown) => (FORMATS as unknown[]).includes(x);
const isIdList = (x: unknown) => Array.isArray(x) && x.every(isString);

function looksLikeEvent(e: unknown): boolean {
  if (!isObject(e) || !isString(e.id)) return false;
  switch (e.type) {
    case 'kickoff': case 'halftime': case 'secondhalf': case 'fulltime':
      return isNumber(e.at);
    case 'sub':
      return isNumber(e.t) && isString(e.offId) && isString(e.onId);
    case 'goal':
      return isNumber(e.t) && (e.side === 'us' || e.side === 'them') && typeof e.ownGoal === 'boolean'
        && (e.scorerId === null || isString(e.scorerId)) && (e.assistId === null || isString(e.assistId));
    default:
      return false;
  }
}

function looksLikeMatch(m: unknown, playerIds: Set<string>): boolean {
  if (!isObject(m) || !isString(m.id) || !isString(m.opposition) || !isFormat(m.format)) return false;
  if (!isIdList(m.starters) || !isIdList(m.bench) || !Array.isArray(m.events) || m.events.length === 0) return false;
  if ((m.starters as string[]).length !== m.format) return false;
  if ([...(m.starters as string[]), ...(m.bench as string[])].some((id) => !playerIds.has(id))) return false;
  if (!m.events.every(looksLikeEvent) || (m.events[0] as { type: string }).type !== 'kickoff') return false;
  return validateLog(m as unknown as Match, Number.MAX_SAFE_INTEGER) === null;
}

function looksLikeTeam(t: unknown): boolean {
  if (!isObject(t) || !isString(t.id) || !isString(t.name) || !isFormat(t.format)) return false;
  if (!Array.isArray(t.players) || !Array.isArray(t.seasons) || t.seasons.length === 0) return false;
  const playersOk = t.players.every((p) => isObject(p) && isString(p.id) && Number.isInteger(p.number) && isString(p.name) && typeof p.removed === 'boolean');
  if (!playersOk) return false;
  const ids = new Set((t.players as { id: string }[]).map((p) => p.id));
  return t.seasons.every((s) =>
    isObject(s) && isString(s.id) && isNumber(s.startedAt) && (s.closedAt === null || isNumber(s.closedAt))
    && Array.isArray(s.matches) && s.matches.every((m) => looksLikeMatch(m, ids)));
}

/** A full check of a whole app state, so a damaged file can never be loaded. */
export function looksLikeState(state: unknown): state is AppState {
  if (!isObject(state) || state.version !== 1 || !Array.isArray(state.teams) || !state.teams.every(looksLikeTeam)) return false;
  const teamIds = (state.teams as { id: string }[]).map((t) => t.id);
  return state.activeTeamId === null ? teamIds.length === 0 : teamIds.includes(state.activeTeamId as string);
}

/** Accepts only a Match Stats backup file; anything else is refused without touching data. */
export function parseBackup(text: string): { ok: true; state: AppState } | { ok: false } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isObject(data) || data.app !== APP || data.version !== VERSION || !looksLikeState(data.state)) return { ok: false };
  return { ok: true, state: data.state };
}
