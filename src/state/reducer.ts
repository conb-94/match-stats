import {
  deleteEvent, editEvent, logGoal, logPeriod, logSub, undoLast,
  type EventPatch, type GoalInput, type LogError, type LogResult,
} from '../domain/log.ts';
import type { AppState, Format, Id, Match, Player, Team } from '../domain/types.ts';
import { activeTeam, currentSeason, liveMatch } from './selectors.ts';

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
  | { type: 'match/reopen'; matchId: Id }
  | { type: 'state/replace'; state: AppState };

export interface Ctx { now: number; newId: () => Id }
export type ReduceResult = { state: AppState; error: ErrorCode | null };

export function initialState(): AppState {
  return { version: 1, teams: [], activeTeamId: null };
}

const PLAYER_NAME_MAX = 20;
const TEAM_NAME_MAX = 30;

function cleanName(name: string, max: number): string | null {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= max ? trimmed : null;
}

function numberProblem(team: Team, number: number, exceptId?: Id): ErrorCode | null {
  if (!Number.isInteger(number) || number < 1 || number > 99) return 'number_invalid';
  if (team.players.some((p) => !p.removed && p.id !== exceptId && p.number === number)) return 'number_taken';
  return null;
}

function inAnyMatch(team: Team, playerId: Id): boolean {
  return team.seasons.some((s) => s.matches.some((m) => m.starters.includes(playerId) || m.bench.includes(playerId)));
}

/** Replaces one match wherever it is in the team's seasons. */
function replaceMatch(team: Team, matchId: Id, next: Match | null): Team {
  return {
    ...team,
    seasons: team.seasons.map((s) => ({
      ...s,
      matches: next ? s.matches.map((m) => (m.id === matchId ? next : m)) : s.matches.filter((m) => m.id !== matchId),
    })),
  };
}

export function reduce(state: AppState, action: Action, ctx: Ctx): ReduceResult {
  const fail = (error: ErrorCode): ReduceResult => ({ state, error });
  const ok = (next: AppState): ReduceResult => ({ state: next, error: null });
  const team = activeTeam(state);
  const live = team ? liveMatch(team) : null;
  const putTeam = (next: Team): ReduceResult => ok({ ...state, teams: state.teams.map((t) => (t.id === next.id ? next : t)) });
  const fromLog = (matchId: Id, result: LogResult): ReduceResult =>
    result.ok ? putTeam(replaceMatch(team!, matchId, result.match)) : fail(result.error);

  switch (action.type) {
    case 'team/create': {
      if (live) return fail('match_in_progress');
      const name = cleanName(action.name, TEAM_NAME_MAX);
      if (!name) return fail('name_required');
      const created: Team = {
        id: ctx.newId(), name, format: action.format, players: [],
        seasons: [{ id: ctx.newId(), startedAt: ctx.now, closedAt: null, matches: [] }],
      };
      return ok({ ...state, teams: [...state.teams, created], activeTeamId: created.id });
    }
    case 'team/select':
      if (live) return fail('match_in_progress');
      if (!state.teams.some((t) => t.id === action.teamId)) return fail('not_found');
      return ok({ ...state, activeTeamId: action.teamId });
    case 'state/replace':
      if (live) return fail('match_in_progress');
      return ok(action.state);
  }

  if (!team) return fail('not_found');

  switch (action.type) {
    case 'team/rename': {
      const name = cleanName(action.name, TEAM_NAME_MAX);
      return name ? putTeam({ ...team, name }) : fail('name_required');
    }
    case 'team/setFormat':
      if (live) return fail('match_in_progress');
      return putTeam({ ...team, format: action.format });
    case 'player/add': {
      const name = cleanName(action.name, PLAYER_NAME_MAX);
      if (!name) return fail('name_required');
      const problem = numberProblem(team, action.number);
      if (problem) return fail(problem);
      const player: Player = { id: ctx.newId(), number: action.number, name, removed: false };
      return putTeam({ ...team, players: [...team.players, player] });
    }
    case 'player/edit': {
      if (!team.players.some((p) => p.id === action.playerId)) return fail('not_found');
      const name = cleanName(action.name, PLAYER_NAME_MAX);
      if (!name) return fail('name_required');
      const problem = numberProblem(team, action.number, action.playerId);
      if (problem) return fail(problem);
      return putTeam({ ...team, players: team.players.map((p) => (p.id === action.playerId ? { ...p, name, number: action.number } : p)) });
    }
    case 'player/remove': {
      if (!team.players.some((p) => p.id === action.playerId)) return fail('not_found');
      if (live && (live.starters.includes(action.playerId) || live.bench.includes(action.playerId))) return fail('player_in_live_match');
      const players = inAnyMatch(team, action.playerId)
        ? team.players.map((p) => (p.id === action.playerId ? { ...p, removed: true } : p))
        : team.players.filter((p) => p.id !== action.playerId);
      return putTeam({ ...team, players });
    }
    case 'season/startNew': {
      if (live) return fail('match_in_progress');
      const seasons = team.seasons.map((s, i) => (i === team.seasons.length - 1 ? { ...s, closedAt: ctx.now } : s));
      return putTeam({ ...team, seasons: [...seasons, { id: ctx.newId(), startedAt: ctx.now, closedAt: null, matches: [] }] });
    }
    case 'match/start': {
      if (live) return fail('match_in_progress');
      if (action.starters.length !== team.format) return fail('wrong_starter_count');
      const ids = [...action.starters, ...action.bench];
      const known = new Set(team.players.filter((p) => !p.removed).map((p) => p.id));
      if (new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) return fail('not_found');
      const match: Match = {
        id: ctx.newId(), opposition: action.opposition.trim(), format: team.format,
        starters: [...action.starters], bench: [...action.bench], events: [],
      };
      match.events.push({ id: ctx.newId(), type: 'kickoff', at: ctx.now });
      const season = currentSeason(team);
      return putTeam({ ...team, seasons: team.seasons.map((s) => (s === season ? { ...s, matches: [...s.matches, match] } : s)) });
    }
    case 'match/period':
      if (!live) return fail('no_live_match');
      return fromLog(live.id, logPeriod(live, action.period, ctx.now, ctx.newId()));
    case 'match/sub':
      if (!live) return fail('no_live_match');
      return fromLog(live.id, logSub(live, action.offId, action.onId, ctx.now, ctx.newId()));
    case 'match/goal':
      if (!live) return fail('no_live_match');
      return fromLog(live.id, logGoal(live, action.goal, ctx.now, ctx.newId()));
    case 'match/undo':
      if (!live) return fail('no_live_match');
      if (live.events.length === 1) return putTeam(replaceMatch(team, live.id, null));
      return fromLog(live.id, undoLast(live));
    case 'match/editEvent':
    case 'match/deleteEvent': {
      const match = team.seasons.flatMap((s) => s.matches).find((m) => m.id === action.matchId);
      if (!match) return fail('not_found');
      const result = action.type === 'match/editEvent'
        ? editEvent(match, action.eventId, action.patch, ctx.now)
        : deleteEvent(match, action.eventId, ctx.now);
      return fromLog(match.id, result);
    }
    case 'match/reopen': {
      // Takes back a mistaken full time, for the latest match of the current season only.
      if (live) return fail('match_in_progress');
      const matches = currentSeason(team).matches;
      const match = matches.find((m) => m.id === action.matchId);
      if (!match) return fail('not_found');
      if (match !== matches[matches.length - 1] || match.events.at(-1)?.type !== 'fulltime') return fail('wrong_period');
      return fromLog(match.id, undoLast(match));
    }
    case 'match/discard':
      if (!team.seasons.some((s) => s.matches.some((m) => m.id === action.matchId))) return fail('not_found');
      return putTeam(replaceMatch(team, action.matchId, null));
  }
  return fail('not_found');
}
