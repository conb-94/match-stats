import type { ReactElement } from 'react';

export type CardTone = 'pitch' | 'bench' | 'off' | 'selected-ink' | 'selected-green' | 'disabled';

/** A player as a tappable card: shirt-number chip, name, optional clock and badge. Its accessible name is "<number> <name>". */
export function PlayerCard(props: {
  number: number;
  name: string;
  clock?: string;
  tone: CardTone;
  badge?: string;
  onClick?: () => void;
  pressed?: boolean;
}): ReactElement {
  const toneClass = props.tone === 'pitch' ? '' : props.tone;
  return (
    <button
      type="button"
      className={`card ${toneClass}`}
      aria-label={`${props.number} ${props.name}`}
      aria-pressed={props.pressed}
      disabled={props.tone === 'disabled'}
      onClick={props.onClick}
    >
      <span className="chip">{props.number}</span>
      <span className="who">
        <span className="name">{props.name}</span>
        {props.clock !== undefined ? <span className="clock">{props.clock}</span> : null}
      </span>
      {props.badge ? <span className="badge">{props.badge}</span> : null}
    </button>
  );
}
