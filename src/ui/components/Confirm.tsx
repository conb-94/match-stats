import type { ReactElement } from 'react';

export interface ConfirmRequest { question: string; yes: string; no?: string; danger?: boolean; onYes: () => void }

/** A bottom-sheet question with two answers. Rendered only while a request is open. */
export function Confirm(props: { request: ConfirmRequest | null; onClose: () => void }): ReactElement | null {
  const r = props.request;
  if (!r) return null;
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-label={r.question}>
        <p>{r.question}</p>
        <div className="actions">
          <button type="button" className="btn outline" onClick={props.onClose}>{r.no ?? 'Cancel'}</button>
          <button
            type="button"
            className={`btn ${r.danger ? 'danger' : 'primary'}`}
            onClick={() => { props.onClose(); r.onYes(); }}
          >
            {r.yes}
          </button>
        </div>
      </div>
    </div>
  );
}
