/**
 * HIRSCH MUSIC HIT MAKER — Lyrics-Generator
 * ==========================================
 * Verantwortlich für:
 *   - UI-State des Lyrics-Tabs (Genre, Mood, Struktur, Persona)
 *   - Aufruf der KI-Pipeline (pipeline.js)
 *   - Versions-Verwaltung (lyricsVersions Array)
 *   - Workbench-Sync nach jeder Generierung
 *   - Auto-Save in localStorage
 *
 * Abhängigkeiten:
 *   - window.HIRSCH_PIPELINE  (aus ai/pipeline.js)
 *   - window.REF_DATA         (aus ref-data.js)
 *   - window.ARTIST_DNA       (aus ref-data.js oder pipeline.js)
 *   - window.MOOD_DNA         (aus pipeline.js)
 *   - window.PERSONAS         (aus pipeline.js)
 */

'use strict';

// ─── Versions-State ──────────────────────────────────────────────
/** @type {import('../types/index').LyricsVersion[]} */
const lyricsVersions = [];
let activeVersionIdx = -1;

// ─── Lyrics-Generator-State ──────────────────────────────────────
/** @type {import('../types/index').LyricsState} */
const lyricsState = {
  genre:     [],       // Array von Genre-Keys (z.B. ['rock', 'blues'])
  mood:      [],       // Array von Mood-Keys
  personas:  [],       // Array von Künstler-Namen (max. 3)
  lang:      'de',     // 'de' | 'en'
  theme:     '',       // Freitext-Thema
  structure: '',       // Struktur-Key (z.B. 'v-c-v-c-b-c')
  notes:     '',       // Optionale Hinweise
  rhyme:     'auto',   // Reimschema
};

// ─── localStorage-Key ────────────────────────────────────────────
const STORAGE_KEY = 'hirsch_lyrics_history';

// ─── Lyrics generieren ───────────────────────────────────────────
/**
 * Startet die 9-KI Lyrics-Generierung.
 * Liest State aus den UI-Elementen, ruft HIRSCH_PIPELINE.generate() auf,
 * und zeigt das Ergebnis an.
 *
 * @returns {Promise<void>}
 */
async function generateLyrics() {
  const outputEl = document.getElementById('lyrics-output');
  const btnEl    = document.getElementById('lyrics-gen-btn');

  if (!outputEl) return;

  // State aus UI lesen
  lyricsState.theme     = document.getElementById('lyrics-theme')?.value?.trim()     || '';
  lyricsState.lang      = document.getElementById('lyrics-lang')?.value              || 'de';
  lyricsState.notes     = document.getElementById('lyrics-notes')?.value?.trim()     || '';
  lyricsState.rhyme     = document.getElementById('lyrics-rhyme-scheme')?.value      || 'auto';
  lyricsState.personas  = window._selectedPersonas?.slice(0, 3)                      || [];
  lyricsState.genre     = window.genreState?.['lyrics']                              || [];
  lyricsState.mood      = window.moodState?.['lyrics']                               || [];

  // Validierung
  if (!lyricsState.theme && !lyricsState.genre.length) {
    showToast('⚠️ Bitte Thema oder Genre wählen');
    return;
  }

  // UI: Laden-Zustand
  if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '0.6'; }
  outputEl.innerHTML = `
    <div style="color:var(--accent2);padding:16px;text-align:center;">
      <div class="loading-spinner" style="margin:0 auto 12px;"></div>
      <div>9 KIs arbeiten an deinem Song…</div>
    </div>`;

  try {
    // Pipeline aufrufen
    if (!window.HIRSCH_PIPELINE) throw new Error('KI-Pipeline nicht geladen');
    const result = await window.HIRSCH_PIPELINE.generate(lyricsState);

    // Ergebnis anzeigen
    outputEl.textContent = result.lyrics;
    addLyricsVersion(result.lyrics, result.title);
    showToast('✅ Song generiert!');

  } catch (err) {
    outputEl.innerHTML = `<div style="color:var(--error);padding:12px;">❌ ${err.message}</div>`;
    showToast('❌ ' + err.message);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
  }
}

// ─── Version hinzufügen ───────────────────────────────────────────
/**
 * Speichert einen neuen Lyrics-Text als neue Version.
 * Maximal 10 Versionen — älteste wird verworfen.
 *
 * @param {string} text    - Vollständiger Lyrics-Text
 * @param {string} [label] - Optionaler Titel (wird sonst aus Text extrahiert)
 */
function addLyricsVersion(text, label) {
  const vNum  = _incVersionCounter();
  const title = label || _extractTitle(text) || `Song ${vNum}`;

  lyricsVersions.push({ text, title, vNum, timestamp: new Date(), favorite: false });
  if (lyricsVersions.length > 10) lyricsVersions.shift();
  activeVersionIdx = lyricsVersions.length - 1;

  _renderVersionTabs();
  _saveToStorage();
  _syncToWorkbench(text, title, vNum);
}

// ─── Versions-Tabs rendern ────────────────────────────────────────
function _renderVersionTabs() {
  const container = document.getElementById('lyrics-version-tabs');
  if (!container) return;
  container.innerHTML = '';

  lyricsVersions.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm version-tab' + (i === activeVersionIdx ? ' active' : '');
    btn.textContent = `V${v.vNum}`;
    btn.title       = v.title;
    btn.onclick     = () => _showVersion(i);
    container.appendChild(btn);
  });
}

function _showVersion(idx) {
  if (idx < 0 || idx >= lyricsVersions.length) return;
  activeVersionIdx = idx;
  const outputEl = document.getElementById('lyrics-output');
  if (outputEl) outputEl.textContent = lyricsVersions[idx].text;
  _renderVersionTabs();
}

// ─── Workbench-Sync ───────────────────────────────────────────────
/**
 * Sendet den generierten Text an die Workbench-Analyse.
 * Wird nach jeder Generierung automatisch aufgerufen.
 */
function _syncToWorkbench(text, title, vNum) {
  window._lastLyricsForWorkbench      = text;
  window._lastLyricsLabelForWorkbench = title || `V${vNum}`;

  // Status-Indikator im Lyrics-Tab
  let indicator = document.getElementById('wb-sync-indicator');
  if (!indicator) {
    const outputEl = document.getElementById('lyrics-output');
    if (outputEl?.parentNode) {
      indicator = document.createElement('div');
      indicator.id = 'wb-sync-indicator';
      indicator.style.cssText = 'font-size:11px;color:#A78BFA;padding:4px 10px;background:rgba(124,58,237,0.1);border-radius:7px;border:1px solid rgba(124,58,237,0.25);margin-top:6px;display:inline-block;';
      outputEl.parentNode.insertBefore(indicator, outputEl.nextSibling);
    }
  }
  if (indicator) {
    const de = window.currentLang !== 'en';
    indicator.textContent = '✅ ' + (de ? 'Text an Workbench gesendet' : 'Text sent to Workbench');
    indicator.style.display = 'inline-block';
  }
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────
function _extractTitle(text) {
  const m = text.match(/\[([^\]]{3,40})\]/);
  return m ? m[1].trim() : text.split('\n')[0]?.trim()?.slice(0, 40) || '';
}

function _incVersionCounter() {
  let n = parseInt(localStorage.getItem('hirsch_version_counter') || '0', 10);
  n++;
  localStorage.setItem('hirsch_version_counter', n);
  return n;
}

function _saveToStorage() {
  try {
    const data = lyricsVersions.map(v => ({
      text: v.text, title: v.title, vNum: v.vNum,
      timestamp: v.timestamp.toISOString(), favorite: v.favorite,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.warn('[Lyrics] Storage error:', e); }
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    data.forEach(v => {
      lyricsVersions.push({ ...v, timestamp: new Date(v.timestamp) });
    });
    if (lyricsVersions.length > 0) {
      activeVersionIdx = lyricsVersions.length - 1;
      _renderVersionTabs();
      const outputEl = document.getElementById('lyrics-output');
      if (outputEl) outputEl.textContent = lyricsVersions[activeVersionIdx].text;
    }
  } catch (e) { console.warn('[Lyrics] Load error:', e); }
}

// ─── Globale Exports ─────────────────────────────────────────────
window.generateLyrics     = generateLyrics;
window.addLyricsVersion   = addLyricsVersion;
window.lyricsVersions     = lyricsVersions;
window.lyricsState        = lyricsState;

// Beim Laden: History aus Storage wiederherstellen
document.addEventListener('DOMContentLoaded', _loadFromStorage);
