import { useState, type ReactElement } from 'react';
import { useAppState, useStore } from '../../state/store.ts';
import { activeTeam, liveMatch, playerById } from '../../state/selectors.ts';
import { lineupAt } from '../../domain/derive.ts';
import { formatClock } from '../../domain/clock.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';
import { emptyGoal, GoalPicker, goalPlayers, goalReady, type GoalChoice } from '../components/GoalPicker.tsx';
import { errorMessage } from '../messages.ts';

/** Logs a goal at match time `t`, the moment Goal was tapped. */
export function Goal(props: { nav: Nav; t: number }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const team = activeTeam(state)!;
  const match = liveMatch(team);
  const [choice, setChoice] = useState<GoalChoice>(emptyGoal);
  const [error, setError] = useState<string | null>(null);
  const back = () => props.nav.go({ name: 'live' });
  if (!match) return <main className="screen-body" />;

  const onPitch = lineupAt(match, props.t + 1).onPitch
    .sort((a, b) => (playerById(team, a)?.number ?? 0) - (playerById(team, b)?.number ?? 0));
  const confirm = () => {
    const code = store.dispatch({ type: 'match/goal', goal: { t: props.t, ...goalPlayers(choice) } });
    if (code) setError(errorMessage(code));
    else back();
  };

  return (
    <>
      <Header title="Goal" subtitle={`${formatClock(props.t)} · time saved when you tapped Goal`} onClose={back} closeLabel="Cancel goal" />
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        <GoalPicker team={team} onPitch={onPitch} value={choice} onChange={setChoice} />
      </main>
      <div className="bottom-bar wide-right">
        <button type="button" className="btn outline" onClick={back}>Cancel</button>
        <button type="button" className="btn primary" disabled={!goalReady(choice)} onClick={confirm}>Confirm goal</button>
      </div>
    </>
  );
}
