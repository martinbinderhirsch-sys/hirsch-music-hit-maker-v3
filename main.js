const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');
const http = require('http');
const https = require('https');

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
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  console.log('[Updater] Update verfügbar:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
    mainWindow.webContents.executeJavaScript(`
      if (typeof showToast === 'function')
        showToast('🔄 Update verfügbar: v${info.version} wird heruntergeladen...');
    `).catch(() => {});
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('[Updater] App ist aktuell.');
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available' });
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
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', version: info.version });
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
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'error', message: err.message });
});

// ─── TopMediai User-Key (nur Main-Prozess) ────────────────────────
// User gibt Key einmalig ein -> set-topmediai-key IPC -> _runtimeTmKey
// Proxy nutzt _runtimeTmKey direkt — Renderer kennt Key nie im Klartext.
let _runtimeTmKey = null;

ipcMain.handle('set-topmediai-key', (_event, key) => {
  if (!key || typeof key !== 'string' || key.length < 20) {
    throw new Error('Ungültiger TopMediai Key');
  }
  _runtimeTmKey = key.trim();
  console.log('[TopMediai] Key im Main-Prozess gespeichert');
  return { ok: true };
});

// ─── TopMediai Strict Proxy (Port 5001, v3.27.6) ──────────────────
const TOPMEDIAI_BASE = 'api.topmediai.com';

// Nur diese zwei Routen sind erlaubt — keine freien Zielpfade.
const TOPMEDIAI_ROUTE_MAP = {
  'GET /v1/get_api_key_info': { upstreamPath: '/v1/get_api_key_info', method: 'GET',  maxBodyBytes: 0 },
  'POST /v1/music':           { upstreamPath: '/v1/music',            method: 'POST', maxBodyBytes: 1024 * 1024 },
};

function _readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!maxBytes) return resolve(Buffer.alloc(0));
    const chunks = [];
    let size = 0, done = false;
    req.on('data', chunk => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) { done = true; reject(new Error('Payload too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end',   () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', err => { if (!done) { done = true; reject(err); } });
  });
}

function _sendJson(res, status, cors, payload) {
  res.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function startTopMediaiProxy() {
  const server = http.createServer(async (req, res) => {
    const cors = {
      'Access-Control-Allow-Origin':  'null',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }

    try {
      // Route-Whitelist prüfen
      const url      = new URL(req.url, 'http://127.0.0.1:5001');
      const routeKey = `${req.method} ${url.pathname}`;
      const route    = TOPMEDIAI_ROUTE_MAP[routeKey];
      if (!route) { _sendJson(res, 404, cors, { error: 'Route not allowed' }); return; }

      // Client darf keinen eigenen Key mitschicken
      if (req.headers['x-api-key']) {
        _sendJson(res, 400, cors, { error: 'Client x-api-key header is forbidden' });
        return;
      }

      // Key muss im Main-Prozess vorhanden sein
      if (!_runtimeTmKey) {
        _sendJson(res, 401, cors, { error: 'TopMediai key not set. Please enter your key in the app.' });
        return;
      }

      const body = await _readBody(req, route.maxBodyBytes);

      const upstreamHeaders = {
        'x-api-key': _runtimeTmKey,
        'Accept':    'application/json',
      };
      if (route.method !== 'GET') {
        upstreamHeaders['Content-Type']   = 'application/json';
        upstreamHeaders['Content-Length'] = body.length;
      }

      const proxyReq = https.request({
        hostname: TOPMEDIAI_BASE, port: 443,
        path: route.upstreamPath, method: route.method,
        headers: upstreamHeaders,
      }, proxyRes => {
        const data = [];
        proxyRes.on('data', c => data.push(c));
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode || 502, {
            ...cors,
            'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8',
          });
          res.end(Buffer.concat(data));
        });
      });

      proxyReq.on('error', err => _sendJson(res, 502, cors, { error: err.message }));
      if (route.method !== 'GET' && body.length) proxyReq.write(body);
      proxyReq.end();

    } catch (err) {
      const status = err.message === 'Payload too large' ? 413 : 400;
      _sendJson(res, status, cors, { error: err.message });
    }
  });

  server.listen(5001, '127.0.0.1', () =>
    console.log('[Proxy] TopMediai Strict Proxy läuft auf 127.0.0.1:5001')
  );
  server.on('error', e => { if (e.code !== 'EADDRINUSE') console.error('[Proxy] Fehler:', e.message); });
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

// ─── API-Key Store (nur Hauptprozess) ─────────────────────────────
// Keys verlassen diesen Prozess nie. Der Renderer sendet Prompts,
// main.js fuehrt den fetch aus und gibt nur den Text-Output zurueck.
const _encKeys = {
  oai: [
    'c2stcHJvai1HVDZiN2dkeDVPOGdBTDJwbV9zY25Q',
    'ZURZQ2hxdGRyRVowRnB2Q1ZkWTNyS292OVRfQ3lD',
    'MTBVc18zRTZIN0Z4X3ZoM1AtVGJJLVQzQmxia0ZKbzNLY0J4STlPdjU4MjhORkl3TTZPaXJoQ2RzZXlheDBEZi01MEY1Rkk4b1RUQUh0VzQ4aVJSSU5TZ05ZQnJXODlFRXhXQ3l3d0E='
  ],
  gemini: [
    'QUl6YVN5QThoUlZFNnJi',
    'T1Y2NzBpREc5MGhwRlVEY3ZrdVI0LTJZ'
  ],
  openrouter: [
    'c2stb3ItdjEtYzAzYjA1NDZlZTA3Mjc4',
    'NjBmYjNkZjBkYzU3NzRjNTM2YmM4NmJj',
    'MjZhMzUyMDVjM2MyZTc4MjFkZWY0MjBkYw=='
  ],
};

function _decodeKey(parts) {
  return parts.map(p => Buffer.from(p, 'base64').toString('utf8')).join('');
}

async function _readJsonSafe(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return { raw: text || '' }; }
}

async function _providerFetch(url, options) {
  const res = await fetch(url, options);
  const data = await _readJsonSafe(res);
  if (!res.ok) {
    const msg = data?.error?.message || data?.raw || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

// ─── IPC ──────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => APP_VERSION);
ipcMain.handle('check-update', () => autoUpdater.checkForUpdatesAndNotify());
ipcMain.handle('apply-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// get-api-key entfernt in v3.27.5 — Renderer erhaelt keine Keys mehr.
// Stattdessen: ai-request — Main-Prozess fuehrt fetch selbst aus.
ipcMain.handle('ai-request', async (_event, payload) => {
  const { provider, model, system = '', user = '', opts = {} } = payload || {};
  if (!provider) throw new Error('Missing provider');

  if (provider === 'openai') {
    const key = _decodeKey(_encKeys.oai);
    const data = await _providerFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        max_tokens: opts.maxTokens || 1200,
        temperature: opts.temperature ?? 0.85,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      })
    });
    return { ok: true, text: data?.choices?.[0]?.message?.content?.trim() || '' };
  }

  if (provider === 'gemini') {
    const key = _decodeKey(_encKeys.gemini);
    const useModel = model || 'gemini-2.5-flash-preview-05-20';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${key}`;
    const data = await _providerFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens || 1200, temperature: opts.temperature ?? 0.85 }
      })
    });
    return { ok: true, text: data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '' };
  }

  if (provider === 'openrouter') {
    const key = _decodeKey(_encKeys.openrouter);
    const data = await _providerFetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://hirsch-music.app',
        'X-Title': 'Hirsch Music Hit Maker'
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens || 1200,
        temperature: opts.temperature ?? 0.85,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      })
    });
    return { ok: true, text: data?.choices?.[0]?.message?.content?.trim() || '' };
  }

  throw new Error(`Unsupported provider: ${provider}`);
});

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
