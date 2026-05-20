// referenceBank.js
// Hirsch Music Hit Maker — Reference Bank v1.1
// Enthält 100 kuratierte Referenzsongs für Kalibrierung und Vergleich.
// Songs werden in 10 Etappen über referenceBank.songs.0X.js geladen.
// v3.25.6: aspirational vs. realistic Tier-Unterscheidung

(function () {
  'use strict';

  const REFERENCE_BANK = {
    schemaVersion: '1.1',
    createdAt: '2026-05-18',
    totalSongs: 0,
    songs: []
  };

  // v3.25.6 — Tier-Leiter (von unten nach oben)
  const TIER_LADDER = [
    'rebuild',
    'needs_work',
    'workable',
    'strong_release',
    'masterpiece_candidate',
    'release_ready'
  ];

  // v3.25.6: realistic tier = measured by calibration run, NOT predicted.
  // Falls back to score-based estimate only if no measurement exists yet.
  function _realisticTierFromRange(expected_score_range) {
    // After first calibration run, target_tier_realistic is set directly.
    // This function is the PRE-CALIBRATION fallback only.
    if (!Array.isArray(expected_score_range) || expected_score_range.length !== 2) {
      return 'workable';
    }
    // Estimate based on range midpoint — conservative (reflects avg nachhall ~44 in bank)
    const mid = (expected_score_range[0] + expected_score_range[1]) / 2;
    if (mid >= 88) return 'strong_release';   // nachhall ~44 caps out here
    if (mid >= 72) return 'strong_release';
    if (mid >= 58) return 'workable';
    if (mid >= 42) return 'needs_work';
    return 'rebuild';
  }

  // Migriert einen Song: trennt aspirational und realistic
  function _migrateSongTier(song) {
    if (!song) return song;
    // Sicherung des ursprünglichen aspirational-Werts (einmalig)
    if (!song.target_tier_aspirational && song.target_tier) {
      song.target_tier_aspirational = song.target_tier;
    }
    // Immer aktuell berechnen
    song.target_tier_realistic = _realisticTierFromRange(song.expected_score_range);
    return song;
  }

  function _addSongs(arr) {
    if (!Array.isArray(arr)) return;
    for (let s of arr) {
      if (!s || typeof s.id !== 'number') continue;
      s = _migrateSongTier(s);
      const existing = REFERENCE_BANK.songs.findIndex(x => x.id === s.id);
      if (existing >= 0) REFERENCE_BANK.songs[existing] = s;
      else REFERENCE_BANK.songs.push(s);
    }
    REFERENCE_BANK.songs.sort((a, b) => a.id - b.id);
    REFERENCE_BANK.totalSongs = REFERENCE_BANK.songs.length;
  }

  function getBank() {
    return REFERENCE_BANK;
  }

  function getSong(id) {
    return REFERENCE_BANK.songs.find(s => s.id === id) || null;
  }

  function filterBank(filter) {
    filter = filter || {};
    return REFERENCE_BANK.songs.filter(s => {
      if (filter.family      && s.family      !== filter.family)      return false;
      if (filter.shade       && s.shade       !== filter.shade)       return false;
      if (filter.voice       && s.voice       !== filter.voice)       return false;
      if (filter.language    && s.language    !== filter.language)    return false;
      if (filter.risk_level  && s.risk_level  !== filter.risk_level)  return false;
      if (filter.target_tier && s.target_tier !== filter.target_tier) return false;
      return true;
    });
  }

  // v3.26.0 — Ähnlichkeitsfunktion und Nachbarschaftssuche
  function _similarityScore(songA, songB) {
    let score = 0;
    if (songA.family    && songA.family    === songB.family)    score += 5;
    if (songA.shade     && songA.shade     === songB.shade)     score += 4;
    if (songA.voice     && songA.voice     === songB.voice)     score += 2;
    if (songA.language  && songA.language  === songB.language)  score += 2;
    if (songA.risk_level && songA.risk_level === songB.risk_level) score += 1;
    return score;
  }

  function findSimilarSongs(query, limit) {
    limit = limit || 5;
    if (!query || !REFERENCE_BANK.songs.length) return [];
    return REFERENCE_BANK.songs
      .map(function(s) { return { song: s, similarity: _similarityScore(query, s) }; })
      .filter(function(x) { return x.similarity > 0; })
      .sort(function(a, b) { return b.similarity - a.similarity; })
      .slice(0, limit)
      .map(function(x) { return Object.assign({}, x.song, { _similarity: x.similarity }); });
  }

  function bankStats() {
    const families  = {};
    const voices    = {};
    const risks     = {};
    const tiers     = {};
    const realistic = {};
    const langs     = {};
    for (const s of REFERENCE_BANK.songs) {
      if (s.family)               families[s.family]                       = (families[s.family]                       || 0) + 1;
      if (s.voice)                voices[s.voice]                          = (voices[s.voice]                          || 0) + 1;
      if (s.risk_level)           risks[s.risk_level]                      = (risks[s.risk_level]                      || 0) + 1;
      if (s.target_tier)          tiers[s.target_tier]                     = (tiers[s.target_tier]                     || 0) + 1;
      if (s.target_tier_realistic)realistic[s.target_tier_realistic]       = (realistic[s.target_tier_realistic]       || 0) + 1;
      if (s.language)             langs[s.language]                        = (langs[s.language]                        || 0) + 1;
    }
    return {
      total: REFERENCE_BANK.songs.length,
      families, voices, risks, tiers, realistic, langs
    };
  }

  // Export to window
  window.HIRSCH_REFERENCE_BANK = {
    addSongs:    _addSongs,
    getBank,
    getSong,
    filterBank,
    bankStats,
    findSimilarSongs,
    TIER_LADDER,
    realisticTierFromRange: _realisticTierFromRange
  };

  console.log('[ReferenceBank] ✅ Modul geladen — warte auf Song-Loader.');

})();
