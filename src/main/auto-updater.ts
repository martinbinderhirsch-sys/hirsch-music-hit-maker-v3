import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { UpdateState } from '../shared/types';

// Auto-Updater via electron-updater + GitHub Releases.
// Konfiguration kommt aus package.json → build.publish.

let mainWin: BrowserWindow | null = null;
let lastState: UpdateState = { phase: 'idle' };

function emit(state: UpdateState) {
  lastState = state;
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send(IPC.UPDATE_STATUS, state);
  }
}

export function getLastUpdateState(): UpdateState {
  return lastState;
}

export function initAutoUpdater(window: BrowserWindow) {
  mainWin = window;

  // Wir laden NICHT automatisch herunter — der Nutzer entscheidet.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;   // wir taggen aktuell als prerelease

  autoUpdater.on('checking-for-update', () => emit({ phase: 'checking' }));

  autoUpdater.on('update-available', (info) => {
    emit({
      phase: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    });
  });

  autoUpdater.on('update-not-available', () => {
    emit({ phase: 'not-available', currentVersion: app.getVersion() });
  });

  autoUpdater.on('download-progress', (p) => {
    emit({
      phase: 'downloading',
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    emit({ phase: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    emit({ phase: 'error', message: err?.message ?? String(err) });
  });

  // Beim Start einmal automatisch prüfen (still — kein Popup), nach 3 s.
  if (!app.isPackaged) {
    // im Dev-Modus überspringen, da electron-updater dort i.d.R. fehlschlägt
    return;
  }
  setTimeout(() => {
    checkForUpdates().catch(() => {/* schon via 'error'-Event reportet */});
  }, 3000);
}

export async function checkForUpdates() {
  if (!app.isPackaged) {
    emit({ phase: 'error', message: 'Update-Check nur in installierter App verfügbar.' });
    return;
  }
  await autoUpdater.checkForUpdates();
}

export async function downloadUpdate() {
  await autoUpdater.downloadUpdate();
}

export function quitAndInstall() {
  // isSilent: false (Installer-Wizard zeigen), isForceRunAfter: true (App neu starten)
  autoUpdater.quitAndInstall(false, true);
}
