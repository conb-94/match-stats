import type { ReactElement } from 'react';
import { useAppState } from '../../state/store.ts';
import { activeTeam, findMatch, playerById } from '../../state/selectors.ts';
import { deriveMatch } from '../../domain/derive.ts';
import { formatClock } from '../../domain/clock.ts';
import type { Id } from '../../domain/types.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';

export function FullTime(props: { nav: Nav; matchId: Id }): ReactElement {
  const state = useAppState();
  const team = activeTeam(state)!;
  const match = findMatch(team, props.matchId);
  if (!match) return <><Header title="Full time" /><main className="screen-body"><p className="hint">This match has been deleted.</p></main></>;

  const d = deriveMatch(match, 0);
  const ids = [...match.starters, ...match.bench].sort((a, b) => (playerById(team, a)?.number ?? 0) - (playerById(team, b)?.number ?? 0));
  const share = (ms: number) => (d.clockMs > 0 ? Math.min(100, (ms / d.clockMs) * 100) : 0);

  return (
    <>
      <Header title="Full time" subtitle={`${formatClock(d.clockMs)} played`} />
      <main className="screen-body">
        <div className="panel final-score">
          <span className="team">{team.name}</span>
          <span className="score num" aria-label={`Final score ${d.score.us} to ${d.score.them}`}>{d.score.us} – {d.score.them}</span>
          <span className="team right">{match.opposition || 'Opposition'}</span>
        </div>
        <table className="table">
          <thead>
            <tr><th scope="col">No</th><th scope="col">Player</th><th scope="col" className="r">Played</th><th scope="col" className="c">G</th><th scope="col" className="c">A</th></tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const p = playerById(team, id);
              const g = d.goals[id] ?? 0;
              const a = d.assists[id] ?? 0;
              return (
                <tr key={id}>
                  <td><span className="chip">{p?.number ?? '?'}</span></td>
                  <td><span className="pname">{p?.name ?? 'Unknown'}</span><div className="bar" aria-hidden="true"><div style={{ width: `${share(d.playedMs[id] ?? 0)}%` }} /></div></td>
                  <td className="r big">{formatClock(d.playedMs[id] ?? 0)}</td>
                  <td className={`c ${g ? '' : 'zero'}`}>{g}</td>
                  <td className={`c ${a ? '' : 'zero'}`}>{a}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">Played = time on the pitch · G goals · A assists</p>
      </main>
      <div className="bottom-bar">
        <button type="button" className="btn outline" onClick={() => props.nav.go({ name: 'log', matchId: match.id })}>Match log</button>
        <button type="button" className="btn primary" onClick={() => props.nav.go({ name: 'season' })}>Done</button>
      </div>
    </>
  );
}
