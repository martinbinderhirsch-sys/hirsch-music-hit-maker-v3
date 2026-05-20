const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');
const http = require('http');

// ─── GPU-Probleme auf Windows beheben ────────────────────────────
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');

// ─── Konfiguration ────────────────────────────────────────────────
const APP_VERSION = app.getVersion(); // kommt aus package.json
const LOCAL_HTML  = path.join(__dirname, 'src', 'renderer', 'index.html');

// ─── Auto-Updater ─────────────────────────────────────────────────
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload    = true;   // Update automatisch herunterladen
autoUpdater.autoInstallOnAppQuit = true; // Nach Beenden automatisch installieren

autoUpdater.on('checking-for-update', () => {
  console.log('[Updater] Suche nach Updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[Updater] Update verfügbar:', info.version);
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      if (typeof showToast === 'function')
        showToast('🔄 Update verfügbar: v${info.version} wird heruntergeladen...');
    `).catch(() => {});
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('[Updater] App ist aktuell.');
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  console.log(`[Updater] Download: ${percent}%`);
  if (mainWindow && percent % 20 === 0) {
    mainWindow.webContents.executeJavaScript(`
      if (typeof showToast === 'function')
        showToast('⬇️ Update wird geladen: ${percent}%');
    `).catch(() => {});
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[Updater] Update heruntergeladen:', info.version);
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update bereit',
      message: `Hirsch Music Hit Maker v${info.version} ist bereit`,
      detail: 'Das Update wird nach dem Beenden der App automatisch installiert.\n\nJetzt neu starten und installieren?',
      buttons: ['Jetzt neu starten', 'Später'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('[Updater] Fehler:', err.message);
});

// ─── TopMediai CORS Proxy Server (Port 5001) ─────────────────────
const TOPMEDIAI_BASE = 'api.topmediai.com';

function startTopMediaiProxy() {
  const server = http.createServer((req, res) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(200, corsHeaders); res.end(); return;
    }
    const apiKey = req.headers['x-api-key'] || '';
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const options = {
        hostname: TOPMEDIAI_BASE, port: 443, path: req.url, method: req.method,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'Content-Length': body.length }
      };
      const proxyReq = require('https').request(options, (proxyRes) => {
        const data = [];
        proxyRes.on('data', c => data.push(c));
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(Buffer.concat(data));
        });
      });
      proxyReq.on('error', (e) => { res.writeHead(502, corsHeaders); res.end(JSON.stringify({ error: e.message })); });
      if (body.length > 0) proxyReq.write(body);
      proxyReq.end();
    });
  });
  server.listen(5001, '127.0.0.1', () => console.log('[Proxy] TopMediai CORS Proxy läuft auf Port 5001'));
  server.on('error', (e) => { if (e.code !== 'EADDRINUSE') console.error('[Proxy] Fehler:', e.message); });
  return server;
}

let proxyServer = null;
let mainWindow;

// ─── Hauptfenster erstellen ───────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: `Hirsch Music Hit Maker v${APP_VERSION}`,
    backgroundColor: '#1A1A2E',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, 'src', 'icon.ico')
  });

  if (!fs.existsSync(LOCAL_HTML)) {
    dialog.showErrorBox('Fehler', 'index.html nicht gefunden.\nBitte App neu installieren.');
    app.quit(); return;
  }

  console.log(`[Hirsch v${APP_VERSION}] Lade:`, LOCAL_HTML);
  mainWindow.loadFile(LOCAL_HTML);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.executeJavaScript(`
      window._desktopAppVersion = '${APP_VERSION}';
      window._isElectronApp = true;
    `).catch(() => {});

    // Update-Check 3 Sekunden nach Start
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }, 6000);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('[Hirsch] Ladefehler:', errorCode, errorDescription);
  });

  buildMenu();
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Menü ─────────────────────────────────────────────────────────
function buildMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Datei',
      submenu: [
        { label: '✚ Neues Projekt', accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof confirmNewProject==="function")confirmNewProject();') },
        { type: 'separator' },
        { label: '🖨️ Als PDF drucken', accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof exportAsPDF==="function")exportAsPDF();') },
        { label: '📥 Als TXT speichern', accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof exportAsTXT==="function")exportAsTXT();') },
        { type: 'separator' },
        { label: 'Beenden', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { label: '↩ Rückgängig', accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof lyricsUndo==="function")lyricsUndo();') },
        { label: '↪ Wiederherstellen', accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof lyricsRedo==="function")lyricsRedo();') },
        { type: 'separator' },
        { label: 'Ausschneiden', role: 'cut' },
        { label: 'Kopieren', role: 'copy' },
        { label: 'Einfügen', role: 'paste' },
        { label: 'Alles auswählen', role: 'selectAll' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { label: 'Vollbild', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Vergrößern', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Verkleinern', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Zurücksetzen', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '🔄 Neu laden', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '🐛 DevTools', accelerator: 'F12', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'KI',
      submenu: [
        { label: '🎵 Lyrics generieren', accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof generateLyrics7KI==="function")generateLyrics7KI();') },
        { label: '🥁 Beat-Prompt', accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.executeJavaScript('if(typeof generateBeatPrompt==="function")generateBeatPrompt();') },
        { label: '🧠 Super-KI Analyse', accelerator: 'CmdOrCtrl+A',
          click: () => {
            mainWindow.webContents.executeJavaScript('document.querySelectorAll(".tab-btn").forEach(x=>{if(x.getAttribute("onclick")&&x.getAttribute("onclick").includes("workbench"))x.click();})');
            setTimeout(() => mainWindow.webContents.executeJavaScript('if(typeof generateSuperKI==="function")generateSuperKI();'), 400);
          }
        }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        { label: `Über Hirsch Music Hit Maker v${APP_VERSION}`,
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Hirsch Music Hit Maker',
              message: `Hirsch Music Hit Maker v${APP_VERSION}`,
              detail: `9 KI-Autoren: GPT-4o · Gemini 2.5 · Claude · DeepSeek · Mistral · Llama · Phi\n24.000+ Songs · 49 Genres · 1920–2026\n\n© 2026 Hirsch Music Production\nErstellt mit Perplexity Computer`
            });
          }
        },
        { type: 'separator' },
        { label: '🔄 Jetzt nach Updates suchen',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify().catch(() => {
              dialog.showMessageBox(mainWindow, {
                type: 'info', title: 'Update-Check',
                message: 'Kein Update verfügbar',
                detail: `Du verwendest die neueste Version (v${APP_VERSION}).`
              });
            });
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

// ─── IPC ──────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => APP_VERSION);
ipcMain.handle('check-update', () => autoUpdater.checkForUpdatesAndNotify());

// ─── App-Start ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  proxyServer = startTopMediaiProxy();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { if (proxyServer) proxyServer.close(); });
