import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { IPC } from '../shared/ipc-channels';
import { settingsStore, diagnoseApiKey, clearApiKey } from './settings-store';
import { aiRoute, listModels } from './ai-router';
import { generateLyrics } from './lyrics-pipeline';
import {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getLastUpdateState
} from './auto-updater';
import { songsStore } from './songs-store';
import { generateFusion, listTemplates } from './fusion-pipeline';
import type {
  AIRouteRequest,
  LyricsRequest,
  LyricsPipelineResult,
  SongProject,
  FusionData,
  FusionGenerateRequest
} from '../shared/types';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Hirsch Music Hit Maker',
    backgroundColor: '#0e0f12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,        // Sicherheit: harte Trennung Renderer ↔ Node
      nodeIntegration: false,        // Sicherheit: kein Node im Renderer
      sandbox: false,                // wir brauchen Preload mit Node-APIs
      devTools: isDev
    }
  });

  // Externe Links → System-Browser, nicht im App-Fenster
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// === IPC-Handler ===

function registerIpc() {
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion());

  ipcMain.handle(IPC.SETTINGS_GET, (_e, key: string) => settingsStore.get(key));
  ipcMain.handle(IPC.SETTINGS_SET, (_e, key: string, value: unknown) => {
    settingsStore.set(key, value);
    return true;
  });
  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => settingsStore.getAll());
  ipcMain.handle(IPC.SETTINGS_DIAGNOSE_KEY, () => diagnoseApiKey());
  ipcMain.handle(IPC.SETTINGS_CLEAR_KEY, () => { clearApiKey(); return true; });
  ipcMain.handle(IPC.SETTINGS_TEST_KEY, async () => {
    // Schneller Live-Test gegen OpenRouter — Models-Endpoint braucht keine Credits.
    const key = settingsStore.get('openrouterApiKey') as string;
    if (!key) return { ok: false, error: 'Kein Key gespeichert' };
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal
      });
      clearTimeout(t);
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
      }
      const data = await res.json() as { data?: { label?: string; usage?: number; limit?: number | null } };
      return {
        ok: true,
        label: data.data?.label ?? 'unbenannt',
        usage: data.data?.usage ?? 0,
        limit: data.data?.limit ?? null
      };
    } catch (err) {
      const msg = err instanceof Error ? (err.name === 'AbortError' ? 'Timeout' : err.message) : String(err);
      return { ok: false, error: msg };
    }
  });

  ipcMain.handle(IPC.AI_LIST_MODELS, () => listModels());
  ipcMain.handle(IPC.AI_ROUTE, async (_e, req: AIRouteRequest) => aiRoute(req));

  ipcMain.handle(IPC.LYRICS_GENERATE, async (_e, req: LyricsRequest) => generateLyrics(req));

  ipcMain.handle(IPC.UPDATE_CHECK, async () => {
    await checkForUpdates();
    return getLastUpdateState();
  });
  ipcMain.handle(IPC.UPDATE_DOWNLOAD, async () => {
    await downloadUpdate();
    return getLastUpdateState();
  });
  ipcMain.handle(IPC.UPDATE_INSTALL, () => {
    quitAndInstall();
    return true;
  });

  // Songs
  ipcMain.handle(IPC.SONGS_LIST, () => songsStore.list());
  ipcMain.handle(IPC.SONGS_GET, (_e, id: string) => songsStore.get(id));
  ipcMain.handle(IPC.SONGS_CREATE, (_e, args: { request: LyricsRequest; result: LyricsPipelineResult; title?: string }) =>
    songsStore.create(args)
  );
  ipcMain.handle(IPC.SONGS_UPDATE, (_e, id: string, patch: Partial<SongProject>) =>
    songsStore.update(id, patch)
  );
  ipcMain.handle(IPC.SONGS_DELETE, (_e, id: string) => songsStore.delete(id));
  ipcMain.handle(IPC.SONGS_DUPLICATE, (_e, id: string) => songsStore.duplicate(id));
  ipcMain.handle(IPC.SONGS_EXPORT_TXT, (_e, id: string) => songsStore.exportTxt(id, mainWindow));
  ipcMain.handle(IPC.SONGS_EXPORT_BACKUP, () => songsStore.exportBackup(mainWindow));
  ipcMain.handle(IPC.SONGS_IMPORT_BACKUP, () => songsStore.importBackup(mainWindow));

  // Fusion (T06)
  ipcMain.handle(IPC.FUSION_TEMPLATES, () => listTemplates());
  ipcMain.handle(IPC.FUSION_GENERATE, async (_e, req: FusionGenerateRequest) => {
    const song = songsStore.get(req.songId);
    if (!song) throw new Error('Song nicht gefunden');
    const fusion = await generateFusion(song, req);
    songsStore.saveFusion(req.songId, fusion);
    return fusion;
  });
  ipcMain.handle(IPC.FUSION_SAVE, (_e, id: string, fusion: FusionData) =>
    songsStore.saveFusion(id, fusion)
  );
  ipcMain.handle(IPC.FUSION_EXPORT_TXT, (_e, id: string) => songsStore.exportFusionTxt(id, mainWindow));
}

// === App Lifecycle ===

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  if (mainWindow) initAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
