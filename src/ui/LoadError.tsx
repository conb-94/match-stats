import type { ReactElement } from 'react';
import { Header } from './components/Header.tsx';

/** Shown when saved data can't be read. Nothing can be saved from here, so nothing is overwritten. */
export function LoadError(props: { onRetry: () => void }): ReactElement {
  return (
    <div className="screen">
      <Header title="Match Stats" />
      <main className="screen-body">
        <div className="alert" role="alert">Couldn't open your saved teams and matches.</div>
        <p className="hint">Nothing has been changed. Try again, or close the app fully and open it again.</p>
      </main>
      <div className="bottom-bar single">
        <button type="button" className="btn primary" onClick={props.onRetry}>Try again</button>
      </div>
    </div>
  );
}
