import type { ReactElement } from 'react';
import type { Id, Side, Team } from '../../domain/types.ts';
import { playerById } from '../../state/selectors.ts';
import { PlayerCard } from './PlayerCard.tsx';

export interface GoalChoice { side: Side; scorerId: Id | null; assistId: Id | null; ownGoal: boolean }

export const emptyGoal: GoalChoice = { side: 'us', scorerId: null, assistId: null, ownGoal: false };

/** A goal can be confirmed once it is the opposition's, an own goal, or has a scorer. */
export const goalReady = (c: GoalChoice): boolean => c.side === 'them' || c.ownGoal || c.scorerId !== null;

/** The goal as it will be saved: opposition and own goals carry no players. */
export function goalPlayers(c: GoalChoice): GoalChoice {
  if (c.side === 'them') return { side: 'them', scorerId: null, assistId: null, ownGoal: false };
  if (c.ownGoal) return { side: 'us', scorerId: null, assistId: null, ownGoal: true };
  return { ...c, assistId: c.assistId === c.scorerId ? null : c.assistId };
}

/** Your team / Opposition, then who scored and who assisted, from the players on the pitch. */
export function GoalPicker(props: { team: Team; onPitch: Id[]; value: GoalChoice; onChange: (c: GoalChoice) => void }): ReactElement {
  const { team, value: c, onChange } = props;
  const player = (id: Id) => playerById(team, id);
  return (
    <>
      <div className="segmented">
        <button type="button" aria-pressed={c.side === 'us'} onClick={() => onChange({ ...c, side: 'us' })}>Your team</button>
        <button type="button" aria-pressed={c.side === 'them'} onClick={() => onChange({ ...c, side: 'them' })}>Opposition</button>
      </div>
      {c.side === 'us' ? (
        <section className="section">
          <div className="section-head">
            <h2 className="label">1. Who scored</h2>
            <span className="hint">on the pitch</span>
          </div>
          <div className="grid" role="group" aria-label="Who scored">
            {props.onPitch.map((id) => {
              const chosen = !c.ownGoal && c.scorerId === id;
              return (
                <PlayerCard key={id} number={player(id)?.number ?? 0} name={player(id)?.name ?? 'Unknown'}
                  tone={chosen ? 'selected-green' : 'pitch'} badge={chosen ? 'GOAL' : undefined} pressed={chosen}
                  onClick={() => onChange({ ...c, ownGoal: false, scorerId: id, assistId: c.assistId === id ? null : c.assistId })} />
              );
            })}
            <button type="button" className={`extra-btn ${c.ownGoal ? 'chosen' : ''}`} aria-pressed={c.ownGoal}
              onClick={() => onChange({ ...c, ownGoal: true, scorerId: null, assistId: null })}>Own goal</button>
          </div>
        </section>
      ) : null}
      {c.side === 'us' && !c.ownGoal ? (
        <section className="section">
          <div className="section-head">
            <h2 className="label">2. Assist</h2>
            <span className="hint">skip it if there wasn't one</span>
          </div>
          <div className="grid" role="group" aria-label="Assist">
            {props.onPitch.map((id) => {
              const isScorer = c.scorerId === id;
              const chosen = c.assistId === id;
              return (
                <PlayerCard key={id} number={player(id)?.number ?? 0} name={player(id)?.name ?? 'Unknown'}
                  tone={isScorer ? 'disabled' : chosen ? 'selected-ink' : 'pitch'} badge={isScorer ? 'scorer' : chosen ? 'ASSIST' : undefined}
                  pressed={chosen} onClick={() => onChange({ ...c, assistId: id })} />
              );
            })}
            <button type="button" className={`extra-btn ${c.assistId === null ? 'chosen' : ''}`} aria-pressed={c.assistId === null}
              onClick={() => onChange({ ...c, assistId: null })}>No assist</button>
          </div>
        </section>
      ) : null}
    </>
  );
}
