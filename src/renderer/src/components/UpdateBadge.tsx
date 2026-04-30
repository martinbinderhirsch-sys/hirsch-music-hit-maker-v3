import { useEffect, useState } from 'react';
import type { UpdateState } from '../../../shared/types';

export function UpdateBadge() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = window.hirsch.updates.onStatus(setState);
    return () => unsub();
  }, []);

  async function checkNow() {
    setState({ phase: 'checking' });
    await window.hirsch.updates.check();
  }

  async function download() {
    await window.hirsch.updates.download();
  }

  async function install() {
    await window.hirsch.updates.install();
  }

  // Sichtbares Mini-Symbol je nach Phase
  let label = '';
  let dotClass = 'update-dot';
  switch (state.phase) {
    case 'idle':           label = 'Updates prüfen';          break;
    case 'checking':       label = 'Suche nach Updates…';     dotClass += ' pulse'; break;
    case 'available':      label = `Update v${state.version} verfügbar`; dotClass += ' available'; break;
    case 'not-available':  label = `Aktuell (v${state.currentVersion})`; dotClass += ' ok'; break;
    case 'downloading':    label = `Lade herunter… ${state.percent}%`;   dotClass += ' pulse'; break;
    case 'downloaded':     label = `v${state.version} bereit`;           dotClass += ' ready'; break;
    case 'error':          label = 'Update-Fehler';                       dotClass += ' error'; break;
  }

  return (
    <div className="update-badge-wrap">
      <button
        className="update-badge"
        onClick={() => setOpen(o => !o)}
        title={label}
      >
        <span className={dotClass} />
        <span className="update-label">{label}</span>
      </button>

      {open && (
        <div className="update-popover">
          <div className="popover-header">Updates</div>
          <div className="popover-body">
            {state.phase === 'idle' && (
              <button className="btn-primary" onClick={checkNow}>Jetzt prüfen</button>
            )}
            {state.phase === 'checking' && <p>Verbinde mit Release-Feed…</p>}
            {state.phase === 'not-available' && (
              <>
                <p>Du hast bereits die neueste Version (v{state.currentVersion}).</p>
                <button className="btn-secondary" onClick={checkNow}>Erneut prüfen</button>
              </>
            )}
            {state.phase === 'available' && (
              <>
                <p>Version <strong>v{state.version}</strong> ist verfügbar.</p>
                {state.releaseNotes && <pre className="release-notes">{state.releaseNotes}</pre>}
                <button className="btn-primary" onClick={download}>Herunterladen</button>
              </>
            )}
            {state.phase === 'downloading' && (
              <>
                <p>Lade v{(state as any).version ?? ''}…</p>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${state.percent}%` }} />
                </div>
                <p className="muted">{state.percent}% · {(state.transferred / 1e6).toFixed(1)} MB / {(state.total / 1e6).toFixed(1)} MB</p>
              </>
            )}
            {state.phase === 'downloaded' && (
              <>
                <p>v<strong>{state.version}</strong> ist heruntergeladen und bereit.</p>
                <p className="muted">Die App startet beim Installieren neu.</p>
                <button className="btn-primary" onClick={install}>Jetzt installieren &amp; neu starten</button>
              </>
            )}
            {state.phase === 'error' && (
              <>
                <p className="alert-error">{state.message}</p>
                <button className="btn-secondary" onClick={checkNow}>Erneut versuchen</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
