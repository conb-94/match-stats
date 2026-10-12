import { useState, type ReactElement } from 'react';
import { useAppState, useNow, useStore } from '../../state/store.ts';
import { activeTeam, liveMatch, playerById } from '../../state/selectors.ts';
import { deriveMatch } from '../../domain/derive.ts';
import { formatClock } from '../../domain/clock.ts';
import type { Id } from '../../domain/types.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';
import { SubPicker } from '../components/SubPicker.tsx';
import { errorMessage } from '../messages.ts';

export function Sub(props: { nav: Nav }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const team = activeTeam(state)!;
  const match = liveMatch(team);
  const [off, setOff] = useState<Id | null>(null);
  const [on, setOn] = useState<Id | null>(null);
  const [error, setError] = useState<string | null>(null);
  const back = () => props.nav.go({ name: 'live' });
  if (!match) return <main className="screen-body" />;

  const d = deriveMatch(match, now);
  const onPitch = [...d.onPitch].sort((a, b) => (playerById(team, a)?.number ?? 0) - (playerById(team, b)?.number ?? 0));
  const confirm = () => {
    if (!off || !on) return;
    const code = store.dispatch({ type: 'match/sub', offId: off, onId: on });
    if (code) setError(errorMessage(code));
    else back();
  };

  return (
    <>
      <Header title="Make a sub" subtitle={`${formatClock(d.clockMs)} · clocks still running`} onClose={back} closeLabel="Cancel sub" />
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        <SubPicker team={team} onPitch={onPitch} bench={d.bench} playedMs={d.playedMs} off={off} on={on} onPickOff={setOff} onPickOn={setOn} />
      </main>
      <div className="bottom-bar wide-right">
        <button type="button" className="btn outline" onClick={back}>Cancel</button>
        <button type="button" className="btn primary" disabled={!off || !on} onClick={confirm}>Confirm sub</button>
      </div>
    </>
  );
}
