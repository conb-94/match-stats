import { useState, type ReactElement } from 'react';
import { useAppState, useNow, useStore } from '../../state/store.ts';
import { activeTeam, currentSeason, findMatch, liveMatch, playerById } from '../../state/selectors.ts';
import { clockMs, formatClock, period } from '../../domain/clock.ts';
import { lineupAt } from '../../domain/derive.ts';
import type { GoalEvent, Id, Match, MatchEvent, SubEvent, Team } from '../../domain/types.ts';
import type { Action } from '../../state/reducer.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';
import { SubPicker } from '../components/SubPicker.tsx';
import { GoalPicker, goalPlayers, goalReady, type GoalChoice } from '../components/GoalPicker.tsx';
import { Confirm, type ConfirmRequest } from '../components/Confirm.tsx';
import { describeEvent, eventTime } from '../describe.ts';
import { errorMessage } from '../messages.ts';

type Editing = { id: Id; mode: 'actions' | 'players' | 'time' | 'clock' } | null;

export function MatchLog(props: { nav: Nav; matchId: Id }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const team = activeTeam(state)!;
  const match = findMatch(team, props.matchId);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const finished = match ? period(match) === 'finished' : true;
  const close = () => props.nav.go(match && finished ? { name: 'fulltime', matchId: match.id } : match ? { name: 'live' } : { name: 'pick' });
  if (!match) return <main className="screen-body" />;

  const act = (action: Action): boolean => {
    const code = store.dispatch(action);
    setError(code ? errorMessage(code) : null);
    return code === null;
  };
  const done = (action: Action) => { if (act(action)) setEditing(null); };

  const entries = match.events
    .map((e, i) => ({ e, i, t: eventTime(match, e) }))
    .sort((a, b) => b.t - a.t || b.i - a.i);

  const actionsFor = (e: MatchEvent): ReactElement => {
    if (e.type === 'sub' || e.type === 'goal') {
      return (
        <div className="entry-actions">
          <button type="button" className="btn outline small" onClick={() => setEditing({ id: e.id, mode: 'players' })}>Change players</button>
          <button type="button" className="btn outline small" onClick={() => setEditing({ id: e.id, mode: 'time' })}>Change time</button>
          <button type="button" className="btn danger small" onClick={() => setConfirm({
            question: 'Delete this entry?', yes: 'Delete', danger: true,
            onYes: () => done({ type: 'match/deleteEvent', matchId: match.id, eventId: e.id }),
          })}>Delete</button>
        </div>
      );
    }
    if (e.type === 'halftime') {
      return <button type="button" className="btn outline small" onClick={() => setEditing({ id: e.id, mode: 'time' })}>Change time</button>;
    }
    if (e.type === 'fulltime') {
      const latest = currentSeason(team).matches.at(-1)?.id === match.id && !liveMatch(team);
      return (
        <div className="grid">
          <button type="button" className="btn outline small" onClick={() => setEditing({ id: e.id, mode: 'time' })}>Change time</button>
          {latest ? (
            <button type="button" className="btn outline small" onClick={() => setConfirm({
              question: 'Reopen this match? Its clocks carry on as if full time was never blown.', yes: 'Reopen',
              onYes: () => { if (act({ type: 'match/reopen', matchId: match.id })) props.nav.go({ name: 'live' }); },
            })}>Reopen match</button>
          ) : null}
        </div>
      );
    }
    if (e.type === 'kickoff') {
      return (
        <div className="grid">
          <button type="button" className="btn outline small" onClick={() => setEditing({ id: e.id, mode: 'clock' })}>Change time</button>
          <button type="button" className="btn danger small" onClick={() => setConfirm({
            question: 'Delete this whole match?', yes: 'Delete match', danger: true,
            onYes: () => { if (act({ type: 'match/discard', matchId: match.id })) props.nav.go({ name: 'season' }); },
          })}>Discard match</button>
        </div>
      );
    }
    if (e.type === 'secondhalf') {
      return <button type="button" className="btn outline small" onClick={() => setEditing({ id: e.id, mode: 'clock' })}>Change time</button>;
    }
    return <></>;
  };

  return (
    <>
      <Header
        title="Match log"
        subtitle={finished ? `Saved match${match.opposition ? ` v ${match.opposition}` : ''}` : `${formatClock(clockMs(match, now))} · tap an entry to fix it`}
        onClose={close}
        closeLabel="Close match log"
      />
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        <div className="section-head">
          <h2 className="label">Everything logged</h2>
          <span className="hint">newest first</span>
        </div>
        {entries.map(({ e, t }) => {
          const info = describeEvent(team, match, e);
          const open = editing?.id === e.id;
          return (
            <div key={e.id} className={`entry ${open ? 'open' : ''}`}>
              <button type="button" className="entry-main" aria-expanded={open} onClick={() => { setError(null); setEditing(open ? null : { id: e.id, mode: 'actions' }); }}>
                <span className="time">{formatClock(t)}</span>
                <span className="what">
                  <span className={`title ${e.type === 'goal' ? 'goal' : ''}`}>{info.title}</span>
                  {info.desc ? <span className="desc">{info.desc}</span> : null}
                </span>
              </button>
              {open && editing!.mode === 'actions' ? actionsFor(e) : null}
              {open && editing!.mode === 'time' ? (
                <TimeForm initial={t} onCancel={() => setEditing(null)} onSave={(ms) => done({ type: 'match/editEvent', matchId: match.id, eventId: e.id, patch: { t: ms } })} />
              ) : null}
              {open && editing!.mode === 'clock' && 'at' in e ? (
                <ClockForm at={e.at} onCancel={() => setEditing(null)} onSave={(at) => done({ type: 'match/editEvent', matchId: match.id, eventId: e.id, patch: { at } })} />
              ) : null}
              {open && editing!.mode === 'players' && e.type === 'sub' ? (
                <SubEdit team={team} match={match} event={e} onCancel={() => setEditing(null)} onSave={(offId, onId) => done({ type: 'match/editEvent', matchId: match.id, eventId: e.id, patch: { offId, onId } })} />
              ) : null}
              {open && editing!.mode === 'players' && e.type === 'goal' ? (
                <GoalEdit team={team} match={match} event={e} onCancel={() => setEditing(null)} onSave={(c) => done({ type: 'match/editEvent', matchId: match.id, eventId: e.id, patch: goalPlayers(c) })} />
              ) : null}
            </div>
          );
        })}
      </main>
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Moves a whistle to a new time of day, on the same day it was blown. */
function ClockForm(props: { at: number; onSave: (at: number) => void; onCancel: () => void }): ReactElement {
  const d = new Date(props.at);
  const [value, setValue] = useState(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
  const save = () => {
    const [h, m, sec] = value.split(':').map((x) => Number(x) || 0);
    const next = new Date(props.at);
    next.setHours(h, m, sec ?? 0, 0);
    props.onSave(next.getTime());
  };
  return (
    <>
      <div className="field">
        <label htmlFor="edit-clock">Time of day</label>
        <input id="edit-clock" className="input" type="time" step="1" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <p className="hint">Entries after it move with it, so play time stays right.</p>
      <div className="grid">
        <button type="button" className="btn outline small" onClick={props.onCancel}>Cancel</button>
        <button type="button" className="btn primary small" onClick={save}>Save</button>
      </div>
    </>
  );
}

function TimeForm(props: { initial: number; onSave: (ms: number) => void; onCancel: () => void }): ReactElement {
  const [minutes, setMinutes] = useState(String(Math.floor(props.initial / 60_000)));
  const [seconds, setSeconds] = useState(String(Math.floor((props.initial % 60_000) / 1000)));
  const save = () => props.onSave((Number(minutes) || 0) * 60_000 + Math.min(59, Number(seconds) || 0) * 1000);
  return (
    <>
      <div className="time-form">
        <div className="field">
          <label htmlFor="edit-minutes">Minutes</label>
          <input id="edit-minutes" className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="edit-seconds">Seconds</label>
          <input id="edit-seconds" className="input" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </div>
      </div>
      <div className="grid">
        <button type="button" className="btn outline small" onClick={props.onCancel}>Cancel</button>
        <button type="button" className="btn primary small" onClick={save}>Save</button>
      </div>
    </>
  );
}

const byNumber = (team: Team) => (a: Id, b: Id) => (playerById(team, a)?.number ?? 0) - (playerById(team, b)?.number ?? 0);

function SubEdit(props: { team: Team; match: Match; event: SubEvent; onSave: (offId: Id, onId: Id) => void; onCancel: () => void }): ReactElement {
  const before = lineupAt(props.match, props.event.t, props.event.id);
  const [off, setOff] = useState<Id | null>(props.event.offId);
  const [on, setOn] = useState<Id | null>(props.event.onId);
  return (
    <>
      <SubPicker team={props.team} onPitch={[...before.onPitch].sort(byNumber(props.team))} bench={[...before.bench].sort(byNumber(props.team))}
        off={off} on={on} onPickOff={setOff} onPickOn={setOn} />
      <div className="grid">
        <button type="button" className="btn outline small" onClick={props.onCancel}>Cancel</button>
        <button type="button" className="btn primary small" disabled={!off || !on} onClick={() => off && on && props.onSave(off, on)}>Save</button>
      </div>
    </>
  );
}

function GoalEdit(props: { team: Team; match: Match; event: GoalEvent; onSave: (c: GoalChoice) => void; onCancel: () => void }): ReactElement {
  const onPitch = lineupAt(props.match, props.event.t + 1).onPitch.sort(byNumber(props.team));
  const e = props.event;
  const [choice, setChoice] = useState<GoalChoice>({ side: e.side, scorerId: e.scorerId, assistId: e.assistId, ownGoal: e.ownGoal });
  return (
    <>
      <GoalPicker team={props.team} onPitch={onPitch} value={choice} onChange={setChoice} />
      <div className="grid">
        <button type="button" className="btn outline small" onClick={props.onCancel}>Cancel</button>
        <button type="button" className="btn primary small" disabled={!goalReady(choice)} onClick={() => props.onSave(choice)}>Save</button>
      </div>
    </>
  );
}
