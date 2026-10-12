import { createRoot } from 'react-dom/client';
import './ui/theme.css';
import { App } from './ui/App.tsx';
import { LoadError } from './ui/LoadError.tsx';
import { loadState, saveState } from './state/storage.ts';
import { ClockContext, createStore, StoreContext, type Clock } from './state/store.ts';

const clock: Clock = { now: () => Date.now() };
const root = createRoot(document.getElementById('root')!);

async function start(): Promise<void> {
  let state;
  try {
    state = await loadState();
  } catch {
    // Never start empty: a store that could save would write over the coach's data.
    root.render(<LoadError onRetry={() => void start()} />);
    return;
  }
  navigator.storage?.persist?.().catch(() => undefined);
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const store = createStore(state, saveState, clock, newId);
  root.render(
    <StoreContext.Provider value={store}>
      <ClockContext.Provider value={clock}>
        <App />
      </ClockContext.Provider>
    </StoreContext.Provider>,
  );
}

void start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
