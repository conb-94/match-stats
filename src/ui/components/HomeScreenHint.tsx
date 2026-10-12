import { useState, type ReactElement } from 'react';
import { needsHomeScreenHint } from '../install.ts';

const KEY = 'match-stats/hide-home-screen-hint';

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(KEY) === '1') return false;
  } catch { /* storage unavailable: still show the hint */ }
  const nav = navigator as Navigator & { standalone?: boolean };
  return needsHomeScreenHint(
    { userAgent: nav.userAgent, platform: nav.platform, maxTouchPoints: nav.maxTouchPoints, standalone: nav.standalone },
    window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  );
}

/** Tells iPhone users in Safari to add the app to the Home Screen before setting up. */
export function HomeScreenHint(): ReactElement | null {
  const [show, setShow] = useState(shouldShow);
  if (!show) return null;
  const hide = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };
  return (
    <div className="hint-banner" role="note">
      <p>
        <strong>Add Match Stats to your Home Screen first.</strong> On iPhone, teams set up here in Safari are kept
        separate from the Home Screen app. Tap Share, then Add to Home Screen, and use it from there.
      </p>
      <button type="button" className="link-btn" onClick={hide}>Got it</button>
    </div>
  );
}
