import { useState, type ReactElement } from 'react';
import { useAppState } from '../../state/store.ts';
import { activeTeam, playerById } from '../../state/selectors.ts';
import { seasonTotals } from '../../domain/season.ts';
import { deriveMatch } from '../../domain/derive.ts';
import { period } from '../../domain/clock.ts';
import type { Id } from '../../domain/types.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';

const minutes = (ms: number) => Math.round(ms / 60_000);

export function Season(props: { nav: Nav }): ReactElement {
  const state = useAppState();
  const team = activeTeam(state)!;
  const newestFirst = [...team.seasons].reverse();
  const [seasonId, setSeasonId] = useState<Id>(newestFirst[0].id);
  const season = team.seasons.find((s) => s.id === seasonId) ?? newestFirst[0];
  const finished = season.matches.filter((m) => period(m) === 'finished');
  const rows = seasonTotals(team, season);
  const count = finished.length;
  const matchesNewestFirst = [...finished].sort((a, b) => {
    const at = (m: typeof a) => (m.events[0].type === 'kickoff' ? m.events[0].at : 0);
    return at(b) - at(a);
  });

  return (
    <>
      <Header title="Season totals" subtitle={`${team.name} · ${count} ${count === 1 ? 'match' : 'matches'} played`} />
      <main className="screen-body">
        {team.seasons.length > 1 ? (
          <div className="field">
            <label htmlFor="season-pick">Season</label>
            <select id="season-pick" className="select" value={season.id} onChange={(e) => setSeasonId(e.target.value)}>
              {newestFirst.map((s, i) => (
                <option key={s.id} value={s.id}>{i === 0 ? 'This season' : `Season started ${new Date(s.startedAt).toLocaleDateString('en-GB')}`}</option>
              ))}
            </select>
          </div>
        ) : null}
        {count === 0 ? <p className="hint">No matches saved yet.</p> : (
          <>
            <div className="section-head">
              <span className="hint">lowest average first</span>
            </div>
            <table className="table season">
              <thead>
                <tr>
                  <th scope="col">No</th><th scope="col">Player</th>
                  <th scope="col" className="c"><abbr title="Matches">M</abbr></th>
                  <th scope="col" className="r">Mins</th>
                  <th scope="col" className="r">Avg</th>
                  <th scope="col" className="c"><abbr title="Goals">G</abbr></th>
                  <th scope="col" className="c"><abbr title="Assists">A</abbr></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = playerById(team, r.playerId);
                  return (
                    <tr key={r.playerId}>
                      <td><span className="chip">{p?.number ?? '?'}</span></td>
                      <td><span className="pname">{p?.name ?? 'Unknown'}</span></td>
                      <td className="c zero">{r.matches}</td>
                      <td className="r big">{minutes(r.totalMs)}</td>
                      <td className="r big good">{minutes(r.avgMs)}</td>
                      <td className={`c ${r.goals ? '' : 'zero'}`}>{r.goals}</td>
                      <td className={`c ${r.assists ? '' : 'zero'}`}>{r.assists}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="hint">M matches · Mins total minutes on the pitch · Avg minutes per match they were at · G goals · A assists</p>
            <section className="section">
              <h2 className="label">Matches</h2>
              <div className="match-list">
                {matchesNewestFirst.map((m) => {
                  const d = deriveMatch(m, 0);
                  return (
                    <button key={m.id} type="button" className="match-row" onClick={() => props.nav.go({ name: 'fulltime', matchId: m.id })}>
                      <span>{d.score.us} – {d.score.them} v {m.opposition || 'Opposition'}</span>
                      <span aria-hidden="true">›</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
