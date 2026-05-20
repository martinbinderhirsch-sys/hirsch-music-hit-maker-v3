/**
 * HIRSCH MUSIC HIT MAKER — Typen & Interfaces
 * =============================================
 * TypeScript-Definitionen für alle Kernstrukturen der App.
 * (Wird als Referenz verwendet — die App läuft als reines JS)
 */

// ─── Song & Lyrics ────────────────────────────────────────────────

/** Eine gespeicherte Lyrics-Version */
export interface LyricsVersion {
  /** Vollständiger Lyrics-Text */
  text: string;
  /** Anzeige-Titel (aus erstem Abschnitt oder Freitext) */
  title: string;
  /** Fortlaufende Versions-Nummer (persitent in localStorage) */
  vNum: number;
  /** Erstellungs-Zeitstempel */
  timestamp: Date;
  /** Als Favorit markiert? */
  favorite: boolean;
}

/** State des Lyrics-Generators */
export interface LyricsState {
  /** Genre-Keys (z.B. ['rock', 'blues']) */
  genre: string[];
  /** Mood-Keys (z.B. ['melancholic', 'hopeful']) */
  mood: string[];
  /** Songwriter-Personas (max. 3 Künstler-Namen) */
  personas: string[];
  /** Ausgabe-Sprache: 'de' | 'en' */
  lang: 'de' | 'en';
  /** Freitext-Thema des Songs */
  theme: string;
  /** Song-Struktur-Key (z.B. 'v-c-v-c-b-c') */
  structure: string;
  /** Optionale Songwriter-Hinweise */
  notes: string;
  /** Reimschema: 'auto' | 'AABB' | 'ABAB' | 'free' | ... */
  rhyme: string;
}

/** Ergebnis der KI-Pipeline */
export interface PipelineResult {
  /** Finaler Lyrics-Text (von Claude Editor synthetisiert) */
  lyrics: string;
  /** Automatisch erkannter Song-Titel */
  title: string;
  /** Wie viele der 8 KI-Songwriter erfolgreich waren */
  successCount: number;
  /** Einzelne KI-Entwürfe (für Debugging) */
  drafts?: KIDraft[];
}

/** Ein einzelner KI-Entwurf */
export interface KIDraft {
  /** KI-Name (z.B. 'GPT-4o', 'Claude Sonnet') */
  model: string;
  /** KI-ID (z.B. 'gpt', 'claude') */
  id: string;
  /** Generierter Text */
  text: string;
  /** Fehler (falls gescheitert) */
  error?: string;
}

// ─── Künstler & Stile ─────────────────────────────────────────────

/** Artist DNA Eintrag (Stil-Fingerprint) */
export interface ArtistDNA {
  /** Stil-Beschreibung auf Deutsch */
  de: string;
  /** Stil-Beschreibung auf Englisch */
  en: string;
  /** Bevorzugtes Reimschema */
  rhyme: string;
  /** Typische Textlänge */
  length: string;
}

/** Mood DNA Eintrag */
export interface MoodDNA {
  /** Mood-Name auf Deutsch */
  de: string;
  /** Mood-Name auf Englisch */
  en: string;
  /** Konkrete Schreib-Anweisungen auf Deutsch */
  instrDE: string;
  /** Konkrete Schreib-Anweisungen auf Englisch */
  instrEN: string;
  /** Empfohlene Tonarten */
  keys: string[];
  /** Empfohlenes BPM-Bereich */
  bpmRange: [number, number];
}

/** Persona-Kategorie */
export interface PersonaCategory {
  cat_de: string;
  cat_en: string;
  items:  string[];
}

// ─── Song-Profil (Song-Analyse) ───────────────────────────────────

/** Analysiertes Song-Profil (von GPT-4o) */
export interface SongProfile {
  genre:            string;
  subgenre?:        string;
  stimmung:         string[];
  tonart:           string;
  tempo:            string;
  struktur:         string;
  stimme_geschlecht: 'male' | 'female' | 'both';
  energie:          'low' | 'medium' | 'high';
  kommerziell:      string;
  empfehlung:       string;
}

// ─── Referenz-Daten ───────────────────────────────────────────────

/** Ein Song-Eintrag in der Datenbank */
export interface RefSong {
  /** Genre-Key (z.B. 'rock', 'rocknroll') */
  g: string;
  /** Rang innerhalb des Genres (1–200) */
  r: number;
  /** Song-Titel */
  t: string;
  /** Künstler-Name */
  a: string;
  /** Erscheinungsjahr */
  y: number;
  /** Beats pro Minute */
  b: number;
  /** Tonart (optional) */
  k?: string;
}

// ─── KI-Pipeline ──────────────────────────────────────────────────

/** Die zentrale KI-Pipeline */
export interface HirschPipeline {
  /**
   * Generiert einen Song basierend auf dem übergebenen State.
   * Intern: 8 parallele Songwriter → GPT Humanity-Check → Claude Editor
   */
  generate(state: LyricsState): Promise<PipelineResult>;

  /**
   * Analysiert einen Song-Text und gibt ein strukturiertes Profil zurück.
   * Primär: GPT-4o — Fallback: Claude Sonnet
   */
  analyzeSongProfile(lyrics: string): Promise<SongProfile>;
}

// ─── Globale Window-Erweiterungen ────────────────────────────────

declare global {
  interface Window {
    /** Zentrale KI-Pipeline */
    HIRSCH_PIPELINE:        HirschPipeline;
    /** 24.000+ Songs Datenbank */
    REF_DATA:               RefSong[];
    /** Künstler Stil-Fingerprints */
    ARTIST_DNA:             Record<string, ArtistDNA>;
    /** Mood Schreib-Anweisungen */
    MOOD_DNA:               Record<string, MoodDNA>;
    /** Songwriter Personas */
    PERSONAS:               PersonaCategory[];
    /** App-Sprache */
    currentLang:            'de' | 'en';
    /** Gewählte Personas (max. 3) */
    _selectedPersonas:      string[];
    /** Letzter Lyrics-Text für Workbench */
    _lastLyricsForWorkbench: string;
    /** Desktop-App Version (injiziert von main.js) */
    _desktopAppVersion?:    string;
    /** Läuft als Electron-App? */
    _isElectronApp?:        boolean;
    /** Letztes analysiertes Song-Profil */
    _lastSongProfile?:      SongProfile;
    /** Genre-State pro Tab */
    genreState:             Record<string, string[]>;
    /** Mood-State pro Tab */
    moodState:              Record<string, string[]>;
  }
}

export {};
