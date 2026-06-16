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

// ── Init: alle Module beim Tab-Wechsel + Start binden ────────────
(function() {
  function bindAll() {
    window.HirschModules.exportUI.init();
    window.HirschModules.onboardingUI.bindButtons();
    bindTabButtons();
    bindHeaderButtons();
    if (window.HirschModules.libraryUI) window.HirschModules.libraryUI.bindFilterControls();
  }

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

console.log('[HirschModules] ✅ v3.26.7 geladen');
