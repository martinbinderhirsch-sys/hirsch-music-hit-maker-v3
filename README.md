# Hirsch Music Hit Maker

AI-gestützte Songwriting-Desktop-App auf Basis von Electron.

Der Hirsch Music Hit Maker ist eine Desktop-App für KI-gestütztes Songwriting, Songentwicklung und kreative Produktions-Workflows.  
Die App bündelt Lyrics-Generierung, Multi-KI-Pipeline, Workbench-Verarbeitung und eine Reference Bank in einer gemeinsamen Arbeitsumgebung.

## Status

Aktive Entwicklung mit veröffentlichten GitHub-Releases.  
Aktuellster sichtbarer Release: v3.26.5.

## Kernfunktionen

- Lyrics Generator
- Multi-KI-Pipeline
- Workbench zur Analyse und Weiterverarbeitung
- Reference Bank mit 100 Songs
- Lebenssituation-Modal im Lyrics Generator
- Desktop-Build mit Installer

## Tech-Stack

- Electron
- JavaScript
- HTML
- NSIS Installer
- GitHub Releases

## Projektaufbau

- `main.js` – Electron Main Process, native Funktionen, App-Start, IPC
- `preload.js` – sichere Bridge zwischen Renderer und Electron
- `src/` – UI, Produktlogik, Lyrics Generator, Workflows
- `package.json` – Skripte, Metadaten, Abhängigkeiten
- `build-release.sh` – Release-Build
- `installer.nsh` – Windows-Installer-Anpassungen

## Architektur in Kurzform

Die App folgt einer klassischen Electron-Architektur:

1. UI und Benutzerfluss im Frontend (`src/`)
2. Sichere Freigaben über `preload.js`
3. Native, dateibasierte und sensible Abläufe über `main.js`

Wichtig: API-Keys und sicherheitsrelevante Funktionen gehören nicht direkt in die UI, sondern in die abgesicherte IPC-/Main-Schicht.

## Entwicklung

### Installation

```bash
npm install
```

### Start

```bash
npm start
```

### Build

```bash
npm run build
```

### Distribution

```bash
npm run dist
```

## Aktuelle Stärken

- Reale Desktop-App mit Electron
- Echte Release-Historie
- Multi-KI-Ansatz
- Strukturierte Songwriting-Workflows
- Ausbau der Sicherheitslogik über IPC

## Aktuelle Baustellen

- Öffentliche Grunddokumentation ist angelegt, aber noch ausbaufähig
- Produktlogik und UI sind wahrscheinlich noch zu eng gekoppelt
- Architekturwissen steckt stark implizit in einzelnen Dateien
- Modultrennung zwischen UI, sicherer Bridge und nativer Desktop-Logik ist noch nicht sauber genug

## Nächste Ziele

- Dokumentation und Architektur weiter klären
- Zuständigkeiten zwischen `main.js`, `preload.js` und `src/` schärfen
- `src/` später in Features und Core-Bereiche aufteilen
- Release- und Versionsdarstellung vereinheitlichen

## Zielbild

Der Hirsch Music Hit Maker soll sich zu einer belastbaren, klar strukturierten Songwriting-Workbench entwickeln – mit sauberer Trennung zwischen Oberfläche, sicherer Bridge, nativer Desktop-Logik und fachlichen Musikmodulen.
