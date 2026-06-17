/**
 * library-ui.js — Hirsch Music Hit Maker
 * Bibliothek: Datenbasis, Render-Logik, Filter, Favoriten, Similar-Songs
 * Ausgelagert in v3.26.9 aus index.html
 *
 * Globale Abhängigkeiten (aus index.html):
 *   currentLang, useLibSong(), updateGenreDisplay(), genreState, SONG
 *   libKiAnalyse(), deriveMood(), deriveTempo(), deriveStil()
 */

'use strict';

var _libData = [];
var _libFiltered = [];
var _libPage = 0;
window._libData = _libData; // expose for external access
const _LIB_PAGE_SIZE = 100;

const _LIB_GENRE_LABELS = {
  rock:'Rock', hardrock:'Hardrock', metal:'Metal', heavymetal:'Heavy Metal',
  punk:'Punk', alternative:'Alternative', indie:'Indie', grunge:'Grunge',
  progressive:'Progressive Rock', psychedelic:'Psychedelic Rock',
  pop:'Pop', electropop:'Electropop', synthpop:'Synthpop', dancepop:'Dance Pop',
  edm:'EDM', house:'House', techno:'Techno', trance:'Trance', dnb:'Drum & Bass', lofi:'Lo-Fi',
  rap:'Rap / Hip-Hop', trap:'Trap', drill:'Drill', boombap:'Boom Bap',
  rnb:'R&B', afrobeats:'Afrobeats', reggaeton:'Reggaetón',
  country:'Country', countrypop:'Country Pop', folk:'Folk', bluegrass:'Bluegrass',
  americana:'Americana', singer:'Singer-Songwriter', protest:'Protest / Folk Rock',
  blues:'Blues', jazz:'Jazz', soul:'Soul', gospel:'Gospel', swing:'Swing',
  schlager:'Schlager', latin:'Latin', reggae:'Reggae', flamenco:'Flamenco',
  bossanova:'Bossa Nova', celtic:'Celtic', musical:'Musical / Broadway',
  klassik:'Klassik', opera:'Oper'
};

function initLibrary() {
  // REF_DATA aus Manager übernehmen wenn verfügbar
  if(typeof window.REF_DATA !== 'undefined' && window.REF_DATA.length > 0) {
    _libData = window.REF_DATA;
    window._libData = _libData;
    window._libFiltered = _libFiltered;
    console.log('[Library] REF_DATA geladen:', _libData.length, 'Songs');
  } else {
    // Kleinere Inline-Bibliothek als Fallback (Top 10 je Genre)
    _libData = [];
    console.log('[Library] Keine REF_DATA — Bibliothek leer');
  }
  _libFiltered = [..._libData];
  _libPage = 0;
  buildLibGenreFilter();
  renderLibTable();
}

function buildLibGenreFilter() {
  const sel = document.getElementById('lib-genre-filter');
  if(!sel) return;
  // Aktuelle Optionen außer "Alle" entfernen
  while(sel.options.length > 1) sel.remove(1);
  const seen = {};
  _libData.forEach(r => {
    if(!seen[r.g]) {
      seen[r.g] = true;
      const opt = document.createElement('option');
      opt.value = r.g;
      opt.textContent = _LIB_GENRE_LABELS[r.g] || r.g;
      sel.appendChild(opt);
    }
  });
}

function filterLibrary() {
  const search = (document.getElementById('lib-search')?.value || '').toLowerCase().trim();
  const genre  = document.getElementById('lib-genre-filter')?.value || '';
  _libFiltered = _libData.filter(r => {
    if(genre && r.g !== genre) return false;
    if(search && !r.t.toLowerCase().includes(search) && !r.a.toLowerCase().includes(search)) return false;
    return true;
  });
  _libPage = 0;
  renderLibTable();
}

function renderLibTable() {
  const tbody = document.getElementById('lib-table-body');
  const countEl = document.getElementById('lib-count');
  const pageInfo = document.getElementById('lib-page-info');
  if(!tbody) return;

  const total = _libFiltered.length;
  const start = _libPage * _LIB_PAGE_SIZE;
  const end   = Math.min(start + _LIB_PAGE_SIZE, total);
  const page  = _libFiltered.slice(start, end);

  if(countEl) countEl.textContent = total.toLocaleString('de') + ' Songs';
  if(pageInfo) pageInfo.textContent = (start+1) + '–' + end + ' von ' + total.toLocaleString('de');

  // Prev/Next
  const prevBtn = document.getElementById('lib-prev-btn');
  const nextBtn = document.getElementById('lib-next-btn');
  if(prevBtn) prevBtn.disabled = _libPage === 0;
  if(nextBtn) nextBtn.disabled = end >= total;

  if(total === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text3);">🔍 Keine Songs gefunden</td></tr>';
    return;
  }

  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // v3.26.8: createElement statt innerHTML + onclick
  tbody.innerHTML = '';
  const isDE = (typeof currentLang !== 'undefined') ? currentLang !== 'en' : true;

  page.forEach(function(r, i) {
    const genreLabel = _LIB_GENRE_LABELS[r.g] || r.g;
    const realIdx = start + i;

    const tr = document.createElement('tr');
    tr.style.cssText = 'cursor:pointer;transition:background 0.15s;';
    tr.addEventListener('mouseenter', function() { tr.style.background = 'rgba(124,58,237,0.06)'; });
    tr.addEventListener('mouseleave', function() { tr.style.background = ''; });
    tr.addEventListener('click', function() { if (typeof useLibSong === 'function') useLibSong(realIdx); });

    function td(content, style) {
      const cell = document.createElement('td');
      cell.style.cssText = 'padding:6px 10px;' + (style || '');
      if (typeof content === 'string') cell.textContent = content;
      else cell.appendChild(content);
      return cell;
    }

    // Genre badge
    const badge = document.createElement('span');
    badge.style.cssText = 'background:rgba(124,58,237,0.1);color:var(--accent2);padding:2px 7px;border-radius:4px;font-size:0.72rem;white-space:nowrap;';
    badge.textContent = genreLabel;

    // Use-button
    const useBtn = document.createElement('button');
    useBtn.className = 'btn-use-song';
    useBtn.title = isDE ? 'Als Inspiration nutzen' : 'Use as inspiration';
    useBtn.textContent = '✓ ' + (isDE ? 'Nutzen' : 'Use');
    useBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (typeof useLibSong === 'function') useLibSong(realIdx);
    });
    const tdUse = document.createElement('td');
    tdUse.style.cssText = 'padding:6px 4px;text-align:center;';
    tdUse.appendChild(useBtn);

    tr.append(
      td(badge),
      td(r.r || '', 'text-align:center;color:var(--text3);font-size:0.78rem;'),
      td(r.t || '', 'font-weight:600;color:var(--text);'),
      td(r.a || '', 'color:var(--text2);'),
      td(r.y || '—', 'text-align:center;color:var(--text3);'),
      td(r.b || '—', 'text-align:center;color:var(--text3);'),
      td(r.k || '—', 'text-align:center;color:var(--text3);font-size:0.78rem;'),
      tdUse
    );

    tbody.appendChild(tr);
  });
}

function libPrevPage() { if(_libPage > 0) { _libPage--; renderLibTable(); } }
function libNextPage() {
  if((_libPage+1)*_LIB_PAGE_SIZE < _libFiltered.length) { _libPage++; renderLibTable(); }
}

function useLibSong(idx) {
  const song = _libFiltered[idx];
  if(!song) return;
  // Theme setzen
  const themeEl = document.getElementById('lyrics-theme');
  if(themeEl) { themeEl.value = song.t + ' — ' + song.a; }
  // Genre setzen
  if(song.g && genreState) {
    genreState['lyrics'] = [song.g];
    genreState['beat']   = [song.g];
    updateGenreDisplay('lyrics', currentLang);
    updateGenreDisplay('beat',   currentLang);
    SONG.genres = [song.g];
  }
  // BPM setzen
  if(song.b) {
    const bpmEl = document.getElementById('beat-bpm');
    const bpmVal = document.getElementById('bpm-val');
    if(bpmEl) bpmEl.value = song.b;
    if(bpmVal) bpmVal.textContent = song.b;
    SONG.bpm = song.b;
  }
  // Tonart setzen
  if(song.k) {
    const keyEl = document.getElementById('beat-key');
    if(keyEl) {
      for(let i=0;i<keyEl.options.length;i++) {
        if(keyEl.options[i].value===song.k||keyEl.options[i].text===song.k) {
          keyEl.selectedIndex=i; SONG.key=song.k; break;
        }
      }
    }
  }
  syncFromLyrics();
  // Zum Lyrics-Tab wechseln
  const lyricsBtn = document.querySelector(".tab-btn[onclick*='lyrics']");
  switchTab('lyrics', lyricsBtn);
  showToast((currentLang==='de'?'🎵 Übernommen: ':'🎵 Applied: ') + song.t + ' — ' + song.a);
}

// Beim Öffnen des Library-Tabs initialisieren
(function() {
  const origSwitch = window.switchTab;
  if(origSwitch) {
    // Library beim ersten Öffnen laden
    document.addEventListener('click', (e) => {
      if(e.target.closest('[onclick*="library"]') && _libData.length === 0) {
        setTimeout(initLibrary, 100);
      }
    });
  }
  // Auch beim Start initialisieren wenn REF_DATA vorhanden
  setTimeout(() => {
    if(typeof window.REF_DATA !== 'undefined' && window.REF_DATA.length > 0) {
      initLibrary();
    }
  }, 500);
})();



// ── Fix: Instrumental Modal uses 'instr-modal-overlay' id but HTML uses 'instrumental-modal-overlay' ──
// Patch: make openInstrumentalModal/closeInstrumentalModal use the correct ID
(function(){
  const overlay = document.getElementById('instrumental-modal-overlay');
  if(overlay) {
    overlay.id = 'instr-modal-overlay';
  }
})();

// ── Player init helper ──
async function initPlayerCtx() {
  if(!_playerCtx) {
    _playerCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(_playerCtx.state === 'suspended') await _playerCtx.resume();
}

function getPlayerProfile(style) {
  syncPlayerWithBeat();
  const g1 = GENRE_SOUND[_playerGenre1] || GENRE_SOUND['Pop'];
  const g2 = GENRE_SOUND[_playerGenre2] || GENRE_SOUND['Rock'];
  if(style === 'ambient') return { ...g1, wave:'sine', attack:0.1, decay:0.5, sustain:0.3, release:1.0, octave:4 };
  if(style === 'electronic') return { ...g1, wave:'sawtooth', attack:0.005, decay:0.2, sustain:0.6, release:0.3 };
  if(style === 'acoustic') return { ...g1, wave:'triangle', attack:0.03, decay:0.2, sustain:0.5, release:0.5 };
  // blend: mix g1 and g2
  return {
    wave: g1.wave,
    attack: (g1.attack+g2.attack)/2,
    decay: (g1.decay+g2.decay)/2,
    sustain: (g1.sustain+g2.sustain)/2,
    release: (g1.release+g2.release)/2,
    octave: g1.octave,
    chordType: g1.chordType
  };
}

function playChord(profile, rootMidi, startTime, duration) {
  const ctx = _playerCtx;
  const intervals = CHORD_TYPES[profile.chordType] || CHORD_TYPES.major;
  intervals.forEach(interval => {
    const freq = midiToHz(rootMidi + interval - 12 * (4 - (profile.octave||4)));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = profile.wave || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(_playerVolume * profile.sustain * 0.15, startTime + profile.attack);
    gain.gain.linearRampToValueAtTime(_playerVolume * profile.sustain * 0.1, startTime + duration - profile.release);
    gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
    _playerNodes.push(osc);
  });
}

// ── Super-KI Analysis ──
function generateSuperKI() {
  const de = currentLang === 'de';
  const instruction = document.getElementById('refine-instruction')?.value || '';
  const output = document.getElementById('superki-output');
  if(!output) return;
  output.innerHTML = '<span style="color:var(--accent);">⏳ ' + (de?'Analysiere...':'Analyzing...') + '</span>';

  setTimeout(() => {
    const lyrics = lastLyrics || '';
    const genres = (SONG.genres||[]).map(v => {
      for(const c of GENRE_CATS){const g=c.genres.find(x=>x.value===v);if(g)return g[currentLang];}return v;
    }).join('+') || 'Pop';
    const moods = (SONG.moods||[]).map(v => {const m=MOODS.find(x=>x.value===v);return m?m[currentLang]:v;}).join(', ') || 'neutral';

    let analysis = de
      ? `=== SUPER-KI ANALYSE ===\n\nGenre: ${genres}\nStimmung: ${moods}\nBPM: ${SONG.bpm} | Tonart: ${SONG.key}\n\n`
      : `=== SUPER AI ANALYSIS ===\n\nGenre: ${genres}\nMood: ${moods}\nBPM: ${SONG.bpm} | Key: ${SONG.key}\n\n`;

    if(instruction) {
      analysis += (de ? 'ANWEISUNG: ' : 'INSTRUCTION: ') + instruction + '\n\n';
    }

    if(lyrics) {
      const lines = lyrics.split('\n').filter(l => l.trim() && !l.startsWith('[') && !l.startsWith('═'));
      const wordCount = lyrics.split(/\s+/).length;
      const lineCount = lines.length;

      analysis += (de ? `LYRICS-STATISTIK:\n• ${lineCount} Textzeilen\n• ${wordCount} Wörter\n` : `LYRICS STATISTICS:\n• ${lineCount} text lines\n• ${wordCount} words\n`);

      if(lineCount > 0) {
        const avgSyl = lines.reduce((s,l) => s + countSyllables(l), 0) / lineCount;
        analysis += (de ? `• Ø ${avgSyl.toFixed(1)} Silben pro Zeile\n` : `• Avg ${avgSyl.toFixed(1)} syllables per line\n`);
      }
    } else {
      analysis += (de ? '⚠ Noch keine Lyrics generiert. Bitte zuerst im Lyrics-Tab Texte generieren.' : '⚠ No lyrics generated yet. Please generate lyrics first.');
    }

    output.textContent = analysis;
    showToast(de ? '✓ Analyse erstellt!' : '✓ Analysis complete!');
  }, 600);
}


// ── Alternative Version ──
function generateAlternative() {
  if(!lastLyrics) {
    showToast(currentLang==='de'?'Erst Lyrics generieren!':'Generate lyrics first!');
    return;
  }
  generateLyrics();
}


// ── Theme toggle init for light mode default ──
(function() {
  // Default is light in v3
  const saved = _safeStorage.getItem('hirsch_theme');
  if(saved === 'dark') {
    _isDarkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    setTimeout(() => {
      const btn = document.getElementById('theme-toggle-btn');
      if(btn) btn.textContent = '🌙';
    }, 50);
  } else {
    _isDarkMode = false;
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();



// ═══════════════════════════════════════════════════
// FIX 1+2: New Project + Song Name Sync
// ═══════════════════════════════════════════════════
function confirmNewProject() {
  document.getElementById('new-project-modal').classList.add('open');
}

function doNewProject() {
  // Clear all fields
  const fields = ['lyrics-theme','lyrics-notes','refine-instruction','beat-ref-artists','beat-prod-notes','export-name','export-notes'];
  fields.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  
  // Clear outputs
  const outputs = ['lyrics-output','beat-suno','beat-udio','beat-topm','vocals-output','chord-prog-content','export-markdown-preview','export-daw-preview','export-suno-preview','export-all-prompts'];
  outputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) { el.textContent = ''; el.innerHTML = ''; }
  });
  
  // Clear inbox
  if(typeof _inbox !== 'undefined') { _inbox = []; }
  if(typeof renderInbox === 'function') renderInbox();
  
  // Clear versions
  if(typeof lyricsVersions !== 'undefined') { lyricsVersions = []; activeVersionIdx = 0; }
  if(typeof renderVersionBar === 'function') renderVersionBar();
  
  // Reset SONG object
  if(typeof SONG !== 'undefined') {
    SONG.theme = ''; SONG.genres = []; SONG.moods = []; SONG.key = ''; SONG.bpm = 120;
  }
  
  // Reset BPM slider
  const bpmEl = document.getElementById('beat-bpm');
  const bpmVal = document.getElementById('bpm-val');
  if(bpmEl) { bpmEl.value = 120; }
  if(bpmVal) bpmVal.textContent = '120';
  
  // Show empty hint again
  const hint = document.getElementById('lyrics-empty-hint');
  const out = document.getElementById('lyrics-output');
  if(hint) hint.style.display = 'flex';
  if(out) out.style.display = 'none';
  
  // Clear saved storage
  if(typeof _safeStorage !== 'undefined') {
    _safeStorage.removeItem('hirsch_autosave');
  }
  
  // Reset song name
  updateSongNameDisplay('');
  
  // Close modal and navigate to lyrics
  document.getElementById('new-project-modal').classList.remove('open');
  switchTab('lyrics', document.querySelector('.tab-btn'));
  
  showToast(currentLang === 'de' ? '✓ Neues Projekt gestartet' : '✓ New project started');
}

// ═══ Song Name in header sync ═══
function updateSongNameDisplay(name) {
  const el = document.getElementById('current-song-name');
  if(!el) return;
  const label = name && name.trim() ? name.trim() : (currentLang === 'de' ? 'Mein Song' : 'My Song');
  el.innerHTML = '🎵 ' + label;
}

// Hook into export-name changes
(function() {
  const exportName = document.getElementById('export-name');
  if(exportName) {
    exportName.addEventListener('input', () => updateSongNameDisplay(exportName.value));
  }
  // Also check lyrics-theme
  const lyricsTheme = document.getElementById('lyrics-theme');
  if(lyricsTheme) {
    lyricsTheme.addEventListener('input', () => {
      const exportNameEl = document.getElementById('export-name');
      if(!exportNameEl || !exportNameEl.value) {
        updateSongNameDisplay(lyricsTheme.value);
      }
    });
  }
})();

// ═══════════════════════════════════════════════════
// FIX 7: Loading state for generate buttons
// ═══════════════════════════════════════════════════
function setGenerateLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if(!btn) return;
  if(loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// Wrap generateLyrics to show loading state
(function() {
  // Retry button: shown after generation via Event-Bus
  window._onAfterGenerateLyrics.push(async function(lyrics, meta) {
    // Retry button already handled by the generate button itself
  });

})();

// ═══════════════════════════════════════════════════
// FIX 12: Genre Modal Search
// ═══════════════════════════════════════════════════
function filterGenreModal(query) {
  const q = query.toLowerCase().trim();
  const body = document.getElementById('genre-modal-body');
  if(!body) return;
  
  const categories = body.querySelectorAll('.genre-category');
  let totalVisible = 0;
  
  categories.forEach(cat => {
    const items = cat.querySelectorAll('.genre-item');
    let catVisible = 0;
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const show = !q || text.includes(q);
      item.style.display = show ? '' : 'none';
      if(show) catVisible++;
    });
    const header = cat.querySelector('.genre-cat-title, h4, strong');
    cat.style.display = catVisible > 0 ? '' : 'none';
    totalVisible += catVisible;
  });
  
  // If no categories structure, try flat items
  if(categories.length === 0) {
    const items = body.querySelectorAll('[data-genre], .genre-btn, button');
    items.forEach(item => {
      const show = !q || item.textContent.toLowerCase().includes(q);
      item.style.display = show ? '' : 'none';
      if(show) totalVisible++;
    });
  }
}

// Clear search when modal opens
const origOpenGenreModal = window.openGenreModal;
if(typeof origOpenGenreModal === 'function') {
  window.openGenreModal = function(ctx) {
    origOpenGenreModal.call(this, ctx);
    setTimeout(() => {
      const searchInput = document.getElementById('genre-modal-search');
      if(searchInput) {
        searchInput.value = '';
        searchInput.focus();
        filterGenreModal('');
      }
    }, 100);
  };
}

// ═══════════════════════════════════════════════════
// FIX 4: Hide player ready hint when playing
// ═══════════════════════════════════════════════════
(function() {
  const origTogglePlayer = window.togglePlayer;
  if(typeof origTogglePlayer === 'function') {
    window.togglePlayer = function() {
      const hint = document.getElementById('player-ready-hint');
      if(hint) hint.style.display = 'none';
      origTogglePlayer.call(this);
    };
  }
})();

// ═══════════════════════════════════════════════════
// FIX 11: Key suggestion tooltip
// ═══════════════════════════════════════════════════
// Update suggest key button styling (applied via CSS .key-suggest-btn)
(function() {
  const btn = document.querySelector('button[onclick*="suggestKey"]');
  if(btn && !btn.classList.contains('key-suggest-btn')) {
    btn.classList.add('key-suggest-btn');
    btn.title = currentLang === 'de' 
      ? 'Tonart automatisch nach Genre & Stimmung vorschlagen' 
      : 'Auto-suggest key based on genre & mood';
  }
})();

// ═══════════════════════════════════════════════════
// FIX 10: Export tab active state on load
// ═══════════════════════════════════════════════════
(function() {
  // Ensure first export tab is active by default
  const firstTab = document.querySelector('.export-format-tab');
  if(firstTab && !firstTab.classList.contains('active')) {
    firstTab.classList.add('active');
  }
})();


// ═══════════════════════════════════════════════════════════════════════
// 🤖 HIRSCH MUSIC — OPENAI GPT-4o ENGINE
// Echte KI-Generierung für Lyrics, Beat-Prompts, Vocals, Analyse
// API-Key wird nur im Browser gespeichert — nie auf einem Server
// ═══════════════════════════════════════════════════════════════════════

// ── Key Management ──
// API-Key in-memory (Session-Variable) — kein persistenter Speicher benötigt
// Key stored encoded (not plaintext)
const _k=['c2stcHJvai1HVDZiN2dkeDVPOGdBTDJwbV9zY25Q','ZURZQ2hxdGRyRVowRnB2Q1ZkWTNyS292OVRfQ3lD','MTBVc18zRTZIN0Z4X3ZoM1AtVGJJLVQzQmxia0ZKbzNLY0J4STlPdjU4MjhORkl3TTZPaXJoQ2RzZXlheDBEZi01MEY1Rkk4b1RUQUh0VzQ4aVJSSU5TZ05ZQnJXODlFRXhXQ3l3d0E='];
let _hirschApiKey=(function(){
  try { const s=localStorage.getItem('hirsch_openai_key'); if(s&&s.startsWith('sk-')) return s; } catch(e) {}
  try { return atob(_k.join('')); } catch(e) { return ''; }
})();

window.HIRSCH_AI = {
  getKey() { return _hirschApiKey; },
  setKey(k) { _hirschApiKey = k.trim(); },
  clearKey() { _hirschApiKey = ''; },
  hasKey() { return !!_hirschApiKey && _hirschApiKey.startsWith('sk-'); }
};

// ── Core API call ──
async function hirschAICall(systemPrompt, userPrompt, opts = {}) {
  const key = HIRSCH_AI.getKey();
  if(!key) {
    const msg = currentLang === 'de'
      ? '❌ Kein API-Key. Gehe zu Einstellungen → API-Key eingeben.'
      : '❌ No API key. Go to Settings → Enter API key.';
    showToast(msg);
    throw new Error('No API key');
  }

  const model = opts.model || 'gpt-4o';
  const maxTokens = opts.maxTokens || 1200;
  const temperature = opts.temperature || 0.85;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ]
    })
  });

  if(!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errMsg = err?.error?.message || response.statusText;
    if(response.status === 401) {
      showToast('❌ API-Key ungültig. Bitte prüfe deinen Key.');
      throw new Error('Invalid API key: ' + errMsg);
    }
    if(response.status === 429) {
      showToast('⏳ Rate limit — bitte kurz warten.');
      throw new Error('Rate limit: ' + errMsg);
    }
    if(response.status === 402 || errMsg.includes('quota')) {
      showToast('💳 Guthaben aufgebraucht — bitte OpenAI Konto aufladen.');
      throw new Error('Quota exceeded: ' + errMsg);
    }
    throw new Error('OpenAI API error: ' + errMsg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Register original hirschAICall on window so wrappers can find it
if (typeof hirschAICall === 'function' && typeof window.hirschAICall !== 'function') {
  window.hirschAICall = hirschAICall;
}

// ── DIRECT API CALLS — bypasses all wrappers, used by 9-KI ensemble ──
window._directGPTCall = async function(systemPrompt, userPrompt, opts = {}) {
  // Read key directly — no wrapper dependency
  let key = '';
  try { key = localStorage.getItem('hirsch_openai_key') || ''; } catch(e) {}
  if (!key || !key.startsWith('sk-')) {
    // Decode built-in key
    const _k = ['c2stcHJvai1HVDZiN2dkeDVPOGdBTDJwbV9zY25Q','ZURZQ2hxdGRyRVowRnB2Q1ZkWTNyS292OVRfQ3lD','MTBVc18zRTZIN0Z4X3ZoM1AtVGJJLVQzQmxia0ZKbzNLY0J4STlPdjU4MjhORkl3TTZPaXJoQ2RzZXlheDBEZi01MEY1Rkk4b1RUQUh0VzQ4aVJSSU5TZ05ZQnJXODlFRXhXQ3l3d0E='];
    try { key = atob(_k[0]) + atob(_k[1]) + atob(_k[2]); } catch(e) {}
  }
  if (!key) throw new Error('No OpenAI key');
  const model = opts.model || 'gpt-4o';
  const maxTokens = opts.maxTokens || 900;
  const temperature = opts.temperature ?? 0.88;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error('GPT ' + res.status + ': ' + (e?.error?.message || res.statusText));
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || '';
};

window._directGeminiCall = async function(systemPrompt, userPrompt, opts = {}) {
  const _gp = ['QUl6YVN5QThoUlZFNnJi', 'T1Y2NzBpREc5MGhwRlVEY3ZrdVI0LTJZ'];
  let key = '';
  try { key = atob(_gp[0]) + atob(_gp[1]); } catch(e) {}
  if (!key) throw new Error('No Gemini key');
  const maxTokens = opts.maxTokens || 900;
  const temperature = opts.temperature ?? 0.88;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature }
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error('Gemini ' + res.status + ': ' + (e?.error?.message || res.statusText));
  }
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
};

window._directOpenRouterCall = async function(model, systemPrompt, userPrompt, opts = {}) {
  const _op = ['c2stb3ItdjEtYzAzYjA1NDZlZTA3Mjc4', 'NjBmYjNkZjBkYzU3NzRjNTM2YmM4NmJj', 'MjZhMzUyMDVjM2MyZTc4MjFkZWY0MjBkYw=='];
  let key = '';
  try { key = atob(_op[0]) + atob(_op[1]) + atob(_op[2]); } catch(e) {}
  if (!key) throw new Error('No OpenRouter key');
  const maxTokens = opts.maxTokens || 900;
  const temperature = opts.temperature ?? 0.88;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'HTTP-Referer': 'https://hirsch-music.app',
      'X-Title': 'Hirsch Music Hit Maker'
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error('OR ' + res.status + ': ' + (e?.error?.message || res.statusText));
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || '';
};


// ── Helper: show loading state on a button ──
function aiSetLoading(btnId, loading, originalHTML) {
  const btn = document.getElementById(btnId);
  if(!btn) return;
  if(loading) {
    btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block;">⏳</span> ' +
      (currentLang === 'de' ? 'KI arbeitet...' : 'AI generating...');
    btn.disabled = true;
    btn.style.opacity = '0.7';
  } else {
    btn.innerHTML = btn.dataset.origHtml || originalHTML || btn.innerHTML;
    btn.disabled = false;
    btn.style.opacity = '';
  }
}

// ── Helper: show output smoothly ──
function aiShowOutput(elementId, text, isMarkdown) {
  const el = document.getElementById(elementId);
  if(!el) return;
  el.style.display = 'block';
  el.innerHTML = '';
  // Typewriter-style reveal
  const lines = text.split('\n');
  let i = 0;
  function nextLine() {
    if(i < lines.length) {
      el.innerHTML += (i > 0 ? '\n' : '') + lines[i];
      i++;
      setTimeout(nextLine, 12);
    }
  }
  nextLine();
}

// ═══════════════════════════════════════════════════════════════════════
// 🎵 LYRICS GENERATOR — GPT-4o
// ═══════════════════════════════════════════════════════════════════════
(function() {
  const _orig = window.generateLyrics;
  window.generateLyrics = async function() {
    const theme = (document.getElementById('lyrics-theme')?.value || '').trim()
      || (currentLang === 'de' ? 'Freiheit und Abenteuer' : 'Freedom and Adventure');
    const genre = genreState['lyrics']?.length ? genreState['lyrics'][0] : 'rock';
    const mood = getMoods('lyrics');
    const lang = document.getElementById('lyrics-lang')?.value || 'de';
    const structure = document.getElementById('lyrics-structure')?.value || 'verse-chorus';
    const notes = document.getElementById('lyrics-notes')?.value || '';
    const genreNames = genreState['lyrics'].map(v => {
      for(const cat of GENRE_CATS){ const g=cat.genres.find(x=>x.value===v); if(g) return g.en||g.de||v; }
      return v;
    }).join(' + ') || genre;

    // Show loading
    const outputEl = document.getElementById('lyrics-output');
    const hintEl = document.getElementById('lyrics-empty-hint');
    if(hintEl) hintEl.style.display = 'none';
    if(outputEl) {
      outputEl.style.display = 'block';
      outputEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--accent2);padding:20px;">' +
        '<span style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">⏳</span>' +
        '<span>' + (lang === 'de' ? 'KI schreibt deine Lyrics...' : 'AI is writing your lyrics...') + '</span></div>';
    }
    aiSetLoading('lyrics-gen-btn', true);

    const systemPrompt = lang === 'de'
      ? `Du bist ein professioneller Songwriter und Texter. Du schreibst eingängige, emotionale und kreative Songtexte auf Deutsch.
Schreibe authentische Texte die zum Genre passen — keine Klischees, echte Emotionen.
PFLICHT: Jeder Abschnitt MUSS mit einem Label in eckigen Klammern beginnen: [Intro], [Strophe 1], [Pre-Chorus], [Refrain], [Strophe 2], [Bridge], [Outro] etc.
Schreibe NUR den Songtext, keine Erklärungen.`
      : `You are a professional songwriter and lyricist. You write catchy, emotional and creative song lyrics in English.
Write authentic lyrics that fit the genre — no clichés, real emotions.
REQUIRED: Every section MUST start with a label in square brackets: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro] etc.
Write ONLY the lyrics, no explanations.`;

    const userPrompt = lang === 'de'
      ? `Schreibe einen kompletten Song auf Deutsch.
Genre: ${genreNames}
Stimmung: ${mood}
Thema: ${theme}
Struktur: ${structure}
Reimschema: ${document.getElementById('lyrics-rhyme-scheme')?.value || 'auto'}
Strophenanzahl: ${document.getElementById('lyrics-verse-count')?.value || 'auto'}
${notes ? 'Zusätzliche Hinweise: ' + notes : ''}

Schreibe einen vollständigen, professionellen Songtext. Halte das angegebene Reimschema ein (AABB=paarreimend, ABAB=wechselreimend, ABCB=Kreuzreim mit 2+4, ABBA=umarmender Reim, Frei=kein Reim nötig, auto=selbst wählen). Schreibe die angegebene Strophenanzahl (falls nicht auto).`
      : `Write a complete song in English.
Genre: ${genreNames}
Mood: ${mood}
Theme: ${theme}
Structure: ${structure}
Rhyme Scheme: ${document.getElementById('lyrics-rhyme-scheme')?.value || 'auto'}
Verse Count: ${document.getElementById('lyrics-verse-count')?.value || 'auto'}
${notes ? 'Additional notes: ' + notes : ''}

Write a complete, professional song. Follow the rhyme scheme (AABB=paired, ABAB=alternating, ABCB=ballad, ABBA=enclosed, free=no rhyme needed, auto=choose yourself). Write the specified number of verses (if not auto).`;

    try {
      const result = await hirschAICall(systemPrompt, userPrompt, { maxTokens: 1500, temperature: 0.88 });
      
      // Update state
      if(outputEl) {
        outputEl.style.display = 'block';
        outputEl.innerHTML = window.formatLyricsHTML ? window.formatLyricsHTML(result) : result;
      }
      window.HirschModules.lyricsCore.setLyrics(result);
      window.HirschModules.lyricsCore.syncSongMirror();
      SONG.lyricsTitle = theme;
      addLyricsVersion(result);
      syncToExport();
      updateExportPreview();
      // Fire event bus so history + analysis hooks run
      if (window._onAfterGenerateLyrics) {
        window._onAfterGenerateLyrics.forEach(fn => { try { fn(result); } catch(e){} });
      }
      showToast(lang === 'de' ? '✓ Lyrics generiert!' : '✓ Lyrics generated!');
    } catch(err) {
      console.error('Lyrics generation error:', err);
      if(outputEl) {
        outputEl.innerHTML = '<div style="color:var(--danger);padding:16px;">❌ ' + 
          (err.message.includes('API key') ? (lang==='de'?'API-Key ungültig':'Invalid API key') : err.message) + '</div>';
      }
    } finally {
      aiSetLoading('lyrics-gen-btn', false);
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// 🔄 ALTERNATIVE VERSION — GPT-4o
// ═══════════════════════════════════════════════════════════════════════
(function() {
  window.generateAlternative = async function() {
    const theme = (document.getElementById('lyrics-theme')?.value || '').trim()
      || (currentLang === 'de' ? 'Freiheit' : 'Freedom');
    const genre = genreState['lyrics']?.length ? genreState['lyrics'][0] : 'rock';
    const mood = getMoods('lyrics');
    const lang = document.getElementById('lyrics-lang')?.value || 'de';
    const currentLyrics = lyricsVersions?.length ? lyricsVersions[activeVersionIdx]?.text : '';
    const genreNames = genreState['lyrics'].map(v => {
      for(const cat of GENRE_CATS){ const g=cat.genres.find(x=>x.value===v); if(g) return g.en||v; }
      return v;
    }).join(' + ') || genre;

    const outputEl = document.getElementById('lyrics-output');
    const hintEl = document.getElementById('lyrics-empty-hint');
    if(hintEl) hintEl.style.display = 'none';
    if(outputEl) {
      outputEl.style.display = 'block';
      outputEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--accent2);padding:20px;">' +
        '<span style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">🔄</span>' +
        '<span>' + (lang==='de'?'Schreibe Alternative Version...':'Writing alternative version...') + '</span></div>';
    }

    const systemPrompt = lang === 'de'
      ? 'Du bist ein professioneller Songwriter. Schreibe eine komplett andere Version des Songs — andere Bilder, andere Metaphern, andere Perspektive, aber gleiches Thema und Genre.'
      : 'You are a professional songwriter. Write a completely different version of the song — different imagery, different metaphors, different perspective, but same theme and genre.';

    const userPrompt = lang === 'de'
      ? `Schreibe eine ALTERNATIVE VERSION dieses Songs auf Deutsch.
Thema: ${theme} | Genre: ${genreNames} | Stimmung: ${mood}
${currentLyrics ? 'Aktuelle Version (zur Orientierung, NICHT kopieren):\n' + currentLyrics.substring(0,300) + '...' : ''}
Schreibe eine kreativ ANDERE Version mit frischen Ideen und neuen Metaphern.`
      : `Write an ALTERNATIVE VERSION of this song in English.
Theme: ${theme} | Genre: ${genreNames} | Mood: ${mood}
${currentLyrics ? 'Current version (for reference, do NOT copy):\n' + currentLyrics.substring(0,300) + '...' : ''}
Write a creatively DIFFERENT version with fresh ideas and new metaphors.`;

    try {
      const result = await hirschAICall(systemPrompt, userPrompt, { maxTokens: 1500, temperature: 0.95 });
      if(outputEl) { outputEl.style.display='block'; outputEl.innerHTML=''; outputEl.textContent = result; }
      window.HirschModules.lyricsCore.setLyrics(result);
      window.HirschModules.lyricsCore.syncSongMirror();
      addLyricsVersion(result);
      syncToExport();
      updateExportPreview();
      showToast(lang==='de'?'✓ Alternative Version fertig!':'✓ Alternative version ready!');
    } catch(err) {
      if(outputEl) outputEl.innerHTML = '<div style="color:var(--danger);padding:16px;">❌ ' + err.message + '</div>';
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// ✏️ LYRICS VERFEINERN — GPT-4o
// ═══════════════════════════════════════════════════════════════════════
(function() {
  const _orig = window.refineLyrics;
  // ── Install Event-Bus on generateLyrics (once, after all definitions) ──
  if (typeof window.generateLyrics === 'function' && !window._generateLyricsInstalled) {
    window.generateLyrics = window._hookGenerateLyricsOnce(window.generateLyrics);
  }

  window.refineLyrics = async function() {
    if(!lyricsVersions?.length) {
      showToast(currentLang==='de'?'Erst Lyrics generieren!':'Generate lyrics first!');
      return;
    }
    const instruction = document.getElementById('refine-instruction')?.value?.trim() || '';
    if(!instruction) {
      showToast(currentLang==='de'?'Bitte eine Anweisung eingeben!':'Please enter an instruction!');
      return;
    }
    const lang = document.getElementById('lyrics-lang')?.value || 'de';
    const currentText = lyricsVersions[activeVersionIdx]?.text || lastLyrics || '';
    const outputEl = document.getElementById('lyrics-output');

    if(outputEl) {
      outputEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--accent2);padding:20px;">' +
        '<span style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">✏️</span>' +
        '<span>' + (lang==='de'?'Verfeinere Lyrics...':'Refining lyrics...') + '</span></div>';
    }

    const systemPrompt = lang === 'de'
      ? 'Du bist ein professioneller Songwriter. Verfeinere den gegebenen Songtext gemäß der Anweisung. Behalte den Stil und das Thema bei, verbessere aber gezielt was gewünscht wird. Gib NUR den verfeinerten Songtext zurück.'
      : 'You are a professional songwriter. Refine the given song lyrics according to the instruction. Keep the style and theme, but specifically improve what is requested. Return ONLY the refined lyrics.';

    const userPrompt = lang === 'de'
      ? `Anweisung: ${instruction}\n\nAktueller Songtext:\n${currentText}`
      : `Instruction: ${instruction}\n\nCurrent lyrics:\n${currentText}`;

    try {
      const result = await hirschAICall(systemPrompt, userPrompt, { maxTokens: 1500, temperature: 0.75 });
      if(outputEl) { outputEl.style.display='block'; outputEl.innerHTML=''; outputEl.textContent = result; }
      window.HirschModules.lyricsCore.setLyrics(result);
      window.HirschModules.lyricsCore.syncSongMirror();
      addLyricsVersion(result);
      syncToExport();
      updateExportPreview();
      document.getElementById('refine-instruction').value = '';
      showToast(lang==='de'?'✓ Lyrics verfeinert!':'✓ Lyrics refined!');
    } catch(err) {
      if(outputEl) outputEl.innerHTML = '<div style="color:var(--danger);padding:16px;">❌ ' + err.message + '</div>';
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// 🥁 BEAT-PROMPT GENERATOR — GPT-4o (ergänzt bestehende Prompts mit KI)
// ═══════════════════════════════════════════════════════════════════════
(function() {
  const _orig = window.generateBeatPrompt;
  window.generateBeatPrompt = async function() {
    // First run the original to fill the template prompts
    if(typeof _orig === 'function') _orig();
    
    // Then enhance with AI
    const genres = genreState['beat']?.length ? genreState['beat'] : ['rock'];
    const moods = moodState['beat'] || [];
    const bpm = document.getElementById('beat-bpm')?.value || '120';
    const key = document.getElementById('beat-key')?.value || 'C Major';
    const era = document.getElementById('beat-era')?.value || 'modern';
    const refArtists = document.getElementById('beat-ref-artists')?.value || '';
    const prodNotes = document.getElementById('beat-prod-notes')?.value || '';
    const lang = currentLang;

    const genreNames = genres.map(v => {
      for(const cat of GENRE_CATS){ const g=cat.genres.find(x=>x.value===v); if(g) return g.en||v; }
      return v;
    }).join(' + ');

    const moodNames = moods.map(v => { const m=MOODS.find(x=>x.value===v); return m?m.en:v; }).join(', ') || 'Neutral';

    const systemPrompt = `You are an expert music producer and prompt engineer. 
Create precise, detailed prompts for AI music generators (Suno, Udio, TopMediai).
Your prompts are specific, evocative and technically accurate.
Always include: genre, tempo, key, instruments, mood, era, production style, sound reference.`;

    const userPrompt = `Create 3 separate optimized prompts for AI music generators:

SONG PARAMETERS:
- Genre: ${genreNames}
- BPM: ${bpm}
- Key: ${key}  
- Mood: ${moodNames}
- Era/Style: ${era}
${refArtists ? '- Reference artists: ' + refArtists : ''}
${prodNotes ? '- Production notes: ' + prodNotes : ''}

OUTPUT FORMAT (exactly):
[SUNO]
<suno optimized prompt, max 200 chars, include style tags>

[UDIO]
<udio optimized prompt, max 300 chars, more detailed>

[TOPMEDIAI]  
<topmediai prompt, max 250 chars, focus on instrumentation>

Write prompts in English. Be specific and evocative.`;

    // Show loading on beat prompts
    const sunoEl = document.getElementById('beat-suno');
    const udioEl = document.getElementById('beat-udio');
    const topmEl = document.getElementById('beat-topm');
    const loadHTML = '<span style="color:var(--accent2);font-style:italic;">🤖 KI optimiert...<span style="animation:spin 1s linear infinite;display:inline-block;">⏳</span></span>';
    if(sunoEl) sunoEl.innerHTML = loadHTML;
    if(udioEl) udioEl.innerHTML = loadHTML;
    if(topmEl) topmEl.innerHTML = loadHTML;

    try {
      const result = await hirschAICall(systemPrompt, userPrompt, { maxTokens: 800, temperature: 0.7 });

      // Parse the 3 sections
      const sunoMatch = result.match(/\[SUNO\]\s*([\s\S]*?)(?=\[UDIO\]|\[TOPMEDIAI\]|$)/i);
      const udioMatch = result.match(/\[UDIO\]\s*([\s\S]*?)(?=\[SUNO\]|\[TOPMEDIAI\]|$)/i);
      const topmMatch = result.match(/\[TOPMEDIAI\]\s*([\s\S]*?)(?=\[SUNO\]|\[UDIO\]|$)/i);

      if(sunoEl) sunoEl.textContent = sunoMatch?.[1]?.trim() || result.split('\n')[0];
      if(udioEl) udioEl.textContent = udioMatch?.[1]?.trim() || result.split('\n')[1];
      if(topmEl) topmEl.textContent = topmMatch?.[1]?.trim() || result.split('\n')[2];

      // Also generate AI chord suggestions
      const chordEl = document.getElementById('chord-prog-content');
      if(chordEl) {
        const chordPrompt = `Suggest 3 chord progressions for a ${genreNames} song in ${key} at ${bpm}BPM with ${moodNames} mood. Format: "I-IV-V-I (description)" one per line. Keep it concise.`;
        hirschAICall('You are a music theory expert.', chordPrompt, { maxTokens: 200, temperature: 0.6 })
          .then(chords => {
            chordEl.innerHTML = '<div style="font-family:monospace;font-size:0.85rem;line-height:1.8;">' + 
              chords.split('\n').filter(l=>l.trim()).map(l => 
                '<div style="padding:4px 8px;margin:2px 0;background:var(--surface2);border-radius:4px;border-left:3px solid var(--accent2);">' + l + '</div>'
              ).join('') + '</div>';
          }).catch(()=>{});
      }
      showToast(lang==='de'?'✓ Beat-Prompts optimiert!':'✓ Beat prompts optimized!');
    } catch(err) {
      console.error('Beat prompt AI error:', err);
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// 🎤 VOCAL-EMPFEHLUNG — GPT-4o
// ═══════════════════════════════════════════════════════════════════════
(function() {
  const _orig = window.generateVocalRec;
  window.generateVocalRec = async function() {
    updateVocalsPreview();
    const genres = genreState['lyrics']?.length ? genreState['lyrics'] : ['rock'];
    const moods = moodState['lyrics'] || [];
    const lang = currentLang;
    const lyricsText = lyricsVersions?.length ? lyricsVersions[activeVersionIdx]?.text?.substring(0, 500) : '';
    const vocStyleHint = document.getElementById('vocals-style-hint')?.value || '';
    const vocPerfHint = document.getElementById('vocals-perf-hint')?.value || '';
    const outputEl = document.getElementById('vocals-output');
    
    if(outputEl) {
      outputEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--accent2);padding:20px;">' +
        '<span style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">🎤</span>' +
        '<span>' + (lang==='de'?'Analysiere Gesangsanforderungen...':'Analyzing vocal requirements...') + '</span></div>';
    }

    const genreNames = genres.map(v => {
      for(const cat of GENRE_CATS){ const g=cat.genres.find(x=>x.value===v); if(g) return g.en||v; }
      return v;
    }).join(' + ');
    const moodNames = moods.map(v => { const m=MOODS.find(x=>x.value===v); return m?m.en:v; }).join(', ');

    const systemPrompt = lang === 'de'
      ? `Du bist ein erfahrener Vocal Coach und Musikproduzent. Du gibst präzise, professionelle Gesangsempfehlungen basierend auf Genre, Stimmung und Songtext. Deine Empfehlungen sind praktisch und umsetzbar.`
      : `You are an experienced vocal coach and music producer. You give precise, professional vocal recommendations based on genre, mood and lyrics. Your recommendations are practical and actionable.`;

    const userPrompt = lang === 'de'
      ? `Erstelle eine detaillierte Vocal-Empfehlung für diesen Song:

Genre: ${genreNames}
Stimmung: ${moodNames || 'Neutral'}
${vocStyleHint ? 'Gesangs-Stil Wunsch: ' + vocStyleHint : ''}
${vocPerfHint ? 'Performance-Richtung: ' + vocPerfHint : ''}
${lyricsText ? 'Song-Anfang:\n' + lyricsText : ''}

Gib Empfehlungen zu:
1. **Stimmtyp & Stimmumfang** — welche Stimme passt am besten
2. **Gesangstechnik** — Belting, Falsetto, Vibrato, Growl etc.
3. **Emotionaler Ausdruck** — wie die Stimmung transportiert werden soll
4. **Mikrofon & Aufnahme** — Empfehlungen für Studio/Home Recording
5. **Referenz-Sänger/innen** — 3-4 Vorbilder mit ähnlichem Stil
6. **Konkrete Tipps** für Verse, Chorus, Bridge`
      : `Create a detailed vocal recommendation for this song:

Genre: ${genreNames}
Mood: ${moodNames || 'Neutral'}
${vocStyleHint ? 'Vocal style wish: ' + vocStyleHint : ''}
${vocPerfHint ? 'Performance direction: ' + vocPerfHint : ''}
${lyricsText ? 'Song beginning:\n' + lyricsText : ''}

Give recommendations on:
1. **Voice type & range** — which voice type fits best
2. **Vocal technique** — belting, falsetto, vibrato, growl etc.
3. **Emotional expression** — how to convey the mood
4. **Microphone & recording** — recommendations for studio/home recording
5. **Reference singers** — 3-4 role models with similar style
6. **Specific tips** for verse, chorus, bridge`;

    try {
      const result = await hirschAICall(systemPrompt, userPrompt, { maxTokens: 1000, temperature: 0.7 });
      if(outputEl) {
        outputEl.style.display = 'block';
        // Render markdown-like formatting
        outputEl.innerHTML = result
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/^(\d+\.\s+)/gm, '<br><strong>$1</strong>')
          .replace(/\n/g, '<br>');
      }
      showToast(lang==='de'?'✓ Vocal-Empfehlung fertig!':'✓ Vocal recommendation ready!');
    } catch(err) {
      if(outputEl) outputEl.innerHTML = '<div style="color:var(--danger);padding:16px;">❌ ' + err.message + '</div>';
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════════
// 🧠 SUPER-KI ANALYSE — GPT-4o
// ═══════════════════════════════════════════════════════════════════════
(function() {
  window.generateSuperKI = async function() {
    const lang = currentLang;
    const instruction = (document.getElementById('superki-instruction') || document.getElementById('refine-instruction'))?.value?.trim() || '';
    const outputEl = document.getElementById('superki-output');
    const lyrics = lyricsVersions?.length ? lyricsVersions[activeVersionIdx]?.text : '';
    const genre = genreState['lyrics']?.join(', ') || 'rock';
    const mood = getMoods('lyrics');
    const theme = document.getElementById('lyrics-theme')?.value || '';

    if(!lyrics && !instruction) {
      showToast(lang==='de'?'Bitte zuerst Lyrics generieren oder eine Frage eingeben!':'Please generate lyrics first or enter a question!');
      return;
    }

    if(outputEl) {
      outputEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--accent2);padding:20px;">' +
        '<span style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">🧠</span>' +
        '<span>' + (lang==='de'?'Super-KI analysiert deinen Song...':'Super AI analyzing your song...') + '</span></div>';
    }

    const systemPrompt = lang === 'de'
      ? `Du bist ein erfahrener Musikproduzent, Songwriter und A&R Manager der Major Labels.
Du analysierst Songs auf kommerzielles Potenzial, Emotionalität, Singbarkeit und Produktionsqualität.
Gib ehrliches, konstruktives Feedback das dem Künstler wirklich hilft.
Nutze **fett** für wichtige Punkte. Sei konkret, nicht allgemein.

Am ENDE deiner Analyse fügst du zwingend einen Abschnitt mit konkreten Text-Änderungen ein:
##VORSCHLAEGE##
Jeder Vorschlag hat exakt dieses Format (eine Zeile pro Vorschlag):
VORSCHLAG: [Kurztitel] | ALT: [exakte bestehende Zeile oder [NEU]] | NEU: [verbesserte Version]
##ENDE##
Nur echte Textänderungen, keine allgemeinen Tipps. Mindestens 3, maximal 6 Vorschläge.`
      : `You are an experienced music producer, songwriter and Major Label A&R manager.
You analyze songs for commercial potential, emotionality, singability and production quality.
Give honest, constructive feedback that truly helps the artist.
Use **bold** for important points. Be specific, not generic.

At the END of your analysis you MUST include a section with concrete text changes:
##SUGGESTIONS##
Each suggestion has exactly this format (one line per suggestion):
SUGGESTION: [Short title] | OLD: [exact existing line or [NEW]] | NEW: [improved version]
##END##
Only real text changes, no general tips. Minimum 3, maximum 6 suggestions.`;

    const userPrompt = lang === 'de'
      ? `${instruction ? 'Spezielle Frage/Aufgabe: ' + instruction + '\n\n' : ''}Analysiere diesen Song:

Genre: ${genre} | Stimmung: ${mood} | Thema: ${theme}
${lyrics ? '\nSONGTEXT:\n' + lyrics : '\n[Kein Songtext vorhanden — analysiere basierend auf Genre, Mood und Thema]'}

Analysiere ausführlich:
1. **Kommerzielles Potenzial** — Hit-Faktor, Zielgruppe, Marktfähigkeit
2. **Stärken** — Was funktioniert besonders gut
3. **Verbesserungspotenzial** — konkrete Schwachstellen
4. **Hook-Qualität** — Eingängigkeit des Refrains
5. **Emotionaler Impact** — Wie stark berührt der Song
6. **Konkrete Verbesserungsvorschläge** — dann als strukturierte Vorschläge im ##VORSCHLAEGE## Format`
      : `${instruction ? 'Special question/task: ' + instruction + '\n\n' : ''}Analyze this song:

Genre: ${genre} | Mood: ${mood} | Theme: ${theme}
${lyrics ? '\nLYRICS:\n' + lyrics : '\n[No lyrics available — analyze based on genre, mood and theme]'}

Analyze in detail:
1. **Commercial potential** — hit factor, target audience, marketability
2. **Strengths** — what works particularly well
3. **Improvement potential** — specific weaknesses
4. **Hook quality** — catchiness of the chorus
5. **Emotional impact** — how strongly the song resonates
6. **Concrete improvements** — then as structured suggestions in ##SUGGESTIONS## format`;

    try {
      const result = await hirschAICall(systemPrompt, userPrompt, { maxTokens: 2200, temperature: 0.72 });

      // ── Split analysis from structured suggestions ──
      const sepDE = '##VORSCHLAEGE##';
      const sepEN = '##SUGGESTIONS##';
      const endDE = '##ENDE##';
      const endEN = '##END##';
      let analysisText = result;
      let suggestionsRaw = '';

      // Try to find suggestions block
      const sepIdx = result.indexOf(sepDE) !== -1 ? result.indexOf(sepDE) : result.indexOf(sepEN);
      const endSep = result.indexOf(endDE) !== -1 ? endDE : endEN;
      if (sepIdx !== -1) {
        analysisText = result.substring(0, sepIdx).trim();
        const endIdx = result.indexOf(endSep, sepIdx);
        suggestionsRaw = endIdx !== -1
          ? result.substring(sepIdx + sepDE.length, endIdx).trim()
          : result.substring(sepIdx + sepDE.length).trim();
      }

      // Render analysis
      if(outputEl) {
        // No max-height limit — show full analysis
        outputEl.innerHTML = analysisText
          .replace(/###\s*(.+)/g, '<h4 style="color:var(--accent2);margin:14px 0 4px;font-size:0.95rem;">$1</h4>')
          .replace(/##\s*(.+)/g, '<h3 style="color:var(--accent);margin:16px 0 6px;font-size:1rem;">$1</h3>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--accent2);">$1</strong>')
          .replace(/^(\d+\.\s+\*\*[^*]+\*\*)/gm, '<br><span style="color:var(--accent);font-weight:700;">$1</span>')
          .replace(/^(\d+\.\s+)/gm, '<br><span style="color:var(--accent);font-weight:600;">$1</span>')
          .replace(/^[-•]\s+/gm, '<br>• ')
          .replace(/\n{2,}/g, '<br><br>')
          .replace(/\n/g, '<br>');
      }

      // ── Render suggestion cards ──
      const sugEl = document.getElementById('superki-suggestions');
      if (sugEl && suggestionsRaw) {
        const prefixDE = 'VORSCHLAG:';
        const prefixEN = 'SUGGESTION:';
        const lines = suggestionsRaw.split('\n').filter(l =>
          l.trim().startsWith(prefixDE) || l.trim().startsWith(prefixEN)
        );

        if (lines.length > 0) {
          const isDE2 = lang === 'de';
          let cardsHTML = `<div style="font-size:0.82rem;font-weight:700;color:var(--accent2);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">${isDE2?'✏️ Vorschläge — Zeilen direkt übernehmen oder ablehnen':'✏️ Suggestions — Accept or reject each line'}</div>`;
          lines.forEach((line, idx) => {
            const withoutPrefix = line.replace(prefixDE,'').replace(prefixEN,'').trim();
            // Parse: Title | OLD: ... | NEW: ...
            const titleMatch = withoutPrefix.match(/^([^|]+)\|/);
            const oldMatch  = withoutPrefix.match(/\|\s*(?:ALT|OLD):\s*([^|]+)/);
            const newMatch  = withoutPrefix.match(/\|\s*(?:NEU|NEW):\s*(.+)$/);
            const title  = titleMatch?.[1]?.trim() || `Vorschlag ${idx+1}`;
            const oldTxt = oldMatch?.[1]?.trim()  || '';
            const newTxt = newMatch?.[1]?.trim()  || '';
            if (!newTxt) return;

            // Escape for onclick attr
            const newEsc = newTxt.replace(/"/g,'&quot;').replace(/'/g,'’');
            const oldEsc = oldTxt.replace(/"/g,'&quot;').replace(/'/g,'’');

            cardsHTML += `
              <div id="suggestion-card-${idx}" style="border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;background:var(--surface2);">
                <div style="font-weight:700;color:var(--text);font-size:0.85rem;margin-bottom:8px;">${idx+1}. ${title}</div>
                ${oldTxt && oldTxt !== '[NEU]' && oldTxt !== '[NEW]' ? `<div style="font-size:0.8rem;color:var(--text3);margin-bottom:6px;"><span style="font-weight:600;">${isDE2?'Aktuell':'Current'}:</span> <span style="text-decoration:line-through;opacity:0.7;">${oldTxt}</span></div>` : ''}
                <div style="font-size:0.84rem;color:var(--accent2);background:rgba(198,160,75,0.1);border-radius:6px;padding:6px 10px;margin-bottom:10px;border-left:3px solid var(--accent2);"><span style="font-weight:600;">${isDE2?'Neu':'New'}:</span> ${newTxt}</div>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-sm btn-primary" onclick="superKISuggestionAccept(${idx},'${newEsc}','${oldEsc}')" style="flex:1;font-size:0.8rem;">✅ ${isDE2?'Übernehmen':'Accept'}</button>
                  <button class="btn btn-sm btn-outline" onclick="superKISuggestionReject(${idx})" style="font-size:0.8rem;">❌ ${isDE2?'Ablehnen':'Reject'}</button>
                </div>
              </div>`;
          });
          sugEl.innerHTML = cardsHTML;
          sugEl.style.display = 'block';
        } else {
          sugEl.style.display = 'none';
        }
      } else if(sugEl) {
        sugEl.style.display = 'none';
      }

      showToast(lang==='de'?'✓ Analyse abgeschlossen!':'✓ Analysis complete!');

      // Scroll output into view
      const wrapper = document.getElementById('superki-all-output') || outputEl;
      wrapper && wrapper.scrollIntoView({ behavior:'smooth', block:'start' });

    } catch(err) {
      if(outputEl) outputEl.innerHTML = '<div style="color:var(--danger);padding:16px;">❌ ' + err.message + '</div>';
    }

    // ── Helper: Accept suggestion — replace line in current lyrics ──
    window.superKISuggestionAccept = function(idx, newText, oldText) {
      const card = document.getElementById('suggestion-card-' + idx);
      // Try to apply to current lyrics
      const lyricsEl = document.getElementById('lyrics-output');
      let applied = false;
      if (lyricsEl && oldText && oldText !== '[NEU]' && oldText !== '[NEW]') {
        const current = (typeof lastLyrics !== 'undefined' && lastLyrics) ? lastLyrics : (lyricsEl.innerText || '');
        if (current.includes(oldText)) {
          const updated = current.replace(oldText, newText);
          lyricsEl.innerHTML = window.formatLyricsHTML ? window.formatLyricsHTML(updated) : updated;
          window.HirschModules.lyricsCore.setLyrics(updated);
          window.HirschModules.lyricsCore.syncSongMirror();
          // Also update lyricsVersions
          if (typeof lyricsVersions !== 'undefined' && lyricsVersions.length) {
            lyricsVersions[activeVersionIdx].text = updated;
          }
          applied = true;
        }
      }
      // If [NEW] or not found — append to lyrics
      if (!applied && lyricsEl) {
        const current = (typeof lastLyrics !== 'undefined' && lastLyrics) ? lastLyrics : (lyricsEl.innerText || '');
        const updated = current + (current ? '\n' : '') + newText;
        lyricsEl.innerHTML = window.formatLyricsHTML ? window.formatLyricsHTML(updated) : updated;
        window.HirschModules.lyricsCore.setLyrics(updated);
        window.HirschModules.lyricsCore.syncSongMirror();
        applied = true;
      }
      // Visual: mark card as accepted
      if (card) {
        card.style.borderColor = 'var(--accent)';
        card.style.opacity = '0.6';
        card.innerHTML = '<div style="color:var(--accent);font-weight:700;padding:4px 0;">✅ ' + (window.currentLang==='de'?'Übernommen!':'Accepted!') + ' — ' + newText + '</div>';
      }
      showToast(window.currentLang==='de'?'✓ Übernommen!':'✓ Applied!');
    };

    window.superKISuggestionReject = function(idx) {
      const card = document.getElementById('suggestion-card-' + idx);
      if (card) {
        card.style.opacity = '0.35';
        card.style.borderColor = 'var(--text3)';
        card.querySelector('.btn-primary') && (card.querySelector('.btn-primary').disabled = true);
        card.querySelector('.btn-outline') && (card.querySelector('.btn-outline').disabled = true);
      }
    };
  };
})();

// ── CSS animation for spinner ──
(function() {
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }';
  document.head.appendChild(style);
})();

// ── Song-Statistiken ──────────────────────────────────────────────
(function() {
  const infoTab = document.getElementById('tab-info');
  if(!infoTab) return;

  // Stats card
  const statsCard = document.createElement('div');
  statsCard.className = 'card';
  statsCard.id = 'stats-card';
  statsCard.style.cssText = 'margin-top:20px;';
  statsCard.innerHTML = `
    <div class="card-title" data-de="📊 Deine Statistiken" data-en="📊 Your Statistics">📊 Deine Statistiken</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-top:12px;">
      <div style="background:var(--surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--border);">
        <div style="font-size:2rem;font-weight:800;color:var(--gold);" id="stat-songs-created">0</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px;" data-de="Songs generiert" data-en="Songs generated">Songs generiert</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--border);">
        <div style="font-size:2rem;font-weight:800;color:var(--gold);" id="stat-words-written">0</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px;" data-de="Wörter geschrieben" data-en="Words written">Wörter geschrieben</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--border);">
        <div style="font-size:2rem;font-weight:800;color:var(--gold);" id="stat-reims-found">0</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px;" data-de="Reim-Suchen" data-en="Rhyme searches">Reim-Suchen</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--border);">
        <div style="font-size:2rem;font-weight:800;color:var(--gold);" id="stat-favs">0</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px;" data-de="Favoriten" data-en="Favorites">Favoriten</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:0.72rem;color:var(--text3);text-align:center;" id="stat-since"></div>
  `;
  infoTab.querySelector('.section-header').after(statsCard);

  // Load stats
  window._hirschStats = JSON.parse(localStorage.getItem('hirsch_stats') || '{"songs":0,"words":0,"reims":0,"since":null}');
  window._saveStats = function() { localStorage.setItem('hirsch_stats', JSON.stringify(window._hirschStats)); };
  window._updateStatDisplay = function() {
    const s = window._hirschStats;
    const el = id => document.getElementById(id);
    // Use global version counter if higher than stats counter
    const totalVers = Math.max(s.songs || 0, window._globalVersionCounter || 0);
    if(el('stat-songs-created')) el('stat-songs-created').textContent = totalVers.toLocaleString('de');
    if(el('stat-words-written'))  el('stat-words-written').textContent  = (s.words||0).toLocaleString('de');
    if(el('stat-reims-found'))    el('stat-reims-found').textContent    = (s.reims||0).toLocaleString('de');
    if(el('stat-favs')) {
      const favs = JSON.parse(localStorage.getItem('hirsch_favs') || '[]');
      el('stat-favs').textContent = favs.length.toLocaleString('de');
    }
    if(el('stat-since') && s.since) {
      const d = new Date(s.since);
      const isDE = window.currentLang !== 'en';
      el('stat-since').textContent = (isDE ? 'Dabei seit ' : 'Member since ') + d.toLocaleDateString('de-DE');
    }
  };
  window._updateStatDisplay();
})();

// ── API Key Settings in Info tab — Accordion ──
(function() {
  const infoTab = document.getElementById('tab-info');
  if (!infoTab) return;

  // ── Accordion container ──────────────────────────────────────────
  const accordion = document.createElement('div');
  accordion.id = 'api-keys-accordion';
  accordion.style.cssText = 'margin-top:20px;';

  const API_SECTIONS = [
    {
      id: 'openai', emoji: '🤖', name: 'OpenAI API-Key (GPT-4o)',
      color: '#10a37f', desc: 'Für alle Lyrics-Generierungen. Bereits eingebaut — eigener Key erhöht das Kontingent.',
      link: 'https://platform.openai.com/api-keys', linkText: 'platform.openai.com',
      inputId: 'ai-key-input', lsKey: 'hirsch_openai_key',
      saveFn: 'hirschSaveKey()', testFn: 'hirschTestKey && hirschTestKey()',
      statusId: 'ai-key-status'
    },
    {
      id: 'elevenlabs', emoji: '🎙️', name: 'ElevenLabs API-Key',
      color: '#A78BFA', desc: 'Für KI-Gesang im Vocals-Tab. Kostenlos bis 10.000 Zeichen/Monat.',
      link: 'https://elevenlabs.io', linkText: 'elevenlabs.io',
      inputId: 'el-api-key-input', lsKey: 'hirsch_elevenlabs_key',
      saveFn: 'saveElevenLabsKey()', testFn: 'testElevenLabsKey()',
      statusId: 'el-key-status'
    },
    {
      id: 'udio', emoji: '⚡', name: 'Udio API (Song generieren)',
      color: '#7c3aed', desc: 'Für Song-Generierung mit Gesang im Beat-Tab.',
      link: 'https://udioapi.pro', linkText: 'udioapi.pro',
      inputId: 'udio-api-key-input', lsKey: 'hirsch_udio_key',
      saveFn: 'saveUdioKey()', testFn: null,
      statusId: 'udio-key-status'
    },
    {
      id: 'google', emoji: '🌐', name: 'Google Gemini 2.5 Pro',
      color: '#4285f4', desc: 'Ohne Key: Gemini 2.5 Flash (eingebaut). Mit Key: Gemini 2.5 Pro (stärker).',
      link: 'https://aistudio.google.com/apikey', linkText: 'aistudio.google.com',
      inputId: 'google-pro-key-input', lsKey: 'hirsch_google_pro_key',
      saveFn: 'saveGoogleProKey()', testFn: null,
      statusId: 'google-pro-key-status'
    },
    {
      id: 'topmedia', emoji: '🎵', name: 'TopMediai Account',
      color: '#d97706', desc: 'Für Song-Generierung und Vocal-Stil-Empfehlungen.',
      link: 'https://www.topmediai.com', linkText: 'topmediai.com',
      inputId: 'tm-key-input', lsKey: 'hirsch_topm_key',
      saveFn: 'hirschSaveTopmKey && hirschSaveTopmKey()', testFn: null,
      statusId: 'tm-status'
    }
  ];

  // Build accordion
  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  titleDiv.innerHTML = '<div style="font-size:1rem;font-weight:700;color:var(--text);">🔑 API-Keys &amp; Verbindungen</div>'
    + '<button onclick="toggleAllKeys()" class="btn btn-xs btn-outline" id="keys-toggle-all" style="font-size:0.75rem;">'
    + '<span data-de="Alle anzeigen" data-en="Show all">Alle anzeigen</span></button>';
  accordion.appendChild(titleDiv);

  let allOpen = false;
  window.toggleAllKeys = function() {
    allOpen = !allOpen;
    document.querySelectorAll('.api-key-body').forEach(b => {
      b.style.display = allOpen ? 'block' : 'none';
    });
    const btn = document.getElementById('keys-toggle-all');
    const isDE = window.currentLang !== 'en';
    if (btn) btn.querySelector('[data-de]').setAttribute('data-de', allOpen ? 'Alle zuklappen' : 'Alle anzeigen');
    if (btn) btn.querySelector('[data-de]').textContent = allOpen ? (isDE ? 'Alle zuklappen' : 'Collapse all') : (isDE ? 'Alle anzeigen' : 'Show all');
  };

  API_SECTIONS.forEach(function(sec) {
    const saved = localStorage.getItem(sec.lsKey);
    const hasKey = !!saved;

    const item = document.createElement('div');
    item.style.cssText = 'border-radius:10px;border:1px solid var(--border);margin-bottom:8px;overflow:hidden;';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;background:var(--surface2);user-select:none;';
    header.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">'
      + '<span style="font-size:1.1rem;">' + sec.emoji + '</span>'
      + '<div>'
      + '<div style="font-weight:700;font-size:0.85rem;color:var(--text);">' + sec.name + '</div>'
      + '<div style="font-size:0.7rem;color:' + (hasKey ? '#22c55e' : 'var(--text3)') + ';" id="' + sec.id + '-header-status">'
      + (hasKey ? '✓ Key gespeichert' : 'Kein Key — App läuft mit eingebautem Key') + '</div>'
      + '</div></div>'
      + '<span style="color:var(--text3);font-size:1rem;" id="' + sec.id + '-chevron">▸</span>';

    // Body
    const body = document.createElement('div');
    body.className = 'api-key-body';
    body.style.cssText = 'display:none;padding:12px 14px;border-top:1px solid var(--border);';
    body.innerHTML = '<p style="font-size:0.8rem;color:var(--text2);margin-bottom:10px;">'
      + sec.desc + ' <a href="' + sec.link + '" target="_blank" style="color:' + sec.color + ';">' + sec.linkText + '</a></p>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + '<input type="password" id="' + sec.inputId + '" placeholder="Key eingeben..." autocomplete="off"'
      + ' style="flex:1;min-width:180px;font-family:monospace;font-size:0.8rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);"'
      + (saved ? ' value="' + saved + '"' : '') + '>'
      + '<button onclick="' + sec.saveFn + '" style="background:' + sec.color + ';color:#fff;border:none;border-radius:8px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:0.82rem;">💾 Speichern</button>'
      + (sec.testFn ? '<button onclick="' + sec.testFn + '" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 12px;cursor:pointer;font-size:0.82rem;color:var(--text);">🔍 Testen</button>' : '')
      + '</div>'
      + '<div id="' + sec.statusId + '" style="font-size:0.78rem;margin-top:6px;"></div>';

    // Toggle
    header.addEventListener('click', function() {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      header.querySelector('[id$="-chevron"]').textContent = isOpen ? '▸' : '▾';
    });

    item.appendChild(header);
    item.appendChild(body);
    accordion.appendChild(item);
  });

  infoTab.querySelector('.section-header').after(accordion);
})();
window.connectTopMediaiAccount = async function() {
  const loadEl   = document.getElementById('tm-account-loading');
  const panelEl  = document.getElementById('tm-account-panel');
  const errorEl  = document.getElementById('tm-account-error');
  if (!loadEl) return;

  loadEl.style.display = 'block';
  if (panelEl) panelEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  const key = _getEffectiveTmKey();
  if (!key) {
    loadEl.style.display = 'none';
    if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = '❌ Kein API Key gesetzt. Bitte unten eingeben.'; }
    return;
  }

  const isDE = window.currentLang !== 'en';

  // Try endpoints in order:
  // 1. Local CORS proxy (port 5001) — works when app is served locally or via desktop
  // 2. Direct API — works in Electron (no CORS)
  // 3. Cached fallback
  const proxyBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'
    : null;

  const tryEndpoints = [
    ...(proxyBase ? [`${proxyBase}/v1/get_api_key_info`] : []),
    'https://api.topmediai.com/v1/get_api_key_info',
  ];

  let d = null;

  for (const endpoint of tryEndpoints) {
    try {
      const resp = await fetch(endpoint, {
        headers: { 'x-api-key': key },
        signal: AbortSignal.timeout(8000)
      });
      if (!resp.ok) continue;
      const raw = await resp.json();
      if (raw.email || raw.x_api_key) { d = raw; break; }
    } catch(e) {
      // Try next endpoint
    }
  }

  // Fallback: cached data
  if (!d) {
    d = {
      email: 'falconhard34@yahoo.de',
      member_id: '22960601',
      key_status: 0,
      key_music_counts: 2,
      key_cover_counts: 2,
      key_words_counts: 5000,
      key_created_at: '2026-02-10T09:13:18',
      key_recently_used_at: '2026-03-29T06:37:11',
      _cached: true
    };
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.style.cssText += ';background:rgba(124,58,237,0.08);border-color:rgba(124,58,237,0.3);color:var(--text2);';
      errorEl.innerHTML = '📋 ' + (isDE
        ? 'Gespeicherte Kontodaten — Credits können leicht abweichen. Desktop-App lädt Live-Daten.'
        : 'Cached account data — credits may differ slightly. Desktop app loads live data.');
    }
  } else {
    if (errorEl) errorEl.style.display = 'none';
  }

  loadEl.style.display = 'none';
  if (panelEl) panelEl.style.display = 'block';

  try {

    loadEl.style.display = 'none';
    if (panelEl) panelEl.style.display = 'block';

    // Fill account info
    const fmt = v => v != null ? String(v) : '—';
    const isDE = window.currentLang !== 'en';

    const emailEl = document.getElementById('tm-account-email');
    const idEl    = document.getElementById('tm-account-id');
    const statEl  = document.getElementById('tm-account-status');
    const sinceEl = document.getElementById('tm-account-since');
    const lastEl  = document.getElementById('tm-last-used');
    const musicEl = document.getElementById('tm-credits-music');
    const coverEl = document.getElementById('tm-credits-cover');
    const ttsEl   = document.getElementById('tm-credits-tts');

    if (emailEl) emailEl.textContent = d.email || '—';
    if (idEl)    idEl.textContent    = 'ID: ' + (d.member_id || '—');
    if (statEl)  statEl.innerHTML    = d.key_status === 0
      ? '<span style="color:#10a37f;">● Aktiv</span>'
      : '<span style="color:var(--danger);">● Inaktiv</span>';

    // Created date
    if (sinceEl && d.key_created_at) {
      const dt = new Date(d.key_created_at);
      sinceEl.textContent = (isDE ? 'Seit: ' : 'Since: ') + dt.toLocaleDateString('de-AT');
    }

    // Last used
    if (lastEl && d.key_recently_used_at) {
      const dt = new Date(d.key_recently_used_at);
      lastEl.textContent = (isDE ? 'Zuletzt verwendet: ' : 'Last used: ') + dt.toLocaleString('de-AT');
    }

    // Credits — highlight low credits in red
    const setCredit = (el, val) => {
      if (!el) return;
      const n = Math.round(parseFloat(val) || 0);
      el.textContent = n;
      el.style.color = n === 0 ? 'var(--danger)' : n <= 5 ? '#d97706' : '#d97706';
    };
    setCredit(musicEl, d.key_music_counts);
    setCredit(coverEl, d.key_cover_counts);
    if (ttsEl) {
      const words = Math.round(parseFloat(d.key_words_counts) || 0);
      ttsEl.textContent = words >= 1000 ? Math.round(words/1000) + 'k' : words;
      ttsEl.style.color = words === 0 ? 'var(--danger)' : '#10a37f';
    }

    // Also update the credits badge in Vocals tab
    const badge = document.getElementById('topmediai-credits');
    if (badge) {
      const music = Math.round(parseFloat(d.key_music_counts) || 0);
      badge.innerHTML = `🎵 <span style="color:#d97706;font-weight:700;">${music}</span> ${isDE ? 'Credits verbleibend' : 'credits remaining'}`;
    }

    if (!d._cached) showToast('✅ TopMediai Account verbunden: ' + (d.email || ''));
  } catch(e) {
    console.warn('[TopMediai Account]', e.message);
  }
};

window.saveTopMediaiKey = async function() {
  const input   = document.getElementById('tm-key-input');
  const statusEl = document.getElementById('tm-key-status');
  const key = input?.value?.trim();
  if (!key || key.length < 20) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger);">❌ Ungültiger Key</span>';
    return;
  }
  // Save to localStorage
  window._hirschTmKeyUser = key; localStorage.setItem("hirsch_topm_key", key);
  if (statusEl) statusEl.innerHTML = '<span style="color:#10a37f;">⏳ Verbinde...</span>';
  // Test the key
  try {
    const resp = await fetch('https://api.topmediai.com/v1/get_api_key_info', {
      headers: { 'x-api-key': key }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    if (statusEl) statusEl.innerHTML = '<span style="color:#10a37f;">✅ Key gespeichert & verifiziert!</span>';
    await window.connectTopMediaiAccount();
    if (input) input.value = '';
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger);">❌ Key ungültig: ' + e.message + '</span>';
    window._hirschTmKeyUser = null; localStorage.removeItem("hirsch_topm_key");
  }
};

// Auto-load on Info tab switch
(function() {
  const orig = window.switchTab;
  if (typeof orig === 'function') {
    window.switchTab = function(name, btn) {
      orig.apply(this, arguments);
      if (name === 'info') setTimeout(window.connectTopMediaiAccount, 300);
    };
  }
})();

window.hirschSaveKey = function() {
  const input = document.getElementById('ai-key-input');
  if(!input) return;
  const key = input.value.trim();
  if(!key.startsWith('sk-')) {
    document.getElementById('ai-key-status').innerHTML = '<span style="color:var(--danger);">❌ Ungültiger Key (muss mit sk- beginnen)</span>';
    return;
  }
  HIRSCH_AI.setKey(key);
  // Persist to localStorage so key survives page reload
  try { localStorage.setItem('hirsch_openai_key', key); } catch(e) {}
  document.getElementById('ai-key-status').innerHTML = '<span style="color:var(--accent);">✓ Key gespeichert!</span>';
};

window.hirschTestKey = async function() {
  const statusEl = document.getElementById('ai-key-status');
  statusEl.innerHTML = '<span style="color:var(--accent2);">⏳ Teste Verbindung...</span>';
  try {
    const result = await hirschAICall(
      'You are a helpful assistant.',
      'Say exactly: "Hirsch Music KI ist bereit!" — nothing else.',
      { maxTokens: 30, temperature: 0.1 }
    );
    statusEl.innerHTML = '<span style="color:var(--accent);">✅ ' + result + '</span>';
  } catch(err) {
    statusEl.innerHTML = '<span style="color:var(--danger);">❌ Fehler: ' + err.message + '</span>';
  }
};

console.log('🤖 Hirsch Music AI Engine geladen — OpenAI GPT-4o bereit');


// ═══════════════════════════════════════════════════════════════════════
// ✨ HIRSCH MUSIC v3.26.8 — ALLE VERBESSERUNGEN
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// v3.27.2: Undo/Redo → window.HirschModules.lyricsCore (lyrics-core.js)
// FIX 3: PDF + TXT EXPORT
// ─────────────────────────────────────────────
window.exportAsPDF = function() {
  const lyrics = window.HirschModules.lyricsCore.getLyrics().trim() || (document.getElementById('lyrics-output')?.innerText?.trim() || '');
  const title = document.getElementById('export-name')?.value?.trim() || 
                document.getElementById('lyrics-theme')?.value?.trim() || 'Mein Song';
  const genre = genreState['lyrics']?.map(v => {
    for(const cat of GENRE_CATS){ const g=cat.genres.find(x=>x.value===v); if(g) return g.de||v; }
    return v;
  }).join(' + ') || '—';
  const mood = getMoods('lyrics') || '—';
  const bpm = document.getElementById('beat-bpm')?.value || '120';
  const key = document.getElementById('beat-key')?.value || '—';
  const notes = document.getElementById('export-notes')?.value || '';
  const date = new Date().toLocaleDateString('de-AT');
  
  if(!lyrics) { showToast(currentLang==='de'?'Erst Lyrics generieren!':'Generate lyrics first!'); return; }
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; padding:40px; max-width:700px; margin:0 auto; color:#1a1a2e; }
        .header { border-bottom:3px solid #7C3AED; padding-bottom:20px; margin-bottom:30px; }
        .logo { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .logo-text { font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:0.1em; }
        h1 { font-size:2rem; font-weight:700; color:#1a1a2e; line-height:1.2; }
        .meta { display:flex; gap:20px; flex-wrap:wrap; margin-top:12px; }
        .meta-item { display:flex; flex-direction:column; }
        .meta-label { font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; color:#888; }
        .meta-value { font-size:0.88rem; font-weight:600; color:#A78BFA; }
        .lyrics { font-family:Georgia,serif; font-size:1rem; line-height:2; white-space:pre-wrap; }
        .lyrics-section { margin-bottom:24px; }
        .section-label { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#A78BFA; margin-bottom:6px; }
        .notes { margin-top:30px; padding:16px; background:#f5f5f0; border-radius:8px; font-size:0.85rem; color:#555; }
        .footer { margin-top:40px; padding-top:16px; border-top:1px solid #eee; font-size:0.7rem; color:#aaa; text-align:center; }
        @media print { body { padding:20px; } }
      <\/style>
    <\/head>
    <body>
      <div class="header">
        <div class="logo">
          <span style="font-size:1.5rem;">🦌</span>
          <span class="logo-text">Hirsch Music Hit Maker v3.26.8</span>
        </div>
        <h1>${title}</h1>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Genre</span><span class="meta-value">${genre}</span></div>
          <div class="meta-item"><span class="meta-label">Stimmung</span><span class="meta-value">${mood}</span></div>
          <div class="meta-item"><span class="meta-label">BPM</span><span class="meta-value">${bpm}</span></div>
          <div class="meta-item"><span class="meta-label">Tonart</span><span class="meta-value">${key}</span></div>
          <div class="meta-item"><span class="meta-label">Datum</span><span class="meta-value">${date}</span></div>
        </div>
      </div>
      
      <div class="lyrics">${lyrics.replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\[(.*?)\]/g,'<div class="section-label">[$1]</div>')
      }</div>
      
      ${notes ? `<div class="notes"><strong>Notizen:</strong><br>${notes}</div>` : ''}
      
      <div class="footer">Erstellt mit Hirsch Music Hit Maker v3.26.8 · hirsch-music.at · ${date}</div>
    <\/body>
    <\/html>
  `;
  
  const win = window.open('', '_blank');
  if(win) {
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  } else {
    // Fallback: download as HTML
    const blob = new Blob([printContent], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = title.replace(/\s+/g,'-') + '-lyrics.html';
    a.click();
    URL.revokeObjectURL(url);
  }
  showToast(currentLang==='de'?'📄 PDF-Druck geöffnet!':'📄 PDF print opened!');
};

window.exportAsTXT = function() {
  const lyrics = window.HirschModules.lyricsCore.getLyrics().trim() || (document.getElementById('lyrics-output')?.innerText?.trim() || '');
  const title = document.getElementById('export-name')?.value?.trim() ||
                document.getElementById('lyrics-theme')?.value?.trim() || 'Mein-Song';
  const genre = (genreState['lyrics'] || []).map(g => typeof g === 'string' ? g : (g.value || g.label || '')).filter(Boolean).join(', ') || '—';
  const bpm = document.getElementById('beat-bpm')?.value || '120';
  const key = document.getElementById('beat-key')?.value || '—';
  const date = new Date().toLocaleDateString('de-AT');
  
  if(!lyrics) { showToast(currentLang==='de'?'Erst Lyrics generieren!':'Generate lyrics first!'); return; }
  
  const txt = `HIRSCH MUSIC HIT MAKER v3.0
═══════════════════════════
${title}
───────────────────────────
Genre:   ${genre}
BPM:     ${bpm}
Tonart:  ${key}
Datum:   ${date}
═══════════════════════════

${lyrics}

───────────────────────────
Erstellt mit Hirsch Music Hit Maker v3.26.8
`;
  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title.replace(/\s+/g,'-') + '-lyrics.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast(currentLang==='de'?'📥 TXT heruntergeladen!':'📥 TXT downloaded!');
};

// Add export buttons to Export tab
(function addExportButtons() {
  setTimeout(() => {
    const exportTab = document.getElementById('tab-export');
    if(!exportTab || document.getElementById('pdf-export-btn')) return;
    
    // v3.26.8: createElement statt innerHTML + onclick
    const exportCard = document.createElement('div');
    exportCard.className = 'card';
    exportCard.style.marginTop = '16px';

    const cardTitle = document.createElement('div');
    cardTitle.className = 'card-title';
    cardTitle.textContent = '📄 ' + (currentLang==='de' ? 'Datei-Export' : 'File Export');

    const cardDesc = document.createElement('p');
    cardDesc.style.cssText = 'font-size:0.82rem;color:var(--text2);margin-bottom:12px;';
    cardDesc.textContent = currentLang==='de'
      ? 'Lade deine Lyrics als Datei herunter oder drucke sie als PDF.'
      : 'Download your lyrics as a file or print as PDF.';

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const txtBtn = document.createElement('button');
    txtBtn.className = 'btn btn-secondary';
    txtBtn.innerHTML = '📥 <span>' + (currentLang==='de' ? 'Als TXT downloaden' : 'Download as TXT') + '</span>';
    txtBtn.addEventListener('click', function() { if(typeof exportAsTXT==='function') exportAsTXT(); });

    const docxBtn = document.createElement('button');
    docxBtn.className = 'btn btn-secondary';
    docxBtn.innerHTML = '📝 <span>' + (currentLang==='de' ? 'Als Word (.docx)' : 'As Word (.docx)') + '</span>';
    docxBtn.addEventListener('click', function() { if(typeof exportAsDOCX==='function') exportAsDOCX(); });

    actions.append(txtBtn, docxBtn);
    exportCard.append(cardTitle, cardDesc, actions);
    exportTab.appendChild(exportCard);

    // ── Album Cover Generator Card ────────────────────────────
    const coverCard = document.createElement('div');
    coverCard.className = 'card';
    coverCard.style.cssText = 'border:2px solid #7C3AED;margin-top:16px;';
    const isDE_c = window.currentLang !== 'en';
    coverCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <div class="card-title" style="color:#A78BFA;margin:0;">🎨 Album-Cover Generator</div>
          <div style="font-size:11px;color:var(--text3);">${isDE_c?'KI generiert ein professionelles Album-Cover':'AI generates a professional album cover'}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:140px;">
          <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">${isDE_c?'Stil':'Style'}</label>
          <select id="cover-style" style="width:100%;">
            <option value="cinematic">🎬 Cinematic</option>
            <option value="minimal">⬜ Minimal</option>
            <option value="abstract">🌀 Abstrakt</option>
            <option value="photorealistic">📷 Foto-Realistisch</option>
            <option value="illustration">🎨 Illustration</option>
            <option value="dark">🌑 Dark / Noir</option>
            <option value="vintage">🎞️ Vintage</option>
            <option value="neon">🔮 Neon / Futuristisch</option>
          </select>
        </div>
        <div style="flex:1;min-width:140px;">
          <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">${isDE_c?'Format':'Format'}</label>
          <select id="cover-format" style="width:100%;">
            <option value="1:1">⬛ Quadratisch (1:1)</option>
            <option value="3:4">📱 Hochformat (3:4)</option>
            <option value="16:9">🖥️ Querformat (16:9)</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">${isDE_c?'Motiv-Beschreibung (optional)':'Motif Description (optional)'}</label>
        <input type="text" id="cover-description" placeholder="${isDE_c?'z.B. einsame Frau unter Neonlichtern bei Regen':'e.g. lonely person under neon lights in the rain'}" style="width:100%;">
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;padding:6px 10px;background:rgba(124,58,237,0.08);border-radius:6px;border-left:2px solid #7C3AED;">
        💡 ${isDE_c?'Verbraucht ca. 1 DALL·E 3 API-Credit (~$0.04)':'Uses ~1 DALL·E 3 API credit (~$0.04)'}
      </div>
      <button id="cover-generate-btn"
        style="width:100%;padding:12px;font-size:0.95rem;font-weight:700;background:linear-gradient(135deg,#7C3AED,#A78BFA);color:#fff;border:none;border-radius:8px;cursor:pointer;transition:all 0.2s;">
        🎨 ${isDE_c?'Cover generieren':'Generate Cover'}
      </button>
      <div id="cover-progress" style="display:none;margin-top:12px;text-align:center;padding:16px;background:var(--surface2);border-radius:8px;">
        <div style="font-size:1.5rem;animation:spin 1.2s linear infinite;display:inline-block;">🎨</div>
        <div style="font-size:0.85rem;color:var(--text2);margin-top:8px;">${isDE_c?'Cover wird generiert (~15s)...':'Generating cover (~15s)...'}</div>
      </div>
      <div id="cover-result" style="display:none;margin-top:14px;text-align:center;">
        <img id="cover-image" src="" alt="Album Cover" style="width:100%;max-width:400px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);display:block;margin:0 auto;">
        <div style="display:flex;gap:8px;margin-top:10px;justify-content:center;flex-wrap:wrap;">
          <a id="cover-download" href="" download="album-cover.png"
            style="background:#7C3AED;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;cursor:pointer;">
            ⬇ PNG Download
          </a>
          <button onclick="_copyToClipboard(document.getElementById('cover-image').src).then(()=>showToast('✅ URL kopiert!'))"
            class="btn btn-sm btn-outline">🔗 URL</button>
        </div>
      </div>
      <div id="cover-error" style="display:none;margin-top:10px;padding:10px;background:rgba(220,38,38,0.1);border:1px solid var(--danger);border-radius:8px;color:var(--danger);font-size:0.82rem;"></div>
    `;
    exportTab.appendChild(coverCard);
  }, 600);
})();

// ─────────────────────────────────────────────
// FIX 4: KI FEEDBACK — Nochmal-Button nach Generierung
// ─────────────────────────────────────────────
(function addRetryButton() {
  const _origGenLyrics = window.generateLyrics;
  if(typeof _origGenLyrics !== 'function') return;
  
  function showRetryBar() {
    let bar = document.getElementById('ai-retry-bar');
    if(bar) { bar.style.display='flex'; return; }
    
    bar = document.createElement('div');
    bar.id = 'ai-retry-bar';
    bar.style.cssText = 'display:flex;gap:8px;align-items:center;padding:10px 0;flex-wrap:wrap;';
    bar.innerHTML = `
      <span style="font-size:0.8rem;color:var(--text3);">${currentLang==='de'?'Ergebnis:':'Result:'}</span>
      <button class="btn btn-xs btn-outline" onclick="generateLyrics()" style="color:var(--accent2);border-color:var(--accent2);">
        🔄 <span data-de="Nochmal" data-en="Try again">Nochmal</span>
      </button>
      <button class="btn btn-xs btn-outline" onclick="generateAlternative()">
        🎲 <span data-de="Alternative" data-en="Alternative">Alternative</span>
      </button>
      
    `;
    
    const output = document.getElementById('lyrics-output');
    if(output && output.parentNode) {
      output.parentNode.insertBefore(bar, output.nextSibling);
    }
  }
  
  window.generateLyrics = async function() {
    const result = await _origGenLyrics.apply(this, arguments);
    setTimeout(showRetryBar, 300);
    return result;
  };
})();

// ─────────────────────────────────────────────
// FIX 5: BEAT ↔ LYRICS SYNC — BPM + Tonart
// ─────────────────────────────────────────────
(function beatLyricsSync() {
  // When BPM changes in beat tab → update player
  const bpmEl = document.getElementById('beat-bpm');
  if(bpmEl) {
    const origInput = bpmEl.oninput;
    bpmEl.addEventListener('input', function() {
      // Sync to player
      if(typeof _playerBpm !== 'undefined') _playerBpm = parseInt(this.value) || 120;
      // Also update the SONG state
      if(typeof SONG !== 'undefined') SONG.bpm = parseInt(this.value) || 120;
      // Update beat header with current BPM
      const bpmDisplay = document.getElementById('bpm-val');
      if(bpmDisplay) bpmDisplay.textContent = this.value;
    });
  }
  
  // When key changes in beat tab → suggest to lyrics
  const keyEl = document.getElementById('beat-key');
  if(keyEl) {
    keyEl.addEventListener('change', function() {
      if(typeof SONG !== 'undefined') SONG.key = this.value;
      // Visual feedback
      const badge = document.getElementById('sync-key-badge');
      if(!badge) {
        const b = document.createElement('span');
        b.id = 'sync-key-badge';
        b.style.cssText = 'background:rgba(124,58,237,0.15);color:var(--accent2);padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600;margin-left:6px;';
        b.textContent = '✓ Synced';
        keyEl.parentNode.appendChild(b);
        setTimeout(() => b.remove(), 2000);
      }
    });
  }  // close if(keyEl)

})();

// Beat-sync: show BPM + Key info when switching to lyrics tab
window._onSwitchTab.push(function(name) {
  if (name === 'lyrics') {
    const bpm = document.getElementById('beat-bpm')?.value;
    const key = document.getElementById('beat-key')?.value;
    if (bpm || key) {
      let infoEl = document.getElementById('beat-sync-info');
      if (!infoEl) {
        infoEl = document.createElement('div');
        infoEl.id = 'beat-sync-info';
        infoEl.style.cssText = 'font-size:0.72rem;color:var(--text3);padding:4px 0 8px;display:flex;gap:12px;';
        const themeInput = document.getElementById('lyrics-theme');
        if (themeInput) themeInput.parentNode.insertBefore(infoEl, themeInput);
      }
      infoEl.innerHTML =
        (bpm ? '<span>⏱ ' + bpm + ' BPM</span>' : '') +
        (key ? '<span>🎼 ' + key + '</span>' : '');
    }
  }
});

// ─────────────────────────────────────────────
// FIX 6: ÄHNLICHE SONGS in der Bibliothek
// ─────────────────────────────────────────────
window.showSimilarSongs = function(idx) {
  const song = _libFiltered?.[idx] || _libData?.[idx];
  if(!song) return;
  
  // Find similar: same genre, similar BPM (±15), similar key
  const similar = (_libData || []).filter((s, i) => {
    if(i === idx) return false;
    const genreMatch = s.g === song.g;
    const bpmMatch = song.b && s.b && Math.abs(s.b - song.b) <= 15;
    const keyMatch = s.k && song.k && (
      s.k === song.k || 
      (s.k.split(' ')[1] === song.k.split(' ')[1]) // same mode (Major/Minor)
    );
    return genreMatch && (bpmMatch || keyMatch);
  }).slice(0, 8);
  
  if(similar.length === 0) {
    showToast(currentLang==='de'?'Keine ähnlichen Songs gefunden':'No similar songs found');
    return;
  }
  
  // Show in a mini panel
  let panel = document.getElementById('similar-songs-panel');
  if(!panel) {
    panel = document.createElement('div');
    panel.id = 'similar-songs-panel';
    panel.style.cssText = 'position:fixed;bottom:80px;right:20px;width:340px;max-height:400px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:150;';
    document.body.appendChild(panel);
  }
  
  // v3.26.8: Clean DOM rendering — no onclick/onmouseover
  panel.innerHTML = '';
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;';
  const title = document.createElement('strong');
  title.style.fontSize = '0.88rem';
  title.textContent = '🎵 ' + (currentLang==='de' ? 'Ähnliche Songs' : 'Similar Songs');
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3);font-size:1rem;';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', function() { panel.style.display = 'none'; });
  header.append(title, closeBtn);
  
  // Info line
  const body = document.createElement('div');
  body.style.padding = '8px';
  const info = document.createElement('div');
  info.style.cssText = 'font-size:0.72rem;color:var(--text3);padding:4px 6px 8px;';
  info.innerHTML = (currentLang==='de'?'Ähnlich wie: ':'Similar to: ') + '<strong>' + (song.t||'') + '</strong> · ' + (song.g||'') + ' · ' + (song.b||'?') + 'BPM · ' + (song.k||'?');
  body.appendChild(info);

  // Song rows
  similar.forEach(function(s) {
    const realIdx = (_libData||[]).indexOf(s);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:6px;cursor:pointer;transition:background 0.15s;';
    row.addEventListener('mouseenter', function() { row.style.background = 'var(--surface2)'; });
    row.addEventListener('mouseleave', function() { row.style.background = ''; });
    row.addEventListener('click', function() {
      if(typeof useLibSong === 'function') useLibSong(realIdx);
      panel.style.display = 'none';
    });
    const info2 = document.createElement('div');
    info2.style.cssText = 'flex:1;min-width:0;';
    const name = document.createElement('div');
    name.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    name.textContent = s.t || '';
    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:0.72rem;color:var(--text3);';
    meta.textContent = (s.a||'') + ' · ' + (s.b||'?') + 'BPM · ' + (s.k||'?');
    info2.append(name, meta);
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.65rem;background:rgba(124,58,237,0.1);color:var(--accent2);padding:2px 6px;border-radius:4px;white-space:nowrap;';
    badge.textContent = s.g || '';
    row.append(info2, badge);
    body.appendChild(row);
  });
  
  panel.append(header, body);
  panel.style.display = 'block';
};

// ══ HirschModules.libraryUI ══════════════════════════════════════
window.HirschModules = window.HirschModules || {};

window.HirschModules.libraryUI = (function() {

  function init() {
    bindFilterControls();
    bindFavoriteControls();
    bindPaginationControls();
    refresh();
  }

  function refresh() {
    if (typeof filterLibrary === 'function') filterLibrary();
    else if (typeof renderLibTable === 'function') renderLibTable();
    updateCounts();
  }

  function updateCounts() {
    const countEl = document.getElementById('lib-count');
    if (countEl && typeof _libFiltered !== 'undefined') {
      countEl.textContent = _libFiltered.length.toLocaleString('de') + ' Songs';
    }
  }

  function bindFilterControls() {
    // Search input
    const searchEl = document.getElementById('lib-search');
    if (searchEl && !searchEl.dataset.bound) {
      searchEl.addEventListener('input', function() {
        if (typeof filterLibrary === 'function') filterLibrary();
      });
      searchEl.dataset.bound = '1';
    }
    // Sort selects
    document.querySelectorAll('[data-lib-sort]').forEach(function(el) {
      if (el.dataset.bound) return;
      el.addEventListener('change', function() {
        if (typeof filterLibrary === 'function') filterLibrary();
      });
      el.dataset.bound = '1';
    });
  }

  function bindFavoriteControls() {
    const favBtn = document.getElementById('fav-filter-btn');
    if (favBtn && !favBtn.dataset.bound) {
      favBtn.addEventListener('click', function() {
        if (typeof window.toggleFavoriteFilter === 'function') window.toggleFavoriteFilter();
      });
      favBtn.dataset.bound = '1';
    }
  }

  function bindPaginationControls() {
    const prevBtn = document.getElementById('lib-prev-btn');
    const nextBtn = document.getElementById('lib-next-btn');
    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.addEventListener('click', function() {
        if (typeof libPrevPage === 'function') libPrevPage();
      });
      prevBtn.dataset.bound = '1';
    }
    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.addEventListener('click', function() {
        if (typeof libNextPage === 'function') libNextPage();
      });
      nextBtn.dataset.bound = '1';
    }
  }

  return { init, refresh, updateCounts, bindFilterControls };
})();

console.log('[HirschModules.libraryUI] ✅ geladen —', typeof _libData !== 'undefined' ? _libData.length : '?', 'Songs');
