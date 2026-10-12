import { useState, type ReactElement } from 'react';
import { useAppState, useStore } from '../state/store.ts';
import { activeTeam, liveMatch } from '../state/selectors.ts';
import type { Nav, Screen } from './nav.ts';
import { Settings } from './screens/Settings.tsx';
import { PickTeam } from './screens/PickTeam.tsx';
import { Season } from './screens/Season.tsx';
import { Live } from './screens/Live.tsx';
import { Sub } from './screens/Sub.tsx';
import { Goal } from './screens/Goal.tsx';
import { MatchLog } from './screens/MatchLog.tsx';
import { FullTime } from './screens/FullTime.tsx';
import { KickOff } from './screens/KickOff.tsx';

export type { Nav, Screen } from './nav.ts';

const TABS: { name: 'pick' | 'season' | 'settings'; label: string }[] = [
  { name: 'pick', label: 'New match' },
  { name: 'season', label: 'Season' },
  { name: 'settings', label: 'Settings' },
];

/** Screens allowed while a match is being played. */
const DURING_MATCH = new Set<Screen['name']>(['live', 'sub', 'goal', 'log']);

export function App(props: { initialScreen?: Screen }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const team = activeTeam(state);
  const live = team ? liveMatch(team) : null;
  const [chosen, setChosen] = useState<Screen>(() => props.initialScreen ?? (live ? { name: 'live' } : team ? { name: 'pick' } : { name: 'settings' }));
  const nav: Nav = { go: setChosen };

  let screen: Screen = chosen;
  if (!team) screen = { name: 'settings' };
  else if (live && !DURING_MATCH.has(screen.name)) screen = { name: 'live' };

  const showTabs = screen.name === 'pick' || screen.name === 'season' || screen.name === 'settings';

  return (
    <div className="screen">
      {store.saveFailed() ? <div className="banner" role="status">Could not save. Back up your data in Settings.</div> : null}
      {render(screen, nav)}
      {showTabs && team ? (
        <nav className="tabs" aria-label="Main">
          {TABS.map((tab) => (
            <button key={tab.name} type="button" aria-current={screen.name === tab.name ? 'page' : undefined} onClick={() => setChosen({ name: tab.name })}>
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function render(screen: Screen, nav: Nav): ReactElement {
  switch (screen.name) {
    case 'settings': return <Settings nav={nav} />;
    case 'pick': return <PickTeam nav={nav} draft={screen.draft} />;
    case 'kickoff': return <KickOff nav={nav} draft={screen.draft} />;
    case 'season': return <Season nav={nav} />;
    case 'live': return <Live nav={nav} />;
    case 'sub': return <Sub nav={nav} />;
    case 'goal': return <Goal nav={nav} t={screen.t} />;
    case 'log': return <MatchLog nav={nav} matchId={screen.matchId} />;
    case 'fulltime': return <FullTime nav={nav} matchId={screen.matchId} />;
  }
}
