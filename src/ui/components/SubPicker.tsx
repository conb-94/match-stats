import type { ReactElement } from 'react';
import { formatClock } from '../../domain/clock.ts';
import type { Id, Team } from '../../domain/types.ts';
import { playerById } from '../../state/selectors.ts';
import { playerLabel } from '../describe.ts';
import { PlayerCard } from './PlayerCard.tsx';

/** Two pick lists: who comes off (from the pitch) and who goes on (from the bench), plus a summary line. */
export function SubPicker(props: {
  team: Team;
  onPitch: Id[];
  bench: Id[];
  playedMs?: Record<Id, number>;
  off: Id | null;
  on: Id | null;
  onPickOff: (id: Id) => void;
  onPickOn: (id: Id) => void;
}): ReactElement {
  const { team } = props;
  const clock = (id: Id) => (props.playedMs ? formatClock(props.playedMs[id] ?? 0) : undefined);
  const card = (id: Id, chosen: boolean, list: 'off' | 'on') => {
    const p = playerById(team, id);
    return (
      <PlayerCard
        key={id}
        number={p?.number ?? 0}
        name={p?.name ?? 'Unknown'}
        clock={clock(id)}
        tone={chosen ? (list === 'off' ? 'selected-ink' : 'selected-green') : list === 'off' ? 'pitch' : 'bench'}
        badge={chosen ? (list === 'off' ? 'OFF' : 'ON') : undefined}
        pressed={chosen}
        onClick={() => (list === 'off' ? props.onPickOff(id) : props.onPickOn(id))}
      />
    );
  };
  return (
    <>
      <section className="section">
        <div className="section-head">
          <h2 className="label">1. Coming off</h2>
          <span className="hint">on the pitch</span>
        </div>
        <div className="grid" role="group" aria-label="Coming off">
          {props.onPitch.map((id) => card(id, props.off === id, 'off'))}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2 className="label">2. Coming on</h2>
          <span className="hint">bench, least played first</span>
        </div>
        {props.bench.length === 0 ? <p className="hint">Nobody on the bench.</p> : null}
        <div className="grid" role="group" aria-label="Coming on">
          {props.bench.map((id) => card(id, props.on === id, 'on'))}
        </div>
      </section>
      {props.off && props.on ? (
        <div className="summary" data-testid="sub-summary">{playerLabel(team, props.off)} off → {playerLabel(team, props.on)} on</div>
      ) : null}
    </>
  );
}
