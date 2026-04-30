import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { IPC } from '../shared/ipc-channels';
import { settingsStore } from './settings-store';
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
import type {
  AIRouteRequest,
  LyricsRequest,
  LyricsPipelineResult,
  SongProject
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
