/**
 * workbench-ui.js — Hirsch Music Hit Maker
 * Song-History + Cost-Tracker: UI-Rendering und State
 * Ausgelagert in v3.26.9 aus index.html
 *
 * Globale Abhängigkeiten: currentLang, SONG, genreState, window._safeStorage,
 *   addLyricsVersion, updateSongNameDisplay, switchTab, showToast
 */

'use strict';

// ─────────────────────────────────────────────
const _MAX_HISTORY = 200;
let _songHistory = (function() {
  try { return JSON.parse(localStorage.getItem('hirsch_song_history') || '[]'); }
  catch(e) { return []; }
})();

function saveSongToHistory() {
  const lyrics = ((typeof lastLyrics !== 'undefined' && lastLyrics) ? lastLyrics.trim() : (document.getElementById('lyrics-output')?.innerText?.trim() || ''));
  if(!lyrics || lyrics.length < 50) return;
  
  const entry = {
    id: Date.now(),
    title: document.getElementById('export-name')?.value?.trim() || 
           document.getElementById('lyrics-theme')?.value?.trim() || 
           'Song ' + new Date().toLocaleTimeString('de-AT', {hour:'2-digit',minute:'2-digit'}),
    genre: genreState['lyrics']?.join(', ') || '—',
    bpm: document.getElementById('beat-bpm')?.value || '120',
    key: document.getElementById('beat-key')?.value || '—',
    lyrics: lyrics,
    timestamp: new Date().toLocaleString('de-AT', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
  };
  
  // Remove duplicate if same title
  _songHistory = _songHistory.filter(s => s.title !== entry.title);
  _songHistory.unshift(entry);
  if(_songHistory.length > _MAX_HISTORY) _songHistory = _songHistory.slice(0, _MAX_HISTORY);
  
  // Persist to localStorage
  try {
    localStorage.setItem('hirsch_song_history', JSON.stringify(_songHistory));
  } catch(e) { console.warn('History save failed:', e.message); }

  updateHistoryUI();
}

function updateHistoryUI() {
  const container = document.getElementById('song-history-list');
  if(!container) return;
  
  if(_songHistory.length === 0) {
    container.innerHTML = `<p style="color:var(--text3);font-size:0.82rem;text-align:center;padding:12px;">
      ${currentLang==='de'?'Noch keine Songs — generiere deinen ersten Song!':'No songs yet — generate your first song!'}
    </p>`;
    return;
  }
  
  // v3.26.9: createElement statt onclick/onmouseover
  container.innerHTML = '';
  _songHistory.forEach(function(song) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;border:1px solid var(--border);margin-bottom:6px;transition:all 0.15s;';
    row.addEventListener('mouseenter', function() { row.style.background='var(--surface2)'; row.style.borderColor='var(--accent2)'; });
    row.addEventListener('mouseleave', function() { row.style.background=''; row.style.borderColor='var(--border)'; });
    row.addEventListener('click', function() { if(typeof window.loadSongFromHistory==='function') window.loadSongFromHistory(song.id); });

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';
    const title = document.createElement('div');
    title.style.cssText = 'font-size:0.85rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    title.textContent = '🎵 ' + song.title;
    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:0.72rem;color:var(--text3);';
    meta.textContent = song.genre + ' · ' + song.bpm + 'BPM · ' + song.key + ' · ' + song.timestamp;
    info.append(title, meta);

    const delBtn = document.createElement('button');
    delBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3);font-size:0.85rem;padding:4px;flex-shrink:0;';
    delBtn.title = 'Löschen';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if(typeof window.deleteSongFromHistory==='function') window.deleteSongFromHistory(song.id);
    });

    row.append(info, delBtn);
    container.appendChild(row);
  });
}

window.loadSongFromHistory = function(id) {
  const song = _songHistory.find(s => s.id === id);
  if(!song) return;
  
  const outputEl = document.getElementById('lyrics-output');
  const hintEl = document.getElementById('lyrics-empty-hint');
  if(outputEl) { outputEl.textContent = song.lyrics; outputEl.style.display='block'; }
  if(hintEl) hintEl.style.display = 'none';
  lastLyrics = song.lyrics;
  SONG.lyricsText = song.lyrics;
  
  const nameEl = document.getElementById('export-name');
  if(nameEl) nameEl.value = song.title;
  updateSongNameDisplay(song.title);
  
  addLyricsVersion(song.lyrics);
  switchTab('lyrics', document.querySelector('.tab-btn'));
  showToast(currentLang==='de'?`✓ "${song.title}" geladen`:`✓ "${song.title}" loaded`);
};

window.deleteSongFromHistory = function(id) {
  _songHistory = _songHistory.filter(s => s.id !== id);
  updateHistoryUI();
};

// Hook into AI lyrics generation to save to history
(function() {
  const _origGen = window.generateLyrics;
  if(typeof _origGen !== 'function') return;
  const _patched = window.generateLyrics;
  // Save after generation completes
  const observer = new MutationObserver(() => {
    const out = document.getElementById('lyrics-output');
    if(out && out.textContent && out.textContent.length > 100 && !out.querySelector('span')) {
      saveSongToHistory();
    }
  });
  const lyricsEl = document.getElementById('lyrics-output');
  if(lyricsEl) observer.observe(lyricsEl, {childList:true, subtree:true, characterData:true});
})();

// Add history panel to Workbench tab
(function addHistoryPanel() {
  setTimeout(() => {
    const wb = document.getElementById('tab-workbench');
    if(!wb || document.getElementById('song-history-card')) return;
    
    const card = document.createElement('div');
    card.id = 'song-history-card';
    card.className = 'card';
    card.style.cssText = 'margin-top:16px;';
    card.innerHTML = `
      <div class="card-title">
        <span data-de="📂 Song-Verlauf" data-en="📂 Song History">📂 Song-Verlauf</span>
        <span style="font-size:0.72rem;color:var(--text3);font-weight:400;margin-left:8px;" 
              data-de="(diese Sitzung)" data-en="(this session)">(diese Sitzung)</span>
      </div>
      <div id="song-history-list">
        <p style="color:var(--text3);font-size:0.82rem;text-align:center;padding:12px;">
          ${currentLang==='de'?'Noch keine Songs — generiere deinen ersten Song!':'No songs yet — generate your first song!'}
        </p>
      </div>
    `;
    // ── Generierungs-Verlauf Card ──────────────────────────────
    const historyCard = document.createElement('div');
    historyCard.className = 'card';
    historyCard.style.cssText = 'margin-bottom:16px;';
    historyCard.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div class="card-title" style="margin:0;">📜 ${isDE?'Generierungs-Verlauf':'Generation History'}</div>
        <button onclick="clearLyricsHistory()" class="btn btn-sm btn-outline" style="font-size:11px;">🗑 ${isDE?'Löschen':'Clear'}</button>
      </div>
      <div id="lyrics-history-list" style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;">
        <div style="color:var(--text3);font-size:0.82rem;text-align:center;padding:16px;">${isDE?'Noch keine Generierungen':'No generations yet'}</div>
      </div>
    `;
    // Insert before Ideen-Inbox (after Projekt-Speichern)
    const inboxCard = wb.querySelector('[data-de="💡 Ideen-Inbox"]')?.closest('.card');
    if(inboxCard) wb.insertBefore(card, inboxCard);
    else wb.appendChild(card);
  }, 600);
})();

console.log('✨ Hirsch Music v3.26.8 — Alle Verbesserungen geladen');


// ══ HirschModules.workbenchUI ════════════════════════════════════
window.HirschModules = window.HirschModules || {};

window.HirschModules.workbenchUI = (function() {

  function init() {
    if (typeof updateHistoryUI === 'function') updateHistoryUI();
    if (typeof _costTracker    !== 'undefined') _costTracker.updateUI();
  }

  function refreshHistory() {
    if (typeof updateHistoryUI === 'function') updateHistoryUI();
  }

  function refreshCosts() {
    if (typeof _costTracker !== 'undefined') _costTracker.updateUI();
  }

  return { init, refreshHistory, refreshCosts };
})();

console.log('[HirschModules.workbenchUI] ✅ geladen');
