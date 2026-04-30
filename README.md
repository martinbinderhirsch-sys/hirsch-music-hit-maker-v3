# Hirsch Music Hit Maker

AI-gestützte Songwriting-Desktop-App mit Multi-KI-Router und 4-Stufen-Lyrics-Pipeline.
Zielplattform: **Windows 11** (Installer/Uninstaller via NSIS).

## Features (v0.1)

- **140 Sprachen + Locales** (en-US, en-GB, de-DE, de-CH, …) — kuratierte Liste, ausbaubar
- **4-Stufen-Pipeline**: Song-DNA → Draft → Linguistic Polish → Localization
- **Multi-KI-Router** über OpenRouter: GPT-4o, Gemini 2.5 Flash, Claude 3.5 Sonnet
- **Sicherheit**: contextIsolation, schmale Preload-Bridge, API-Keys mit Windows DPAPI verschlüsselt
- **Genre-Schwerpunkt**: Country, Blues, Americana (mit US-Idiomatik-Polish bei en-US)
- **Tab-Struktur**: Lyrics Generator · Einstellungen · Über

## Voraussetzungen

- Node.js **18.18+** (LTS empfohlen, 20.x ideal)
- Windows 10/11 für den finalen Installer-Build
- OpenRouter API-Key (in den App-Einstellungen einzutragen)

## Erstes Setup

```bash
cd hirsch-music-hit-maker
npm install
```

## Entwicklung starten

```bash
npm run dev
```

Das startet Vite (Renderer auf `localhost:5173`) und kompiliert anschließend Main + Preload, dann öffnet sich Electron automatisch.

## Erstes Mal: API-Key eintragen

1. App starten
2. Tab **Einstellungen** öffnen
3. OpenRouter API-Key einfügen → **Speichern**
4. Tab **Lyrics Generator** → Topic eingeben → **Lyrics generieren**

## Builds

| Befehl | Was es macht |
|---|---|
| `npm run build` | Renderer + Main TypeScript kompilieren (Output: `dist/`) |
| `npm run start` | Lokal die kompilierte App starten (kein Vite Dev-Server) |
| `npm run dist` | Windows-Installer (`.exe`) erzeugen → `release/Hirsch Music Hit Maker-Setup-0.1.0.exe` |
| `npm run dist:dir` | Unverpackten Build-Ordner erzeugen (zum schnellen Testen) |

> Hinweis: Windows-Builds **auf Windows** ausführen — plattformfremde NSIS-Builds machen oft Probleme bei Installer/Uninstaller-Logik.

## Projektstruktur

```
src/
  main/                Electron Main Process (Node)
    main.ts            Fenster, IPC-Registrierung, Lifecycle
    settings-store.ts  Verschlüsselter Settings-Store (electron-store + safeStorage)
    ai-router.ts       OpenRouter-Client, Multi-Modell-Routing
    lyrics-pipeline.ts 4-Stufen-Pipeline für Lyrics
  preload/
    preload.ts         Schmale, sichere contextBridge-API
  renderer/            React-UI (Vite)
    src/App.tsx        Tab-Shell
    src/tabs/          LyricsTab, SettingsTab, AboutTab
    src/styles/        Globales CSS (Dark Theme, Country-Gold)
  shared/              Typen, IPC-Kanäle, Sprachliste (von Main + Renderer genutzt)
build/
  installer.nsh        Custom NSIS-Hooks (Install/Uninstall)
```

## Sicherheitsarchitektur

- `contextIsolation: true` — Renderer und Node sind hart getrennt
- `nodeIntegration: false` — kein direkter Node-Zugriff aus dem UI
- Alle System-Aktionen laufen über IPC-Kanäle (siehe `src/shared/ipc-channels.ts`)
- API-Keys werden über `safeStorage` (DPAPI auf Windows) verschlüsselt

## Sprint-Plan (folgt)

- **T01** ✅ Projekt-Skelett + Tooling
- **T02** ✅ Main/Preload/IPC + Settings + KI-Router
- **T03** ✅ Lyrics-Tab v0 + 4-Stufen-Pipeline
- **T04** ⏳ Auto-Updater (electron-updater) anschalten
- **T05** ⏳ Song-Projekte speichern + History
- **T06** ⏳ Fusion-Tab (Songstrukturen + Akkord-Skizzen)

## Lizenz

Privat — noch nicht veröffentlicht.
