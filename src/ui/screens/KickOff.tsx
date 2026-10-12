import { useState, type ReactElement } from 'react';
import { useAppState, useStore } from '../../state/store.ts';
import { activeTeam, squad } from '../../state/selectors.ts';
import type { Draft, Nav } from '../nav.ts';
import { PlayerSection } from './Live.tsx';
import { errorMessage } from '../messages.ts';

/** The live match screen before the whistle: everything at 00:00 until Kick off is tapped. */
export function KickOff(props: { nav: Nav; draft: Draft }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const team = activeTeam(state)!;
  const [error, setError] = useState<string | null>(null);
  const players = squad(team);
  const of = (id: string) => props.draft.status[id] ?? 'bench';
  const starters = players.filter((p) => of(p.id) === 'start').map((p) => p.id);
  const bench = players.filter((p) => of(p.id) === 'bench').map((p) => p.id);
  const zeros = Object.fromEntries([...starters, ...bench].map((id) => [id, 0]));

  const kickOff = () => {
    const code = store.dispatch({ type: 'match/start', opposition: props.draft.opposition, starters, bench });
    if (code) setError(errorMessage(code));
    else props.nav.go({ name: 'live' });
  };

  return (
    <>
      <header className="live-head">
        <div className="scoreline">
          <span className="us">{team.name}</span>
          <span className="score">0 – 0</span>
          <span className="them">{props.draft.opposition.trim() || 'Opposition'}</span>
        </div>
        <div className="clock-row">
          <div>
            <div className="period" data-testid="period">Ready</div>
            <div className="match-clock" data-testid="match-clock">00:00</div>
          </div>
          <button type="button" className="period-btn kickoff-btn" onClick={kickOff}>Kick off</button>
        </div>
      </header>
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        <PlayerSection team={team} label="On the pitch" hint="clocks start at kick off" ids={starters} playedMs={zeros} tone="pitch" />
        <PlayerSection team={team} label="Bench" hint="" ids={bench} playedMs={zeros} tone="bench" />
      </main>
      <div className="bottom-bar single">
        <button type="button" className="btn outline" onClick={() => props.nav.go({ name: 'pick', draft: props.draft })}>Back</button>
      </div>
    </>
  );
}
