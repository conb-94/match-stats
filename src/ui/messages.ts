import type { ErrorCode } from '../state/reducer.ts';

const MESSAGES: Record<ErrorCode, string> = {
  off_not_on_pitch: "That player isn't on the pitch at that time.",
  on_not_on_bench: "That player isn't on the bench at that time.",
  scorer_not_on_pitch: 'The scorer has to be on the pitch at that time.',
  assist_not_on_pitch: 'The assist has to come from a player on the pitch at that time.',
  assist_is_scorer: "The scorer can't assist their own goal.",
  time_out_of_range: 'That time is outside the match.',
  duplicate: 'That goal is already logged.',
  wrong_period: "That can't happen at this point in the match.",
  nothing_to_undo: "There's nothing to undo.",
  not_deletable: "That entry can't be changed.",
  not_found: 'Something has gone missing. Go back and try again.',
  name_required: 'Enter a name: up to 20 letters for a player, 30 for a team.',
  number_invalid: 'Shirt numbers go from 1 to 99.',
  number_taken: 'Another player already has that shirt number.',
  wrong_starter_count: 'Pick exactly the right number of starters.',
  match_in_progress: 'Finish the match being played first.',
  player_in_live_match: 'That player is in the match being played.',
  no_live_match: "There's no match being played.",
};

export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code];
}
