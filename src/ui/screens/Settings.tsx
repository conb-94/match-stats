import { useContext, useState, type ReactElement } from 'react';
import { ClockContext, useAppState, useStore } from '../../state/store.ts';
import { activeTeam, squad } from '../../state/selectors.ts';
import type { Action } from '../../state/reducer.ts';
import { exportBackup, parseBackup } from '../../state/backup.ts';
import { FORMATS, type AppState, type Format, type Player, type Team } from '../../domain/types.ts';
import type { Nav } from '../nav.ts';
import { Header } from '../components/Header.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { Confirm, type ConfirmRequest } from '../components/Confirm.tsx';
import { errorMessage } from '../messages.ts';

type Mode = { kind: 'main' } | { kind: 'newTeam' } | { kind: 'player'; player: Player | null };

export function Settings(_props: { nav: Nav }): ReactElement {
  const state = useAppState();
  const store = useStore();
  const clock = useContext(ClockContext);
  const team = activeTeam(state);
  const [mode, setMode] = useState<Mode>({ kind: 'main' });
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const act = (action: Action): boolean => {
    const code = store.dispatch(action);
    setError(code ? errorMessage(code) : null);
    return code === null;
  };
  const back = () => { setError(null); setMode({ kind: 'main' }); };

  let body: ReactElement;
  if (!team || mode.kind === 'newTeam') {
    body = <NewTeamForm first={!team} onCreate={(name, format) => act({ type: 'team/create', name, format }) && back()} onCancel={team ? back : undefined} />;
  } else if (mode.kind === 'player') {
    body = (
      <PlayerForm
        player={mode.player}
        onSave={(number, name) => {
          const ok = mode.player
            ? act({ type: 'player/edit', playerId: mode.player.id, number, name })
            : act({ type: 'player/add', number, name });
          if (ok) back();
        }}
        onRemove={mode.player ? () => {
          const player = mode.player!;
          setConfirm({ question: `Remove ${player.name} from the squad?`, yes: 'Remove', danger: true, onYes: () => { if (act({ type: 'player/remove', playerId: player.id })) back(); } });
        } : undefined}
        onCancel={back}
      />
    );
  } else {
    body = (
      <TeamSettings
        state={state}
        team={team}
        act={act}
        onNewTeam={() => { setError(null); setMode({ kind: 'newTeam' }); }}
        onPlayer={(player) => { setError(null); setMode({ kind: 'player', player }); }}
        onBackUp={() => backUp(state, clock.now())}
        onRestoreText={(text) => {
          const parsed = parseBackup(text);
          if (!parsed.ok) { setError('That file is not a Match Stats backup.'); return; }
          setError(null);
          setConfirm({ question: 'Replace everything on this phone with this backup?', yes: 'Replace', danger: true, onYes: () => { act({ type: 'state/replace', state: parsed.state }); } });
        }}
        onNewSeason={() => setConfirm({
          question: 'Start a new season? This season is kept and can still be viewed.',
          yes: 'Start new season',
          onYes: () => { act({ type: 'season/startNew' }); },
        })}
      />
    );
  }

  return (
    <>
      <Header title="Settings" subtitle="Saved on this phone · works offline" />
      <main className="screen-body">
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {body}
      </main>
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

function FormatPicker(props: { value: Format | null; onPick: (f: Format) => void }): ReactElement {
  return (
    <div className="formats">
      {FORMATS.map((f) => (
        <button key={f} type="button" className="format" aria-label={`${f} a side`} aria-pressed={props.value === f} onClick={() => props.onPick(f)}>
          <span className="n" aria-hidden="true">{f}</span>
          <span className="a" aria-hidden="true">a side</span>
        </button>
      ))}
    </div>
  );
}

function NewTeamForm(props: { first: boolean; onCreate: (name: string, format: Format) => void; onCancel?: () => void }): ReactElement {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<Format>(7);
  return (
    <section className="panel" aria-label={props.first ? 'Create your team' : 'New team'}>
      <h2 className="label">{props.first ? 'Create your team' : 'New team'}</h2>
      <div className="field">
        <label htmlFor="new-team-name">Team name</label>
        <input id="new-team-name" className="input" value={name} maxLength={30} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">Format</span>
        <FormatPicker value={format} onPick={setFormat} />
      </div>
      <button type="button" className="btn primary" onClick={() => props.onCreate(name, format)}>Create team</button>
      {props.onCancel ? <button type="button" className="btn outline" onClick={props.onCancel}>Cancel</button> : null}
    </section>
  );
}

function PlayerForm(props: { player: Player | null; onSave: (number: number, name: string) => void; onRemove?: () => void; onCancel: () => void }): ReactElement {
  const [number, setNumber] = useState(props.player ? String(props.player.number) : '');
  const [name, setName] = useState(props.player?.name ?? '');
  const save = () => props.onSave(number.trim() === '' ? 0 : Number(number), name);
  return (
    <section className="panel" aria-label={props.player ? 'Edit player' : 'Add player'}>
      <h2 className="label">{props.player ? 'Edit player' : 'Add player'}</h2>
      <div className="field">
        <label htmlFor="player-number">Shirt number</label>
        <input id="player-number" className="input" inputMode="numeric" value={number} maxLength={3} autoComplete="off" onChange={(e) => setNumber(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="player-name">Name</label>
        <input id="player-name" className="input" value={name} maxLength={20} autoComplete="off" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
      </div>
      <button type="button" className="btn primary" onClick={save}>Save</button>
      {props.onRemove ? <button type="button" className="btn danger" onClick={props.onRemove}>Remove</button> : null}
      <button type="button" className="btn outline" onClick={props.onCancel}>Cancel</button>
    </section>
  );
}

function TeamSettings(props: {
  state: AppState;
  team: Team;
  act: (a: Action) => boolean;
  onNewTeam: () => void;
  onPlayer: (p: Player | null) => void;
  onBackUp: () => void;
  onRestoreText: (text: string) => void;
  onNewSeason: () => void;
}): ReactElement {
  const { team, act } = props;
  const players = squad(team);
  return (
    <>
      <section className="section">
        <label className="label" htmlFor="team-pick">Team</label>
        <div className="row">
          <select id="team-pick" className="select" value={team.id} onChange={(e) => act({ type: 'team/select', teamId: e.target.value })}>
            {props.state.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" className="btn outline small" onClick={props.onNewTeam}>New team</button>
        </div>
        <p className="hint">Each team keeps its own squad, format, matches and season totals.</p>
      </section>

      <TeamNameField key={team.id} name={team.name} onRename={(name) => act({ type: 'team/rename', name })} />

      <section className="section">
        <span className="label">Format</span>
        <FormatPicker value={team.format} onPick={(format) => act({ type: 'team/setFormat', format })} />
        <p className="hint">{team.format} on the pitch at a time. Everyone else starts on the bench.</p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="label">Squad · {players.length}</h2>
          <span className="hint">tap a player to edit</span>
        </div>
        <div className="grid squad">
          {players.map((p) => <PlayerCard key={p.id} number={p.number} name={p.name} tone="pitch" onClick={() => props.onPlayer(p)} />)}
          <button type="button" className="extra-btn" onClick={() => props.onPlayer(null)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            Add player
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="label">Your data</h2>
        <p className="hint">Everything is saved on this phone only. Back up now and then, and before changing phones.</p>
        <div className="grid">
          <button type="button" className="btn outline small" onClick={props.onBackUp}>Back up</button>
          <label className="btn outline small file-btn">
            Restore
            <input
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) props.onRestoreText(await file.text());
                input.value = '';
              }}
            />
          </label>
        </div>
        <button type="button" className="btn outline small" onClick={props.onNewSeason}>Start new season</button>
      </section>
    </>
  );
}

function TeamNameField(props: { name: string; onRename: (name: string) => void }): ReactElement {
  const [value, setValue] = useState(props.name);
  const commit = () => { if (value.trim() !== props.name) props.onRename(value); };
  return (
    <section className="field">
      <label htmlFor="team-name">Team name</label>
      <input id="team-name" className="input" value={value} maxLength={30} autoComplete="off" onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} />
    </section>
  );
}

async function backUp(state: AppState, now: number): Promise<void> {
  const { filename, text } = exportBackup(state, now);
  const file = new File([text], filename, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Match Stats backup' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
