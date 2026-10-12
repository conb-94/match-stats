import type { ReactElement } from 'react';

export function Header(props: { title: string; subtitle?: string; onClose?: () => void; closeLabel?: string }): ReactElement {
  return (
    <header className="header">
      <div>
        <h1>{props.title}</h1>
        {props.subtitle ? <p className="sub">{props.subtitle}</p> : null}
      </div>
      {props.onClose ? (
        <button type="button" className="icon-btn" aria-label={props.closeLabel ?? 'Close'} onClick={props.onClose}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l10 10M14 4L4 14" /></svg>
        </button>
      ) : null}
    </header>
  );
}
