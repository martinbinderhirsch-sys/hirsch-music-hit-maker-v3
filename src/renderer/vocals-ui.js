/**
 * vocals-ui.js — Hirsch Music Hit Maker
 * Gesangs-Stil Modal: VOCAL_STYLES Daten + UI-Funktionen
 * Ausgelagert in v3.26.8 aus index.html
 * Abhängigkeiten: currentLang (global), window.SONG (global)
 */

'use strict';

const VOCAL_STYLES = {

  // ── 1. GESANGSTECHNIK ──────────────────────────────────
  'Gesangstechnik': {
    de: 'Gesangstechnik', en: 'Vocal Technique',
    styles: [
      { de: 'Rauchig',        en: 'Smoky',            value: 'smoky',       emoji: '🌫️' },
      { de: 'Kräftig',        en: 'Powerful',         value: 'powerful',    emoji: '💪' },
      { de: 'Belting',        en: 'Belting',          value: 'belting',     emoji: '🎤' },
      { de: 'Zart',           en: 'Soft',             value: 'soft',        emoji: '🌸' },
      { de: 'Hauchend',       en: 'Breathy',          value: 'breathy',     emoji: '💨' },
      { de: 'Falsetto',       en: 'Falsetto',         value: 'falsetto',    emoji: '🎶' },
      { de: 'Head Voice',     en: 'Head Voice',       value: 'head-voice',  emoji: '🎵' },
      { de: 'Chest Voice',    en: 'Chest Voice',      value: 'chest-voice', emoji: '🫁' },
      { de: 'Vibrato',        en: 'Vibrato',          value: 'vibrato',     emoji: '〰️' },
      { de: 'Growl',          en: 'Growl',            value: 'growl',       emoji: '🔥' },
      { de: 'Rau / Gritty',   en: 'Gritty',          value: 'gritty',      emoji: '⚡' },
      { de: 'Scream',         en: 'Scream',           value: 'scream',      emoji: '😱' },
      { de: 'Flüstern',       en: 'Whisper',          value: 'whisper',     emoji: '🤫' },
      { de: 'Nasal',          en: 'Nasal',            value: 'nasal',       emoji: '👃' },
      { de: 'Melisma',        en: 'Melisma',          value: 'melisma',     emoji: '🌊' },
      { de: 'Staccato',       en: 'Staccato',         value: 'staccato',    emoji: '🎯' },
      { de: 'Legato',         en: 'Legato',           value: 'legato',      emoji: '➰' },
      { de: 'Sprechgesang',   en: 'Sprechgesang',     value: 'sprechgesang',emoji: '💬' },
      { de: 'Harmonien',      en: 'Harmonies',        value: 'harmonies',   emoji: '🎼' },
    ]
  },

  // ── 2. STIMMCHARAKTER ──────────────────────────────────
  'Stimmcharakter': {
    de: 'Stimmcharakter', en: 'Voice Character',
    styles: [
      { de: 'Warm',           en: 'Warm',             value: 'warm',        emoji: '🌞' },
      { de: 'Kühl',           en: 'Cool',             value: 'cool',        emoji: '❄️' },
      { de: 'Dunkel',         en: 'Dark',             value: 'dark',        emoji: '🌑' },
      { de: 'Hell',           en: 'Bright',           value: 'bright',      emoji: '☀️' },
      { de: 'Samtig',         en: 'Velvety',          value: 'velvety',     emoji: '🪶' },
      { de: 'Kristallklar',   en: 'Crystal Clear',    value: 'crystal',     emoji: '💎' },
      { de: 'Heiser',         en: 'Hoarse',           value: 'hoarse',      emoji: '😤' },
      { de: 'Tief / Bariton', en: 'Deep / Baritone',  value: 'baritone',    emoji: '🔊' },
      { de: 'Bass',           en: 'Bass',             value: 'bass',        emoji: '🔉' },
      { de: 'Tenor',          en: 'Tenor',            value: 'tenor',       emoji: '🎵' },
      { de: 'Sopran',         en: 'Soprano',          value: 'soprano',     emoji: '🎶' },
      { de: 'Alt',            en: 'Alto',             value: 'alto',        emoji: '🎤' },
      { de: 'Androgyn',       en: 'Androgynous',      value: 'androgynous', emoji: '🌈' },
      { de: 'Nasalreich',     en: 'Nasal Rich',       value: 'nasal-rich',  emoji: '🎺' },
      { de: 'Rein / Klar',    en: 'Pure / Clear',     value: 'pure',        emoji: '⭐' },
    ]
  },

  // ── 3. GENRE-STIL ─────────────────────────────────────
  'Genre-Stil': {
    de: 'Genre-Stil', en: 'Genre Style',
    styles: [
      { de: 'Soul',           en: 'Soul',             value: 'soul',        emoji: '✨' },
      { de: 'Gospel',         en: 'Gospel',           value: 'gospel',      emoji: '🙏' },
      { de: 'Blues',          en: 'Blues',            value: 'blues',       emoji: '🎸' },
      { de: 'R&B',            en: 'R&B',              value: 'rnb',         emoji: '🎵' },
      { de: 'Hip-Hop / Rap',  en: 'Hip-Hop / Rap',    value: 'rap',         emoji: '🎤' },
      { de: 'Pop',            en: 'Pop',              value: 'pop',         emoji: '⭐' },
      { de: 'Rock',           en: 'Rock',             value: 'rock',        emoji: '🎸' },
      { de: 'Hard Rock',      en: 'Hard Rock',        value: 'hard-rock',   emoji: '🤘' },
      { de: 'Metal',          en: 'Metal',            value: 'metal',       emoji: '💀' },
      { de: 'Country',        en: 'Country',          value: 'country',     emoji: '🤠' },
      { de: 'Twang',          en: 'Twang',            value: 'twang',       emoji: '🪕' },
      { de: 'Folk',           en: 'Folk',             value: 'folk',        emoji: '🌿' },
      { de: 'Jazz',           en: 'Jazz',             value: 'jazz',        emoji: '🎷' },
      { de: 'Crooner',        en: 'Crooner',          value: 'crooner',     emoji: '🎩' },
      { de: 'Opera',          en: 'Opera',            value: 'opera',       emoji: '🎭' },
      { de: 'Klassisch',      en: 'Classical',        value: 'classical',   emoji: '🎻' },
      { de: 'Musical',        en: 'Musical',          value: 'musical',     emoji: '🎬' },
      { de: 'Electronic',     en: 'Electronic',       value: 'electronic',  emoji: '🎛️' },
      { de: 'Indie',          en: 'Indie',            value: 'indie',       emoji: '🎙️' },
      { de: 'Lo-Fi',          en: 'Lo-Fi',            value: 'lo-fi',       emoji: '📻' },
      { de: 'Latin',          en: 'Latin',            value: 'latin',       emoji: '💃' },
      { de: 'Reggae',         en: 'Reggae',           value: 'reggae',      emoji: '🌴' },
      { de: 'Schlager',       en: 'Schlager',         value: 'schlager',    emoji: '🎀' },
      { de: 'Volkslied',      en: 'Folk Song',        value: 'folk-song',   emoji: '🏔️' },
      { de: 'Gospel-Chor',    en: 'Gospel Choir',     value: 'gospel-choir',emoji: '🎵' },
      { de: 'A cappella',     en: 'A cappella',       value: 'acappella',   emoji: '🎤' },
      { de: 'Trap',           en: 'Trap',             value: 'trap',        emoji: '🔊' },
      { de: 'Punk',           en: 'Punk',             value: 'punk',        emoji: '⚡' },
      { de: 'Grunge',         en: 'Grunge',           value: 'grunge',      emoji: '🎸' },
    ]
  },

  // ── 4. EMOTIONALER AUSDRUCK ────────────────────────────
  'Emotionaler Ausdruck': {
    de: 'Emotionaler Ausdruck', en: 'Emotional Expression',
    styles: [
      { de: 'Leidenschaftlich',en: 'Passionate',      value: 'passionate',  emoji: '❤️' },
      { de: 'Melancholisch',  en: 'Melancholic',      value: 'melancholic', emoji: '😔' },
      { de: 'Kraftvoll',      en: 'Powerful',         value: 'epic',        emoji: '⚡' },
      { de: 'Episch',         en: 'Epic',             value: 'epic-feel',   emoji: '🏔️' },
      { de: 'Verspielt',      en: 'Playful',          value: 'playful',     emoji: '😄' },
      { de: 'Leicht',         en: 'Light',            value: 'light',       emoji: '🌤️' },
      { de: 'Intim',          en: 'Intimate',         value: 'intimate',    emoji: '🫶' },
      { de: 'Verletzlich',    en: 'Vulnerable',       value: 'vulnerable',  emoji: '💔' },
      { de: 'Wütend',         en: 'Angry',            value: 'angry',       emoji: '😡' },
      { de: 'Rebellisch',     en: 'Rebellious',       value: 'rebellious',  emoji: '✊' },
      { de: 'Sehnsüchtig',    en: 'Longing',          value: 'longing',     emoji: '💭' },
      { de: 'Freudig',        en: 'Joyful',           value: 'joyful',      emoji: '😊' },
      { de: 'Euphorisch',     en: 'Euphoric',         value: 'euphoric',    emoji: '🥳' },
      { de: 'Traurig',        en: 'Sad',              value: 'sad',         emoji: '😢' },
      { de: 'Hoffnungsvoll',  en: 'Hopeful',          value: 'hopeful',     emoji: '🌅' },
      { de: 'Trotzig',        en: 'Defiant',          value: 'defiant',     emoji: '💪' },
      { de: 'Verführerisch',  en: 'Seductive',        value: 'seductive',   emoji: '😏' },
      { de: 'Nachdenklich',   en: 'Thoughtful',       value: 'thoughtful',  emoji: '🤔' },
      { de: 'Dramatisch',     en: 'Dramatic',         value: 'dramatic',    emoji: '🎭' },
      { de: 'Entspannt',      en: 'Relaxed',          value: 'relaxed',     emoji: '😌' },
      { de: 'Aggressiv',      en: 'Aggressive',       value: 'aggressive',  emoji: '🔥' },
      { de: 'Nostalgisch',    en: 'Nostalgic',        value: 'nostalgic',   emoji: '🕰️' },
    ]
  },

  // ── 5. PERFORMANCE-STIL ────────────────────────────────
  'Performance-Stil': {
    de: 'Performance-Stil', en: 'Performance Style',
    styles: [
      { de: 'Live / Energetisch', en: 'Live / Energetic', value: 'live',     emoji: '🎪' },
      { de: 'Studio-Perfekt',  en: 'Studio Perfect',   value: 'studio',     emoji: '🎚️' },
      { de: 'Roh / Unpoliert', en: 'Raw / Unpolished', value: 'raw',        emoji: '🪨' },
      { de: 'Theatralisch',    en: 'Theatrical',       value: 'theatrical', emoji: '🎬' },
      { de: 'Storytelling',    en: 'Storytelling',     value: 'storytelling',emoji: '📖' },
      { de: 'Minimalistisch',  en: 'Minimalistic',     value: 'minimal',    emoji: '🎯' },
      { de: 'Virtuos',         en: 'Virtuosic',        value: 'virtuosic',  emoji: '🏆' },
      { de: 'Improvisiert',    en: 'Improvised',       value: 'improvised', emoji: '🎲' },
      { de: 'Chorgesang',      en: 'Choir',            value: 'choir',      emoji: '👥' },
      { de: 'Duett',           en: 'Duet',             value: 'duet',       emoji: '👫' },
      { de: 'Spoken Word',     en: 'Spoken Word',      value: 'spoken',     emoji: '🎙️' },
      { de: 'Auto-Tune',       en: 'Auto-Tune',        value: 'autotune',   emoji: '🤖' },
      { de: 'Pitch-Perfect',   en: 'Pitch-Perfect',    value: 'pitch-perfect',emoji: '🎯' },
    ]
  },

};

// State: ausgewählte Gesangs-Stile (multi-select)
let _vocalStyleSelected = [];

// ── Modal öffnen ──
window.openVocalStyleModal = function() {
  const modal = document.getElementById('vocal-style-modal');
  if(!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  buildVocalStyleModal(currentLang);
  setTimeout(() => document.getElementById('vocal-style-search')?.focus(), 100);
};

// ── Modal schließen ──
window.closeVocalStyleModal = function() {
  const modal = document.getElementById('vocal-style-modal');
  if(modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  updateVocalStyleDisplay();
};

// Close on overlay click — deferred so element exists
window.addEventListener('load', function() {
  document.getElementById('vocal-style-modal')?.addEventListener('click', function(e) {
    if(e.target === this) closeVocalStyleModal();
  });
});

// ── Modal Inhalt aufbauen ──
function buildVocalStyleModal(lang, filter) {
  const body = document.getElementById('vocal-style-modal-body');
  if(!body) return;
  
  const q = (filter || '').toLowerCase().trim();
  let html = '';
  
  for(const [catKey, cat] of Object.entries(VOCAL_STYLES)) {
    const catLabel = lang === 'de' ? cat.de : cat.en;
    const visibleStyles = cat.styles.filter(s => {
      if(!q) return true;
      return (s.de + s.en + s.value).toLowerCase().includes(q);
    });
    if(visibleStyles.length === 0) continue;
    
    html += `<div class="vocal-style-cat" style="margin-bottom:16px;">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent2);margin-bottom:8px;">${catLabel}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">`;
    
    for(const s of visibleStyles) {
      const isActive = _vocalStyleSelected.includes(s.value);
      const label = lang === 'de' ? s.de : s.en;
      html += `<button onclick="toggleVocalStyle('${s.value}')" 
        class="vocal-style-chip${isActive ? ' active' : ''}"
        data-value="${s.value}"
        style="padding:6px 12px;border-radius:20px;border:1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'};
               background:${isActive ? 'rgba(45,106,79,0.12)' : 'var(--surface2)'};
               color:${isActive ? 'var(--accent)' : 'var(--text2)'};
               font-size:0.82rem;cursor:pointer;font-weight:${isActive ? '600' : '400'};
               transition:all 0.15s;font-family:inherit;">
        ${s.emoji} ${label}${isActive ? ' ✓' : ''}
      </button>`;
    }
    html += `</div></div>`;
  }
  
  body.innerHTML = html || `<div style="text-align:center;padding:20px;color:var(--text3);">Kein Stil gefunden für "${filter}"</div>`;
  updateVocalStyleSelectionBar();
}

// ── Stil togglen ──
window.toggleVocalStyle = function(value) {
  const idx = _vocalStyleSelected.indexOf(value);
  if(idx >= 0) {
    _vocalStyleSelected.splice(idx, 1);
  } else {
    _vocalStyleSelected.push(value);
  }
  buildVocalStyleModal(currentLang, document.getElementById('vocal-style-search')?.value || '');
  updateVocalStyleSelectionBar();
};

// ── Auswahl löschen ──
window.clearVocalStyleSelection = function() {
  _vocalStyleSelected = [];
  buildVocalStyleModal(currentLang);
  updateVocalStyleSelectionBar();
};

// ── Selektions-Leiste im Modal aktualisieren ──
function updateVocalStyleSelectionBar() {
  const el = document.getElementById('vocal-style-selection');
  if(!el) return;
  if(_vocalStyleSelected.length === 0) {
    el.textContent = currentLang === 'de' ? 'Noch kein Stil gewählt' : 'No style chosen';
    return;
  }
  // Collect labels
  const labels = _vocalStyleSelected.map(v => {
    for(const cat of Object.values(VOCAL_STYLES)) {
      const s = cat.styles.find(x => x.value === v);
      if(s) return (currentLang === 'de' ? s.de : s.en);
    }
    return v;
  });
  el.textContent = labels.join(' · ');
}

// ── Suche filtern ──
window.filterVocalStyles = function(q) {
  buildVocalStyleModal(currentLang, q);
};

// ── Display im Lyrics-Tab + Vocals-Tab aktualisieren ──
function updateVocalStyleDisplay() {
  const lang = currentLang;
  
  // Collect labels and human-readable text
  const labels = _vocalStyleSelected.map(v => {
    for(const cat of Object.values(VOCAL_STYLES)) {
      const s = cat.styles.find(x => x.value === v);
      if(s) return { label: lang === 'de' ? s.de : s.en, emoji: s.emoji };
    }
    return { label: v, emoji: '🎤' };
  });
  
  // 1. Chips im Lyrics-Tab anzeigen
  const displayEl = document.getElementById('vocal-style-display');
  if(displayEl) {
    if(labels.length === 0) {
      displayEl.innerHTML = '';
    } else {
      displayEl.innerHTML = labels.map(l => 
        `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(45,106,79,0.1);
                      color:var(--accent);border:1px solid rgba(45,106,79,0.25);
                      border-radius:12px;padding:2px 8px;font-size:0.75rem;font-weight:600;margin:2px;">
          ${l.emoji} ${l.label}
        </span>`
      ).join('');
    }
  }
  
  // 2. Button-Label aktualisieren
  const btnLabel = document.getElementById('vocal-style-btn-label');
  if(btnLabel) {
    if(labels.length === 0) {
      btnLabel.setAttribute('data-de', 'Stil wählen…');
      btnLabel.setAttribute('data-en', 'Pick style…');
      btnLabel.textContent = lang === 'de' ? 'Stil wählen…' : 'Pick style…';
    } else {
      const txt = labels.slice(0,2).map(l=>l.label).join(', ') + (labels.length > 2 ? ` +${labels.length-2}` : '');
      btnLabel.textContent = txt;
    }
  }
  
  // 3. Auto-Sync zu Vocals-Tab
  const vocStyleHiddenInput = document.getElementById('vocal-style-hint');
  const vocStyleDisplay = document.getElementById('vocal-style-sync-display');
  const vocStyleChips = document.getElementById('vocal-style-sync-chips');
  
  const styleText = labels.map(l => l.emoji + ' ' + l.label).join(', ');
  const styleTextPlain = labels.map(l => l.label).join(', ');
  
  // Update hidden input (used by generateVocalRec)
  if(vocStyleHiddenInput) vocStyleHiddenInput.value = styleTextPlain;
  
  // Update sync display in vocals tab
  if(vocStyleChips) {
    if(labels.length === 0) {
      vocStyleChips.setAttribute('data-de', 'Noch kein Stil gewählt — im Lyrics-Tab auswählen');
      vocStyleChips.setAttribute('data-en', 'No style chosen — select in Lyrics tab');
      vocStyleChips.textContent = lang === 'de' ? 'Noch kein Stil gewählt — im Lyrics-Tab auswählen' : 'No style chosen — select in Lyrics tab';
      vocStyleChips.style.color = 'var(--text3)';
    } else {
      vocStyleChips.innerHTML = labels.map(l => 
        `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(45,106,79,0.1);
                      color:var(--accent);border:1px solid rgba(45,106,79,0.25);
                      border-radius:12px;padding:2px 8px;font-size:0.75rem;font-weight:600;margin:2px;">
          ${l.emoji} ${l.label}
        </span>`
      ).join('');
    }
  }
  
  // 4. Visual feedback: Vocals tab gets a dot indicator
  const vocalsTabBtn = document.querySelector('.tab-btn[onclick*="vocals"]');
  if(vocalsTabBtn) {
    let dot = vocalsTabBtn.querySelector('.tab-dot');
    if(labels.length > 0 && !dot) {
      dot = document.createElement('span');
      dot.className = 'tab-dot';
      vocalsTabBtn.appendChild(dot);
    } else if(labels.length === 0 && dot) {
      dot.remove();
    }
  }
  
  // 5. Sync mit SONG State
  if(typeof SONG !== 'undefined') {
    SONG.vocalStyle = styleTextPlain;
  }
}

// ── Fix: vocals-style-hint ID mismatch in AI engine ──
// The AI engine uses 'vocals-style-hint' but the field is 'vocal-style-hint'
// Patch generateVocalRec to use the correct field
(function fixVocalStyleAIRef() {
  const _orig = window.generateVocalRec;
  if(typeof _orig !== 'function') return;
  window.generateVocalRec = async function() {
    // Ensure vocal-style-hint has current value
    const styleEl = document.getElementById('vocal-style-hint');
    if(styleEl && !styleEl.value && _vocalStyleSelected.length > 0) {
      const labels = _vocalStyleSelected.map(v => {
        for(const cat of Object.values(VOCAL_STYLES)) {
          const s = cat.styles.find(x => x.value === v);
          if(s) return (currentLang === 'de' ? s.de : s.en);
        }
        return v;
      });
      styleEl.value = labels.join(', ');
    }
    return _orig.apply(this, arguments);
  };
})();

// ── Gesangs-Stil auch in Lyrics AI-Generierung einbeziehen ──
(function injectVocalStyleIntoLyrics() {
  const _orig = window.generateLyrics;
  if(typeof _orig !== 'function') return;
  window.generateLyrics = async function() {
    // Inject vocal style into SONG before generating
    if(_vocalStyleSelected.length > 0 && typeof SONG !== 'undefined') {
      const labels = _vocalStyleSelected.map(v => {
        for(const cat of Object.values(VOCAL_STYLES)) {
          const s = cat.styles.find(x => x.value === v);
          if(s) return s.en; // always English for AI
        }
        return v;
      });
      SONG.vocalStyle = labels.join(', ');
    }
    return _orig.apply(this, arguments);
  };
})();

// ── Patch AI generateLyrics prompt to include vocal style ──
(function patchLyricsPromptForVocalStyle() {
  const _origHirschAI = window.hirschAICall;
  if(typeof _origHirschAI !== 'function') return;
  
  // We inject vocal style into the user prompt for lyrics generation
  // This is done by patching generateLyrics's userPrompt construction
  // Instead, we patch it at the SONG level — the AI engine already reads SONG.vocalStyle
  // Actually we need to modify the AI prompt directly.
  // The cleanest way: modify the generateLyrics userPrompt to include vocal style.
  
  const _origGL = window.generateLyrics;
  if(typeof _origGL !== 'function') return;
  
  window.generateLyrics = async function() {
    // Store vocal style for the next hirschAICall
    window._pendingVocalStyle = _vocalStyleSelected.length > 0 ? 
      _vocalStyleSelected.map(v => {
        for(const cat of Object.values(VOCAL_STYLES)) {
          const s = cat.styles.find(x => x.value === v);
          if(s) return s.en;
        }
        return v;
      }).join(', ') : '';
    return _origGL.apply(this, arguments);
  };
  
  // Patch hirschAICall to inject vocal style into lyrics prompts
  const _vsOrigHAI = window.hirschAICall;
  window.hirschAICall = async function(systemPrompt, userPrompt, opts) {
    if(window._pendingVocalStyle && userPrompt && 
       (userPrompt.includes('Genre:') || userPrompt.includes('Thema:') || userPrompt.includes('Theme:'))) {
      // This is a lyrics prompt — inject vocal style
      const lang = currentLang === 'de' ? 'de' : 'en';
      const styleLabel = lang === 'de' ? 'Gesangs-Stil' : 'Vocal Style';
      userPrompt = userPrompt + `\n${styleLabel}: ${window._pendingVocalStyle}`;
      window._pendingVocalStyle = ''; // consume
    }
    return _origHirschAI.call(this, systemPrompt, userPrompt, opts);
  };
})();

// ── Keyboard: Escape closes modal ──
document.addEventListener('keydown', function(e) {
  if(e.key === 'Escape') {
    const modal = document.getElementById('vocal-style-modal');
    if(modal && modal.style.display !== 'none') {
      closeVocalStyleModal();
      e.stopPropagation();
    }
  }
});

console.log('🎤 Gesangs-Stil Modul geladen —', Object.values(VOCAL_STYLES).reduce((a,c)=>a+c.styles.length,0), 'Stile verfügbar');


// Exports für HirschApp Namespace (wird von index.html genutzt)
if (typeof window.HirschApp !== 'undefined') {
  window.HirschApp.vocals = {
    openModal:  () => typeof openVocalStyleModal     === 'function' && openVocalStyleModal(),
    closeModal: () => typeof closeVocalStyleModal    === 'function' && closeVocalStyleModal(),
    toggle:     (v) => typeof toggleVocalStyle       === 'function' && toggleVocalStyle(v),
    filter:     (q) => typeof filterVocalStyles      === 'function' && filterVocalStyles(q),
    clear:      () => typeof clearVocalStyleSelection=== 'function' && clearVocalStyleSelection(),
  };
}
