/**
 * lyrics-core.js - Hirsch Music Hit Maker
 * Zentraler Lyrics-Kern: State, Undo/Redo, Versionsverwaltung,
 * generateLyricsController, syncSongMirror, renderLyricsOutput
 * v3.27.2 ausgelagert - v3.27.3 konsolidiert
 *
 * Architektur-Regel:
 *   Kern verwaltet Zustand und Logik.
 *   UI liest/schreibt ueber klar benannte Funktionen.
 *   DOM-Zugriffe bleiben in UI-Modulen oder kleinen Adapter-Funktionen.
 */

window.HirschModules = window.HirschModules || {};

// Originale generateLyrics sichern BEVOR Wrapper gesetzt werden.
// Wird in generate() als interner Pipeline-Aufruf genutzt.
if (typeof window.generateLyrics === 'function' && !window._origGenerateLyrics) {
  window._origGenerateLyrics = window.generateLyrics;
}

window.HirschModules.lyricsCore = (function () {

  // ================================================================
  // 1. STATE
  // ================================================================

  var state = {
    lastLyrics:       '',
    undoStack:        [],
    redoStack:        [],
    undoLastSaved:    '',
    versions:         [],
    activeVersionIdx: 0,
  };

  function setLyrics(text) {
    state.lastLyrics = text;
    window.lastLyrics = text;
  }

  function getLyrics() {
    return state.lastLyrics;
  }

  function getActiveLyrics() {
    var fav = state.versions.find(function(v) { return v.favorite; });
    if (fav) return fav.text;
    if (state.versions.length) return state.versions[state.activeVersionIdx].text;
    return state.lastLyrics;
  }

  // ================================================================
  // 2. UNDO / REDO
  // ================================================================

  function _pushUndo(text) {
    if (text === state.undoLastSaved) return;
    state.undoStack.push(state.undoLastSaved);
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
    state.undoLastSaved = text;
    _updateUndoButtons();
  }

  function _updateUndoButtons() {
    var undoBtn = document.getElementById('undo-btn');
    var redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = state.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = state.redoStack.length === 0;
  }

  function undo() {
    if (!state.undoStack.length) return;
    var el = document.getElementById('lyrics-output');
    if (!el) return;
    state.redoStack.push(state.undoLastSaved);
    state.undoLastSaved = state.undoStack.pop();
    el.textContent = state.undoLastSaved;
    setLyrics(state.undoLastSaved);
    syncSongMirror();
    _updateUndoButtons();
    var de = (window.currentLang !== 'en');
    if (typeof window.showToast === 'function')
      window.showToast(de ? '\u21a9 R\u00fckg\u00e4ngig' : '\u21a9 Undo');
  }

  function redo() {
    if (!state.redoStack.length) return;
    var el = document.getElementById('lyrics-output');
    if (!el) return;
    state.undoStack.push(state.undoLastSaved);
    state.undoLastSaved = state.redoStack.pop();
    el.textContent = state.undoLastSaved;
    setLyrics(state.undoLastSaved);
    syncSongMirror();
    _updateUndoButtons();
    var de = (window.currentLang !== 'en');
    if (typeof window.showToast === 'function')
      window.showToast(de ? '\u21aa Wiederherstellen' : '\u21aa Redo');
  }

  // ================================================================
  // 3. VERSIONSVERWALTUNG
  // ================================================================

  function _incVersionCounter() {
    window._globalVersionCounter = (window._globalVersionCounter || 0) + 1;
    try { localStorage.setItem('hirsch_version_counter', window._globalVersionCounter); } catch(_) {}
    return window._globalVersionCounter;
  }

  function _extractSongTitle(text) {
    var match = text.match(/\u{1F3B5}\s*(.+?)\s*\n/u);
    if (match) return match[1].trim();
    return 'Version ' + (state.versions.length + 1);
  }

  /**
   * addVersion(text, label) - Neue Version hinzufuegen.
   * Loest Undo-Snapshot, Version-Bar-Update und Workbench-Sync aus.
   */
  function addVersion(text, label) {
    _pushUndo(text);
    var title = label || _extractSongTitle(text);
    var vNum  = _incVersionCounter();
    var entry = { text: text, title: title, vNum: vNum, timestamp: new Date(), favorite: false };
    state.versions.push(entry);
    if (state.versions.length > 10) state.versions.shift();
    state.activeVersionIdx = state.versions.length - 1;
    setLyrics(text);
    syncSongMirror();

    if (typeof window.renderLyricsVersionTabs === 'function') window.renderLyricsVersionTabs();
    if (typeof window.renderVersionBar        === 'function') window.renderVersionBar();
    if (typeof window.showLyricsVersion       === 'function') window.showLyricsVersion(state.activeVersionIdx);
    if (typeof window.wbUpdateStats           === 'function') window.wbUpdateStats();

    window._lastLyricsForWorkbench      = text;
    window._lastLyricsLabelForWorkbench = title || ('V' + vNum);
    _updateWbSyncIndicator(vNum);

    return entry;
  }

  function _updateWbSyncIndicator(vNum) {
    var indicator = document.getElementById('wb-sync-indicator');
    if (!indicator) {
      var outputBox = document.getElementById('lyrics-output');
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
      var isDE = (window.currentLang !== 'en');
      indicator.textContent = isDE
        ? ('\u2713 V' + vNum + ' in Workbench')
        : ('\u2713 V' + vNum + ' synced to Workbench');
    }
  }

  // ================================================================
  // 4. SONG-MIRROR + RENDERER
  // ================================================================

  /**
   * syncSongMirror() - Spiegelt Kern-Zustand nach SONG.lyricsText.
   * SONG.lyricsText ist abgeleiteter Sync-Wert, kein Primaerzustand.
   */
  function syncSongMirror() {
    if (window.SONG) window.SONG.lyricsText = state.lastLyrics;
  }

  /**
   * renderLyricsOutput() - Einziger offizieller Renderer fuer lyrics-output.
   * Kein Kern-State-Zugriff - nur reine Anzeige.
   */
  function renderLyricsOutput() {
    var el = document.getElementById('lyrics-output');
    if (!el) return;
    var text = getActiveLyrics();
    if (!text) return;
    if (typeof window.formatLyricsHTML === 'function') {
      el.innerHTML = window.formatLyricsHTML(text);
    } else {
      el.textContent = text;
    }
    el.style.display = 'block';
  }

  /**
   * setAndRender(text) - Kern setzen + Mirror + Renderer.
   * Offizieller Schreibpfad fuer direkte Lyrics-Aenderungen
   * ausserhalb von generate() und addVersion().
   */
  function setAndRender(text) {
    setLyrics(text);
    syncSongMirror();
    renderLyricsOutput();
  }

  window.setAndRenderLyrics = setAndRender;

  // ================================================================
  // 5. SYNC-KOORDINATION
  // ================================================================

  function syncAll() {
    if (typeof window.syncFromLyrics === 'function') window.syncFromLyrics();
    if (typeof window.syncToExport   === 'function') window.syncToExport();
  }

  // ================================================================
  // 6. GENERATE LYRICS CONTROLLER
  // ================================================================

  async function generate(mode) {
    mode = mode || 'single';

    // VocalStyle in SONG injizieren
    if (window._vocalStyleSelected && window._vocalStyleSelected.length > 0 &&
        typeof window.VOCAL_STYLES !== 'undefined') {
      var labels = window._vocalStyleSelected.map(function(v) {
        for (var cat of Object.values(window.VOCAL_STYLES)) {
          var s = cat.styles && cat.styles.find(function(x) { return x.value === v; });
          if (s) return s.en || s.de || v;
        }
        return v;
      });
      if (window.SONG) window.SONG.vocalStyle = labels.join(', ');
      window._pendingVocalStyle = labels.join(', ');
    } else {
      window._pendingVocalStyle = '';
    }

    var result;
    try {
      if (mode === '7ki' && typeof window.generateLyrics7KI === 'function') {
        result = await window.generateLyrics7KI();
      } else if (typeof window._origGenerateLyrics === 'function') {
        result = await window._origGenerateLyrics();
      }
    } catch (err) {
      console.error('[lyricsCore.generate] Fehler:', err);
      return null;
    }

    if (typeof window.showRetryBar === 'function') setTimeout(window.showRetryBar, 300);
    if (typeof window.addSongToHistory === 'function' && result) window.addSongToHistory(result);

    return result;
  }

  window.generateLyricsController = generate;
  if (window.HirschApp && window.HirschApp.lyrics) {
    window.HirschApp.lyrics.controller = generate;
    window.HirschApp.lyrics.undo       = undo;
    window.HirschApp.lyrics.redo       = redo;
  }

  // ================================================================
  // 7. LEGACY WRAPPER (einmaliger Pfad, kein Altcode doppelt)
  // ================================================================

  window.addLyricsVersion = function(text, label) {
    return window.HirschModules.lyricsCore.addVersion(text, label);
  };
  window.lyricsUndo = function() {
    return window.HirschModules.lyricsCore.undo();
  };
  window.lyricsRedo = function() {
    return window.HirschModules.lyricsCore.redo();
  };

  // ================================================================
  // 8. PUBLIC API
  // ================================================================

  return {
    setLyrics,
    getLyrics,
    getActiveLyrics,
    setAndRender,
    undo,
    redo,
    addVersion,
    generate,
    syncAll,
    syncSongMirror,
    renderLyricsOutput,
    get state() { return state; },
  };

})();

console.log('[HirschModules] \u2705 lyrics-core.js v3.27.3 geladen');
