/**
 * HIRSCH MUSIC HIT MAKER — Haupt-Prozess (Main Process)
 * ======================================================
 * Einstiegspunkt der Electron-App.
 * Verantwortlich für:
 *   - Fenster-Erstellung
 *   - Auto-Updater
 *   - TopMediai CORS-Proxy (Port 5001)
 *   - App-Menü
 *   - IPC-Bridge (Main ↔ Renderer)
 */

'use strict';

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path   = require('path');
const fs     = require('fs');
const http   = require('http');
const https  = require('https');

// ─── GPU-Flags (Windows-Kompatibilität) ──────────────────────────
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');

// ─── Pfade ────────────────────────────────────────────────────────
const APP_VERSION  = app.getVersion();
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const HTML_FILE    = path.join(RENDERER_DIR, 'index.html');

// ─── Auto-Updater ─────────────────────────────────────────────────
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload         = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available',  (info) => sendToRenderer('update-available',  info));
autoUpdater.on('update-downloaded', (info) => sendToRenderer('update-downloaded', info));
autoUpdater.on('download-progress', (prog) => sendToRenderer('update-progress',   prog));
autoUpdater.on('error',             (err)  => console.error('[Updater]', err.message));

// ─── TopMediai CORS-Proxy ─────────────────────────────────────────
const PROXY_PORT     = 5001;
const TOPMEDIAI_HOST = 'api.topmediai.com';

function startProxy() {
  const server = http.createServer((req, res) => {
    const cors = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    };
    if (req.method === 'OPTIONS') { res.writeHead(200, cors); res.end(); return; }

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body    = Buffer.concat(chunks);
      const options = {
        hostname: TOPMEDIAI_HOST, port: 443, path: req.url, method: req.method,
        headers: {
          'Content-Type':  'application/json',
          'x-api-key':     req.headers['x-api-key'] || '',
          'Content-Length': body.length,
        },
      };
      const pr = https.request(options, pRes => {
        const data = [];
        pRes.on('data', c => data.push(c));
        pRes.on('end',  () => {
          res.writeHead(pRes.statusCode, { ...cors, 'Content-Type': 'application/json' });
          res.end(Buffer.concat(data));
        });
      });
      pr.on('error', e => { res.writeHead(502, cors); res.end(JSON.stringify({ error: e.message })); });
      if (body.length > 0) pr.write(body);
      pr.end();
    });
  });

  server.listen(PROXY_PORT, '127.0.0.1', () =>
    console.log(`[Proxy] TopMediai CORS-Proxy läuft auf Port ${PROXY_PORT}`)
  );
  server.on('error', e => { if (e.code !== 'EADDRINUSE') console.error('[Proxy]', e.message); });
  return server;
}

// ─── Hilfsfunktion: an Renderer senden ───────────────────────────
let mainWindow = null;
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─── Fenster erstellen ────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1440,
    height:          900,
    minWidth:        900,
    minHeight:       600,
    title:           `Hirsch Music Hit Maker v${APP_VERSION}`,
    backgroundColor: '#1A1A2E',
    show:            false,
    webPreferences: {
      preload:             path.join(__dirname, 'preload.js'),
      nodeIntegration:     false,
      contextIsolation:    true,
      webSecurity:         true,
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
  });

  if (!fs.existsSync(HTML_FILE)) {
    dialog.showErrorBox('Fehler', `index.html nicht gefunden:\n${HTML_FILE}`);
    app.quit();
    return;
  }

  mainWindow.loadFile(HTML_FILE);

  // Externe Links im Browser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
    // Version in Renderer injizieren
    mainWindow.webContents.executeJavaScript(
      `window._desktopAppVersion = '${APP_VERSION}'; window._isElectronApp = true;`
    ).catch(() => {});
    // Update-Check nach 3 Sekunden
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 3000);
  });

  // Fallback: Fenster nach 6s anzeigen falls did-finish-load nicht feuert
  setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) mainWindow.show(); }, 6000);

  mainWindow.on('closed', () => { mainWindow = null; });
  buildMenu();
}

// ─── App-Menü ─────────────────────────────────────────────────────
function buildMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Datei', submenu: [
        { label: '✚ Neues Projekt',    accelerator: 'CmdOrCtrl+N', click: () => exec('if(typeof confirmNewProject==="function")confirmNewProject()') },
        { type: 'separator' },
        { label: '🖨️ Als PDF drucken', accelerator: 'CmdOrCtrl+P', click: () => exec('if(typeof exportAsPDF==="function")exportAsPDF()') },
        { label: '📥 Als TXT speichern', accelerator: 'CmdOrCtrl+S', click: () => exec('if(typeof exportAsTXT==="function")exportAsTXT()') },
        { type: 'separator' },
        { label: 'Beenden', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Bearbeiten', submenu: [
        { label: 'Ausschneiden',   role: 'cut' },
        { label: 'Kopieren',       role: 'copy' },
        { label: 'Einfügen',       role: 'paste' },
        { label: 'Alles auswählen',role: 'selectAll' },
      ],
    },
    {
      label: 'Ansicht', submenu: [
        { label: 'Vollbild',     accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Vergrößern',   accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Verkleinern',  accelerator: 'CmdOrCtrl+-',    role: 'zoomOut' },
        { label: 'Zurücksetzen', accelerator: 'CmdOrCtrl+0',    role: 'resetZoom' },
        { type: 'separator' },
        { label: '🔄 Neu laden', accelerator: 'CmdOrCtrl+R',    role: 'reload' },
        { label: '🐛 DevTools',  accelerator: 'F12',            role: 'toggleDevTools' },
      ],
    },
    {
      label: 'KI', submenu: [
        { label: '🎵 Lyrics generieren',   accelerator: 'CmdOrCtrl+G', click: () => exec('if(typeof generateLyrics7KI==="function")generateLyrics7KI()') },
        { label: '🥁 Beat-Prompt',         accelerator: 'CmdOrCtrl+B', click: () => exec('if(typeof generateBeatPrompt==="function")generateBeatPrompt()') },
        { label: '🧠 Super-KI Analyse',    accelerator: 'CmdOrCtrl+A', click: () => exec('if(typeof generateSuperKI==="function")generateSuperKI()') },
      ],
    },
    {
      label: 'Hilfe', submenu: [
        {
          label: `Über v${APP_VERSION}`,
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info', title: 'Hirsch Music Hit Maker',
            message: `Hirsch Music Hit Maker v${APP_VERSION}`,
            detail: `9 KI-Autoren · 24.000+ Songs · 49+ Genres · 1920–2026\n© 2026 Hirsch Music Production`,
          }),
        },
        { type: 'separator' },
        {
          label: '🔄 Jetzt nach Updates suchen',
          click: () => autoUpdater.checkForUpdatesAndNotify().catch(() =>
            dialog.showMessageBox(mainWindow, {
              type: 'info', title: 'Kein Update',
              message: `Du verwendest v${APP_VERSION} — alles aktuell.`,
            })
          ),
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function exec(js) {
  if (mainWindow) mainWindow.webContents.executeJavaScript(js).catch(() => {});
}

// ─── IPC-Handler ──────────────────────────────────────────────────
ipcMain.handle('get-version', () => APP_VERSION);
ipcMain.handle('check-update', () => autoUpdater.checkForUpdatesAndNotify());
ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true));

// ─── App-Lifecycle ────────────────────────────────────────────────
let proxyServer = null;

app.whenReady().then(() => {
  proxyServer = startProxy();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit',       () => { if (proxyServer) proxyServer.close(); });
