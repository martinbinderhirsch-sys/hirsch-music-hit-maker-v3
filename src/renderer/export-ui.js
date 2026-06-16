/**
 * export-ui.js — Hirsch Music Hit Maker
 * Export UI Module + HirschModules Framework
 * Ausgelagert in v3.26.8 aus index.html
 * Abhängigkeiten: exportAsPDF, exportAsTXT, exportAsDOCX, printLyrics,
 *                 generateAlbumCover, switchExportFormat, copyExportFormat,
 *                 copyOutput (alle global in index.html)
 */

'use strict';

window.HirschModules = window.HirschModules || {};

// ── Export UI Module ─────────────────────────────────────────────
window.HirschModules.exportUI = (function() {
  const ACTION_MAP = {
    docx:  () => typeof exportAsDOCX      === 'function' && exportAsDOCX(),
    pdf:   () => typeof exportAsPDF       === 'function' && exportAsPDF(),
    txt:   () => typeof exportAsTXT       === 'function' && exportAsTXT(),
    print: () => typeof printLyrics       === 'function' && printLyrics(),
    cover: () => typeof generateAlbumCover=== 'function' && generateAlbumCover(),
  };

  function bindDownloadGrid() {
    const grid = document.getElementById('export-download-grid');
    if (!grid || grid.dataset.bound) return;
    grid.querySelectorAll('.export-dl-btn').forEach(function(btn) {
      const action = btn.dataset.action;
      const hoverColor = btn.dataset.hover || 'var(--accent)';
      const defaultColor = btn.dataset.hoverDefault || 'var(--border)';
      btn.addEventListener('click', function() {
        const fn = ACTION_MAP[action];
        if (fn) fn();
        else console.warn('[HirschModules.exportUI] Unknown action:', action);
      });
      btn.addEventListener('mouseenter', function() { btn.style.borderColor = hoverColor; });
      btn.addEventListener('mouseleave', function() { btn.style.borderColor = defaultColor; });
    });
    grid.dataset.bound = '1';
  }

  function bindFormatTabs() {
    const tabs = document.getElementById('export-format-tabs');
    if (!tabs || tabs.dataset.bound) return;
    tabs.querySelectorAll('.export-format-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        const fmt = tab.dataset.format;
        if (typeof switchExportFormat === 'function') switchExportFormat(fmt, tab);
      });
    });
    tabs.dataset.bound = '1';
  }

  function bindCopyButtons() {
    document.querySelectorAll('[data-copy-format]').forEach(function(btn) {
      if (btn.dataset.bound) return;
      btn.addEventListener('click', function() {
        if (typeof copyExportFormat === 'function') copyExportFormat(btn.dataset.copyFormat);
      });
      btn.dataset.bound = '1';
    });
    document.querySelectorAll('[data-copy-output]').forEach(function(btn) {
      if (btn.dataset.bound) return;
      btn.addEventListener('click', function() {
        if (typeof copyOutput === 'function') copyOutput(btn.dataset.copyOutput);
      });
      btn.dataset.bound = '1';
    });
  }

  function bindExportName() {
    const inp = document.getElementById('export-name');
    if (!inp || inp.dataset.bound) return;
    inp.addEventListener('input', function() {
      if (window.SONG) window.SONG.lyricsTitle = inp.value;
    });
    inp.dataset.bound = '1';
  }

  function bindCoverBtn() {
    const btn = document.getElementById('cover-generate-btn');
    if (btn && !btn.dataset.bound) {
      btn.addEventListener('click', function() {
        if (typeof generateAlbumCover === 'function') generateAlbumCover();
      });
      btn.dataset.bound = '1';
    }
    // Print buttons via data-action-print
    document.querySelectorAll('[data-action-print]').forEach(function(b) {
      if (b.dataset.bound) return;
      b.addEventListener('click', function() {
        if (typeof printLyrics === 'function') printLyrics();
      });
      b.dataset.bound = '1';
    });
  }

  function init() {
    bindDownloadGrid();
    bindFormatTabs();
    bindCopyButtons();
    bindExportName();
    bindCoverBtn();
  }

  return { init, bindDownloadGrid, bindFormatTabs };
})();

// ── Onboarding UI Module ─────────────────────────────────────────
window.HirschModules.onboardingUI = (function() {
  function bindButtons() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay || overlay.dataset.bound) return;
    overlay.querySelectorAll('[data-onboarding-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const action = btn.dataset.onboardingAction;
        overlay.remove();
        if (action === 'genre' && typeof openGenreModal === 'function') {
          openGenreModal('lyrics');
        }
      });
    });
    overlay.dataset.bound = '1';
  }
  return { bindButtons };
})();

// ══════════════════════════════════════════════════════════════════
// v3.27.1 — HirschModules.formFields
// Einheitliches Binding-System für onchange + oninput Felder
// Ersetzt alle Inline-onchange/oninput durch data-field-action
// ══════════════════════════════════════════════════════════════════
window.HirschModules.formFields = (function() {

  // ── Aktions-Mapping ─────────────────────────────────────────────
  const ACTIONS = {

    // Lyrics-Tab: syncFromLyrics() bei Texteingabe + Selects
    'sync-lyrics': function(el) {
      if (typeof syncFromLyrics === 'function') syncFromLyrics();
    },

    // Intensity-Slider: Display-Wert aktualisieren
    'update-intensity-display': function(el) {
      var disp = document.getElementById('lyrics-intensity-val');
      if (disp) disp.textContent = el.value;
    },

    // Beat-Tab: BPM-Slider (Fill + Display + syncFromBeat)
    'sync-beat-bpm': function(el) {
      var mid = document.getElementById('bpm-range-mid');
      if (mid) mid.textContent = el.value + ' BPM';
      var val = document.getElementById('bpm-val');
      if (val) val.textContent = el.value;
      if (typeof updateBPMSliderFill === 'function') updateBPMSliderFill();
      if (typeof syncFromBeat === 'function') syncFromBeat();
    },

    // Beat-Tab: Key + Era Selects
    'sync-beat': function(el) {
      if (typeof syncFromBeat === 'function') syncFromBeat();
    },

    // Library: Suchfeld + Genre-Filter
    'filter-library': function(el) {
      if (typeof filterLibrary === 'function') filterLibrary();
    },
    'filter-library-genre': function(el) {
      if (typeof filterLibrary === 'function') filterLibrary();
      if (typeof libGenreChanged === 'function') libGenreChanged();
    },

    // Workbench: Projektdatei laden
    'load-project-file': function(el) {
      if (typeof wbLoadProjectFile === 'function') wbLoadProjectFile(el);
    },

    // Modal-Suchfelder
    'filter-genre-modal': function(el) {
      if (typeof filterGenreModal === 'function') filterGenreModal(el.value);
    },
    'filter-structure-modal': function(el) {
      if (typeof filterStructureModal === 'function') filterStructureModal(el.value);
    },
    'filter-persona': function(el) {
      if (typeof filterPersonaItems === 'function') filterPersonaItems(el.value);
    },
    'filter-vocal-hint': function(el) {
      if (typeof filterVocalHintModal === 'function') filterVocalHintModal(el.value);
    },
    'filter-vocal-perf': function(el) {
      if (typeof filterVocalPerfModal === 'function') filterVocalPerfModal(el.value);
    },
    'filter-theme-modal': function(el) {
      if (typeof filterThemeModal === 'function') filterThemeModal(el.value);
    },
    'filter-vocal-style': function(el) {
      if (typeof filterVocalStyles === 'function') filterVocalStyles(el.value);
    },
  };

  // ── Binding ─────────────────────────────────────────────────────
  function bind(root) {
    root = root || document;
    root.querySelectorAll('[data-field-action]').forEach(function(el) {
      if (el.dataset.fieldBound) return;
      var action = el.dataset.fieldAction;
      var fn = ACTIONS[action];
      if (!fn) {
        console.warn('[HirschModules.formFields] Unbekannte Action:', action);
        return;
      }
      // Selects + file inputs: onchange; alle anderen: oninput
      var evt = (el.tagName === 'SELECT' || el.type === 'file') ? 'change' : 'input';
      el.addEventListener(evt, function() { fn(el); });
      el.dataset.fieldBound = '1';
    });
  }

  return { bind, ACTIONS };
})();

// ── Init: alle Module beim Tab-Wechsel + Start binden ────────────
(function() {
  function bindAll() {
    window.HirschModules.exportUI.init();
    window.HirschModules.onboardingUI.bindButtons();
    window.HirschModules.formActions.bind();
    window.HirschModules.formFields.bind();
    bindTabButtons();
    bindHeaderButtons();
    if (window.HirschModules.libraryUI) window.HirschModules.libraryUI.bindFilterControls();
  }


// ══════════════════════════════════════════════════════════════════
// v3.27.0 — HirschModules.formActions
// Einheitliches Action-System für alle Formular- und Modal-Buttons
// ══════════════════════════════════════════════════════════════════
window.HirschModules.formActions = (function() {

  // ── Aktions-Mapping ─────────────────────────────────────────────
  const ACTIONS = {
    // Modal openers
    'open-theme':       (btn) => typeof openThemeModal        === 'function' && openThemeModal(),
    'open-genre':       (btn) => typeof openGenreModal        === 'function' && openGenreModal(btn.dataset.target || 'lyrics'),
    'open-mood':        (btn) => typeof openMoodModal         === 'function' && openMoodModal(btn.dataset.target || 'lyrics'),
    'open-situation':   (btn) => typeof openSituationModal    === 'function' && openSituationModal(btn.dataset.target || 'lyrics'),
    'open-structure':   (btn) => typeof openStructureModal    === 'function' && openStructureModal(),
    'open-vocal-style': (btn) => typeof openVocalStyleModal   === 'function' && openVocalStyleModal(),
    'open-instrumental':(btn) => typeof openInstrumentalModal === 'function' && openInstrumentalModal(),
    'open-persona':     (btn) => typeof openPersonaModal      === 'function' && openPersonaModal(),
    // Modal closers
    'close-genre':      (btn) => typeof closeGenreModal       === 'function' && closeGenreModal(),
    'close-structure':  (btn) => typeof closeStructureModal   === 'function' && closeStructureModal(),
    'close-mood':       (btn) => typeof closeMoodModal        === 'function' && closeMoodModal(),
    'close-instrumental':(btn)=> typeof closeInstrumentalModal=== 'function' && closeInstrumentalModal(),
    'close-situation':  (btn) => typeof closeSituationModal   === 'function' && closeSituationModal(),
    // Modal clear
    'clear-mood':       (btn) => typeof clearMoodModal        === 'function' && clearMoodModal(),
    'clear-situation':  (btn) => typeof clearSituationModal   === 'function' && clearSituationModal(),
    // Generate actions
    'generate-lyrics':  (btn) => typeof generateLyrics        === 'function' && generateLyrics(),
    'generate-7ki':     (btn) => typeof generateLyrics7KI     === 'function' && generateLyrics7KI(),
    'generate-beat':    (btn) => typeof generateBeatPrompt    === 'function' && generateBeatPrompt(),
    'generate-superki': (btn) => typeof generateSuperKI       === 'function' && generateSuperKI(),
    // Copy actions
    'copy-output':      (btn) => typeof copyOutput            === 'function' && copyOutput(btn.dataset.target),
  };

  // ── Modal-Overlay-Closer-Mapping ────────────────────────────────
  const OVERLAY_CLOSERS = {
    'genre':     () => typeof closeGenreModal       === 'function' && closeGenreModal(),
    'instr':     () => typeof closeInstrumentalModal=== 'function' && closeInstrumentalModal(),
    'mood':      () => typeof closeMoodModal        === 'function' && closeMoodModal(),
    'structure': () => typeof closeStructureModal   === 'function' && closeStructureModal(),
    'situation': () => typeof closeSituationModal   === 'function' && closeSituationModal(),
  };

  // ── Binding ─────────────────────────────────────────────────────
  function bind(root) {
    root = root || document;

    // data-form-action buttons
    root.querySelectorAll('[data-form-action]').forEach(function(btn) {
      if (btn.dataset.bound) return;
      var action = btn.dataset.formAction;
      var fn = ACTIONS[action];
      if (fn) {
        btn.addEventListener('click', function() { fn(btn); });
        btn.dataset.bound = '1';
      }
    });

    // data-modal-close-outside overlays
    root.querySelectorAll('[data-modal-close-outside]').forEach(function(overlay) {
      if (overlay.dataset.bound) return;
      var modalKey = overlay.dataset.modalCloseOutside;
      var fn = OVERLAY_CLOSERS[modalKey];
      if (fn) {
        overlay.addEventListener('click', function(e) {
          if (e.target === overlay) fn();
        });
        overlay.dataset.bound = '1';
      }
    });
  }

  return { bind, ACTIONS };
})();

  // ── Tab-Buttons ─────────────────────────────────────────────
  function bindTabButtons() {
    document.querySelectorAll('[data-tab]').forEach(function(btn) {
      if (btn.dataset.bound) return;
      btn.addEventListener('click', function() {
        if (typeof switchTab === 'function') switchTab(btn.dataset.tab, btn);
      });
      btn.dataset.bound = '1';
    });
  }

  // ── Header-Action-Buttons ────────────────────────────────────
  const HEADER_ACTIONS = {
    'save':        () => typeof wbSaveToLocalStorage === 'function' && wbSaveToLocalStorage(),
    'new-project': () => typeof confirmNewProject    === 'function' && confirmNewProject(),
    'tutorial':    () => typeof startTutorial        === 'function' && startTutorial(),
    'shortcuts':   () => typeof toggleShortcuts      === 'function' && toggleShortcuts(),
    'lang-de':     () => typeof setLang              === 'function' && setLang('de'),
    'lang-en':     () => typeof setLang              === 'function' && setLang('en'),
    'theme':       () => typeof toggleTheme          === 'function' && toggleTheme(),
    'pwa-install': () => typeof pwaInstall           === 'function' && pwaInstall(),
  };

  function bindHeaderButtons() {
    document.querySelectorAll('[data-header-action]').forEach(function(btn) {
      if (btn.dataset.bound) return;
      const action = btn.dataset.headerAction;
      const fn = HEADER_ACTIONS[action];
      if (fn) {
        btn.addEventListener('click', fn);
        btn.dataset.bound = '1';
      }
    });
  }

  // Sofort binden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll);
  } else {
    bindAll();
  }

  // Auch nach Tab-Wechsel neu binden (falls Tab lazy gerendert)
  const origSwitch = window.switchTab;
  if (typeof origSwitch === 'function') {
    window.switchTab = function(tab) {
      origSwitch(tab);
      setTimeout(bindAll, 50); // kurz warten bis DOM aktuell
    };
  }
})();

console.log('[HirschModules] ✅ v3.27.1 geladen');
