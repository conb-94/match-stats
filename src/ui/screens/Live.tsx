import { useState, type ReactElement } from 'react';
import { useAppState, useNow, useStore } from '../../state/store.ts';
import { activeTeam, liveMatch, playerById } from '../../state/selectors.ts';
import { deriveMatch } from '../../domain/derive.ts';
import { formatClock } from '../../domain/clock.ts';
import type { Id, Team } from '../../domain/types.ts';
import type { Action } from '../../state/reducer.ts';
import type { Nav } from '../nav.ts';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { Confirm, type ConfirmRequest } from '../components/Confirm.tsx';
import { describeEvent, eventTime, minuteOf } from '../describe.ts';
import { errorMessage } from '../messages.ts';

const PERIOD_LABEL = { first: '1st half', halftime: 'Half time', second: '2nd half', finished: 'Full time' } as const;

export function Live(props: { nav: Nav }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const team = activeTeam(state)!;
  const match = liveMatch(team);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!match) return <main className="screen-body" />;

  const d = deriveMatch(match, now);
  const act = (action: Action): boolean => {
    const code = store.dispatch(action);
    setError(code ? errorMessage(code) : null);
    return code === null;
  };
  const byNumber = (ids: Id[]) => [...ids].sort((a, b) => (playerById(team, a)?.number ?? 0) - (playerById(team, b)?.number ?? 0));
  const last = match.events.at(-1)!;
  const lastInfo = describeEvent(team, match, last);
  const lastText = last.type === 'kickoff'
    ? 'Last: Kick off'
    : `Last: ${minuteOf(eventTime(match, last))}' ${lastInfo.title}${lastInfo.desc ? ` · ${lastInfo.desc}` : ''}`;

  // A second tap within 1.5 s of a whistle is ignored, so a double tap can't skip the break.
  const lastWhistle = [...match.events].reverse().find((e) => e.type !== 'sub' && e.type !== 'goal');
  const justBlown = lastWhistle !== undefined && 'at' in lastWhistle && now - lastWhistle.at < 1500;
  const periodButton = () => {
    if (d.period === 'first') act({ type: 'match/period', period: 'halftime' });
    else if (d.period === 'halftime') act({ type: 'match/period', period: 'secondhalf' });
    else setConfirm({
      question: 'End the match?', yes: 'End match', no: 'Keep playing',
      onYes: () => { if (act({ type: 'match/period', period: 'fulltime' })) props.nav.go({ name: 'fulltime', matchId: match.id }); },
    });
  };
  const undo = () => {
    if (last.type === 'kickoff') {
      setConfirm({ question: 'Cancel this match? Nothing from it will be kept.', yes: 'Cancel match', no: 'Keep it', danger: true, onYes: () => { if (act({ type: 'match/undo' })) props.nav.go({ name: 'pick' }); } });
    } else {
      act({ type: 'match/undo' });
    }
  };

  return (
    <>
      <header className="live-head">
        <div className="scoreline">
          <span className="us">{team.name}</span>
          <span className="score" aria-label={`Score ${d.score.us} to ${d.score.them}`}>{d.score.us} – {d.score.them}</span>
          <span className="them">{match.opposition || 'Opposition'}</span>
        </div>
        <div className="clock-row">
          <div>
            <div className="period" data-testid="period">{PERIOD_LABEL[d.period]}</div>
            <div className="match-clock" data-testid="match-clock">{formatClock(d.clockMs)}</div>
          </div>
          <button type="button" className="period-btn" disabled={justBlown} onClick={periodButton}>
            {d.period === 'first' ? 'Half time' : d.period === 'halftime' ? 'Start 2nd half' : 'Full time'}
          </button>
        </div>
      </header>
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        <PlayerSection team={team} label="On the pitch" hint={d.period === 'halftime' ? 'clocks stopped' : 'clocks running'} ids={byNumber(d.onPitch)} playedMs={d.playedMs} tone="pitch" />
        <PlayerSection team={team} label="Bench" hint="least played first" ids={d.bench} playedMs={d.playedMs} tone="bench" />
        <div className="last-strip">
          <button type="button" className="last" data-testid="last-entry" onClick={() => props.nav.go({ name: 'log', matchId: match.id })}>{lastText}</button>
          <button type="button" className="link-btn" onClick={undo}>Undo</button>
        </div>
      </main>
      <div className="bottom-bar">
        <button type="button" className="btn dark" onClick={() => props.nav.go({ name: 'sub' })}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h13M12 3l4 4-4 4M17 13H4M8 9l-4 4 4 4" /></svg>
          Sub
        </button>
        <button type="button" className="btn primary" disabled={d.period === 'halftime'} onClick={() => props.nav.go({ name: 'goal', t: d.clockMs })}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
          Goal
        </button>
      </div>
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export function PlayerSection(props: { team: Team; label: string; hint: string; ids: Id[]; playedMs: Record<Id, number>; tone: 'pitch' | 'bench' }): ReactElement {
  const title = `${props.label} · ${props.ids.length}`;
  return (
    <section className="section" aria-label={title}>
      <div className="section-head">
        <h2 className="label">{title}</h2>
        <span className="hint">{props.hint}</span>
      </div>
      <div className="grid">
        {props.ids.map((id) => {
          const p = playerById(props.team, id);
          return <PlayerCard key={id} number={p?.number ?? 0} name={p?.name ?? 'Unknown'} clock={formatClock(props.playedMs[id] ?? 0)} tone={props.tone} />;
        })}
      </div>
    </section>
  );
}
