import { useState, type ReactElement } from 'react';
import { useAppState, useStore } from '../../state/store.ts';
import { activeTeam, squad } from '../../state/selectors.ts';
import type { Id } from '../../domain/types.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { errorMessage } from '../messages.ts';

type Status = 'bench' | 'start' | 'out';
const NEXT: Record<Status, Status> = { bench: 'start', start: 'out', out: 'bench' };

export function PickTeam(props: { nav: Nav }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const team = activeTeam(state)!;
  const players = squad(team);
  const [status, setStatus] = useState<Record<Id, Status>>({});
  const [opposition, setOpposition] = useState('');
  const [error, setError] = useState<string | null>(null);

  const of = (id: Id): Status => status[id] ?? 'bench';
  const starters = players.filter((p) => of(p.id) === 'start').map((p) => p.id);
  const bench = players.filter((p) => of(p.id) === 'bench').map((p) => p.id);
  const out = players.length - starters.length - bench.length;
  const ready = starters.length === team.format;
  const tooFew = players.length < team.format;

  const start = () => {
    const code = store.dispatch({ type: 'match/start', opposition, starters, bench });
    if (code) setError(errorMessage(code));
    else props.nav.go({ name: 'live' });
  };

  return (
    <>
      <Header title="Pick the team" subtitle={`${team.name} · ${team.format} a side`} />
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        <div className="field">
          <label htmlFor="opposition">Playing against</label>
          <input id="opposition" className="input" value={opposition} maxLength={30} placeholder="Opposition" autoComplete="off" onChange={(e) => setOpposition(e.target.value)} />
        </div>
        <section className="section">
          <div className="section-head">
            <h2 className="label">Squad · {players.length}</h2>
            <span className="hint">tap a player to switch</span>
          </div>
          {tooFew ? <p className="alert" role="status">Add more players in Settings to start a {team.format} a side match.</p> : null}
          <div className="grid">
            {players.map((p) => {
              const s = of(p.id);
              return (
                <PlayerCard
                  key={p.id}
                  number={p.number}
                  name={p.name}
                  tone={s === 'start' ? 'selected-green' : s === 'bench' ? 'bench' : 'off'}
                  badge={s === 'start' ? 'START' : s === 'bench' ? 'BENCH' : 'OUT'}
                  onClick={() => setStatus({ ...status, [p.id]: NEXT[s] })}
                />
              );
            })}
          </div>
          <p className="hint">Each tap moves a player on: start, bench, not here. A player who is not here is left out of this match.</p>
        </section>
        <div className="counters">
          <div className="counter"><span className={`big ${ready ? 'good' : ''}`}>{starters.length} of {team.format}</span><span className="small">starting</span></div>
          <div className="counter"><span className="big">{bench.length}</span><span className="small">on the bench</span></div>
          <div className="counter"><span className="big">{out}</span><span className="small">not here</span></div>
        </div>
      </main>
      <div className="bottom-bar single">
        <button type="button" className="btn primary" disabled={!ready} onClick={start}>Start match</button>
      </div>
    </>
  );
}
