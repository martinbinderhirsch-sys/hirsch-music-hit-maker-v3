/**
 * lyrics-core.js — Hirsch Music Hit Maker
 * Zentraler Lyrics-Kern: State, Undo/Redo, Versionsverwaltung,
 * generateLyricsController, Sync-Koordination
 * Ausgelagert in v3.27.2 aus index.html
 *
 * Architektur-Regel:
 *   Kern verwaltet Zustand und Logik.
 *   UI liest und schreibt über klar benannte Funktionen.
 *   DOM-Zugriffe bleiben in UI-Modulen oder kleinen Adapterfunktionen.
 *
 * Abhängigkeiten (müssen vor diesem Script geladen sein):
 *   — window.SONG (Song-State, definiert in index.html)
 *   — window.generateLyrics / generateLyrics7KI (Pipeline, pipeline.js)
 *   — window.formatLyricsHTML (Renderer, index.html)
 *   — window.showToast, window.currentLang (UI-Helfer, index.html)
 *   — window.renderVersionBar, window.wbUpdateStats (Workbench-UI)
 */

window.HirschModules = window.HirschModules || {};

window.HirschModules.lyricsCore = (function () {

  // ══════════════════════════════════════════════════════════════════
  // 1. STATE
  // ══════════════════════════════════════════════════════════════════

  const state = {
    lastLyrics:      '',   // zuletzt generierter / aktiver Lyrics-Text
    undoStack:       [],   // Undo-Stapel (max 50 Einträge)
    redoStack:       [],   // Redo-Stapel
    undoLastSaved:   '',   // Snapshot vor letzter Undo-Operation
    versions:        [],   // Array von { text, title, vNum, timestamp, favorite }
    activeVersionIdx: 0,
  };

  // ── Getter / Setter ─────────────────────────────────────────────

  function setLyrics(text) {
    state.lastLyrics = text;
    // Globale Aliase damit alter Code weiter funktioniert
    window.lastLyrics = text;
  }

  function getLyrics() {
    return state.lastLyrics;
  }

  /**
   * Gibt die "aktive" Version für Export zurück:
   * bevorzugt Favorit, sonst aktive Version, sonst lastLyrics.
   */
  function getActiveLyrics() {
    const fav = state.versions.find(v => v.favorite);
    if (fav) return fav.text;
    if (state.versions.length) return state.versions[state.activeVersionIdx].text;
    return state.lastLyrics;
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. UNDO / REDO
  // ══════════════════════════════════════════════════════════════════

  function _pushUndo(text) {
    if (text === state.undoLastSaved) return;
    state.undoStack.push(state.undoLastSaved);
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
    state.undoLastSaved = text;
    _updateUndoButtons();
  }

  function _updateUndoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = state.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = state.redoStack.length === 0;
  }

  function undo() {
    if (!state.undoStack.length) return;
    const el = document.getElementById('lyrics-output');
    if (!el) return;
    state.redoStack.push(state.undoLastSaved);
    state.undoLastSaved = state.undoStack.pop();
    el.textContent = state.undoLastSaved;
    _updateUndoButtons();
    const de = (window.currentLang !== 'en');
    if (typeof window.showToast === 'function')
      window.showToast(de ? '↩ Rückgängig' : '↩ Undo');
  }

  function redo() {
    if (!state.redoStack.length) return;
    const el = document.getElementById('lyrics-output');
    if (!el) return;
    state.undoStack.push(state.undoLastSaved);
    state.undoLastSaved = state.redoStack.pop();
    el.textContent = state.undoLastSaved;
    _updateUndoButtons();
    const de = (window.currentLang !== 'en');
    if (typeof window.showToast === 'function')
      window.showToast(de ? '↪ Wiederherstellen' : '↪ Redo');
  }

  // ── Globale Aliase (HirschApp.lyrics.undo/redo + direkte Aufrufe) ─
  window.lyricsUndo = undo;
  window.lyricsRedo = redo;

  // ══════════════════════════════════════════════════════════════════
  // 3. VERSIONSVERWALTUNG
  // ══════════════════════════════════════════════════════════════════

  function _incVersionCounter() {
    window._globalVersionCounter = (window._globalVersionCounter || 0) + 1;
    try {
      localStorage.setItem('hirsch_version_counter', window._globalVersionCounter);
    } catch (_) {}
    return window._globalVersionCounter;
  }

  function _extractSongTitle(text) {
    const match = text.match(/🎵\s*(.+?)\s*\n/);
    if (match) return match[1].trim();
    return 'Version ' + (state.versions.length + 1);
  }

  /**
   * Neue Version hinzufügen.
   * Löst Undo-Snapshot, Version-Bar-Update und Workbench-Sync aus.
   */
  function addVersion(text, label) {
    _pushUndo(text);
    const title = label || _extractSongTitle(text);
    const vNum  = _incVersionCounter();
    const entry = { text, title, vNum, timestamp: new Date(), favorite: false };
    state.versions.push(entry);
    if (state.versions.length > 10) state.versions.shift();
    state.activeVersionIdx = state.versions.length - 1;
    setLyrics(text);

    // UI-Callbacks (Adapter-Aufrufe — DOM bleibt in UI-Modulen)
    if (typeof window.renderLyricsVersionTabs === 'function') window.renderLyricsVersionTabs();
    if (typeof window.renderVersionBar        === 'function') window.renderVersionBar();
    if (typeof window.showLyricsVersion       === 'function') window.showLyricsVersion(state.activeVersionIdx);
    if (typeof window.wbUpdateStats           === 'function') window.wbUpdateStats();

    // Workbench-Sync (globale Pointer)
    window._lastLyricsForWorkbench      = text;
    window._lastLyricsLabelForWorkbench = title || ('V' + vNum);

    // Sync-Indikator im Lyrics-Tab (minimaler DOM-Adapter)
    _updateWbSyncIndicator(vNum);

    return entry;
  }

  function _updateWbSyncIndicator(vNum) {
    let indicator = document.getElementById('wb-sync-indicator');
    if (!indicator) {
      const outputBox = document.getElementById('lyrics-output');
      if (outputBox && outputBox.parentNode) {
        indicator = document.createElement('div');
        indicator.id = 'wb-sync-indicator';
        indicator.style.cssText =
          'font-size:11px;color:#A78BFA;font-weight:600;padding:4px 10px;' +
          'background:rgba(124,58,237,0.1);border-radius:7px;' +
          'border:1px solid rgba(124,58,237,0.25);margin-top:6px;display:inline-block;';
        outputBox.parentNode.insertBefore(indicator, outputBox.nextSibling);
      }
    }
    if (indicator) {
      const isDE = (window.currentLang !== 'en');
      indicator.textContent = isDE
        ? `✓ V${vNum} in Workbench`
        : `✓ V${vNum} synced to Workbench`;
    }
  }

  // Globaler Alias — alter Code ruft window.addLyricsVersion() direkt
  window.addLyricsVersion = addVersion;

  // ══════════════════════════════════════════════════════════════════
  // 4. SYNC-KOORDINATION
  // ══════════════════════════════════════════════════════════════════

  /**
   * syncAll() — Nach jeder Generierung: alle Tabs aktualisieren.
   * Ruft die bereits existierenden syncFromLyrics / syncToExport
   * als dünne Adapter auf; deren Implementierung bleibt in index.html.
   */
  function syncAll() {
    if (typeof window.syncFromLyrics === 'function') window.syncFromLyrics();
    if (typeof window.syncToExport   === 'function') window.syncToExport();
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. GENERATE LYRICS CONTROLLER
  // ══════════════════════════════════════════════════════════════════

  /**
   * generate() — Einziger offizieller Einstiegspunkt für Lyrics-Generierung.
   * Orchestriert: VocalStyle → Pipeline → RetryBar → History → Sync.
   * Kein DOM-Zugriff hier — alles über Adapter-Aufrufe.
   */
  async function generate(mode) {
    mode = mode || 'single'; // 'single' | '7ki'

    // 1. VocalStyle in SONG injizieren
    if (window._vocalStyleSelected && window._vocalStyleSelected.length > 0 &&
        typeof window.VOCAL_STYLES !== 'undefined') {
      const labels = window._vocalStyleSelected.map(function(v) {
        for (const cat of Object.values(window.VOCAL_STYLES)) {
          const s = cat.styles && cat.styles.find(x => x.value === v);
          if (s) return s.en || s.de || v;
        }
        return v;
      });
      if (window.SONG) window.SONG.vocalStyle = labels.join(', ');
      window._pendingVocalStyle = labels.join(', ');
    } else {
      window._pendingVocalStyle = '';
    }

    // 2. Pipeline aufrufen
    let result;
    try {
      if (mode === '7ki' && typeof window.generateLyrics7KI === 'function') {
        result = await window.generateLyrics7KI();
      } else if (typeof window.generateLyrics === 'function') {
        result = await window.generateLyrics();
      }
    } catch (err) {
      console.error('[lyricsCore.generate] Fehler:', err);
      return null;
    }

    // 3. RetryBar anzeigen
    if (typeof window.showRetryBar === 'function') {
      setTimeout(window.showRetryBar, 300);
    }

    // 4. Song-History speichern
    if (typeof window.addSongToHistory === 'function' && result) {
      window.addSongToHistory(result);
    }

    return result;
  }

  // Globale Aliase für Abwärtskompatibilität
  window.generateLyricsController = generate;
  if (window.HirschApp && window.HirschApp.lyrics) {
    window.HirschApp.lyrics.controller = generate;
    window.HirschApp.lyrics.undo       = undo;
    window.HirschApp.lyrics.redo       = redo;
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. PUBLIC API
  // ══════════════════════════════════════════════════════════════════

  return {
    // State
    setLyrics,
    getLyrics,
    getActiveLyrics,
    // Undo/Redo
    undo,
    redo,
    // Versioning
    addVersion,
    // Generate
    generate,
    // Sync
    syncAll,
    // Interner State (read-only Zugriff für Debugging)
    get state() { return state; },
  };

})();

console.log('[HirschModules] ✅ lyrics-core.js v3.27.2 geladen');
