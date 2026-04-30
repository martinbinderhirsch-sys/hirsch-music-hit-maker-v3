// Gemeinsame Typen für Main + Renderer.

export type ModelId =
  | 'openai/gpt-4o'
  | 'google/gemini-2.5-flash'
  | 'anthropic/claude-3.5-sonnet';

export interface AppSettings {
  openrouterApiKey: string;
  defaultModel: ModelId;
  outputLanguage: string;   // ISO-639-1, z.B. 'en', 'de'
  outputLocale: string;     // BCP-47, z.B. 'en-US', 'de-DE'
  theme: 'dark' | 'light';
}

export interface AIRouteRequest {
  model: ModelId;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIRouteResponse {
  ok: boolean;
  model: ModelId;
  text: string;
  error?: string;
}

export interface LyricsRequest {
  topic: string;
  genre: string;       // z.B. 'country', 'blues', 'americana', 'pop'
  mood: string;        // z.B. 'melancholic', 'uplifting'
  language: string;    // ISO-639-1
  locale: string;      // BCP-47, z.B. 'en-US'
  style: string;       // 'modern', 'traditional', 'radio-friendly', 'raw'
  rhymeStrictness: number; // 1-10
  syllableTarget?: number;
  bilingual?: boolean;
  keepChorusInOriginal?: boolean;
}

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string; releaseNotes?: string }
  | { phase: 'not-available'; currentVersion: string }
  | { phase: 'downloading'; percent: number; transferred: number; total: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string };

export type LyricsProgress =
  | { stage: 'songDna';   status: 'start' | 'done' }
  | { stage: 'draft';     status: 'start' | 'done' }
  | { stage: 'polish';    status: 'start' | 'done' }
  | { stage: 'localize';  status: 'start' | 'done' }
  | { stage: 'error';     status: 'error'; message: string };

export interface LyricsPipelineResult {
  songDna: string;        // Stufe 1: sprachneutrale Song-DNA
  draft: string;          // Stufe 2: Creative Draft in Zielsprache
  polished: string;       // Stufe 3: Linguistic Polish Pass
  localized: string;      // Stufe 4: Localization / Human Pass
  meta: {
    language: string;
    locale: string;
    model: ModelId;
    durationMs: number;
  };
}

// === Fusion-Tab: Song-Architektur, Akkorde, Stimme, Tempo ===

export type VoiceGender = 'male' | 'female' | 'duet' | 'any';

export type SectionKind =
  | 'intro' | 'verse' | 'pre-chorus' | 'chorus'
  | 'post-chorus' | 'bridge' | 'solo' | 'outro' | 'hook' | 'tag';

export interface FusionSection {
  id: string;
  kind: SectionKind;
  label?: string;            // optionaler Custom-Name ("Verse 1", "Chorus alt")
  bars: number;              // Anzahl Takte
  chords: string;            // einfache Notation: "C  G  Am  F" / "Cmaj7 - Em7 - F - G"
  lyricsRef?: 'verse1' | 'verse2' | 'chorus' | 'bridge' | string;
  notes?: string;            // Performance-Hinweise
}

export interface FusionData {
  voice: VoiceGender;
  tempoBpm: number;          // 40-220
  key: string;               // z.B. "C", "Am", "G#m"
  timeSignature: string;     // "4/4", "3/4", "6/8"
  feel: string;              // freitext: "Shuffle", "Straight 8th", "Half-time"
  sections: FusionSection[];
  arrangement?: string;      // Freitext-Beschreibung des Arrangements
  updatedAt?: string;
}

export interface FusionGenerateRequest {
  songId: string;            // Referenz aufs gespeicherte Song-Projekt
  templateId?: string;       // optionaler Vorlagen-Hint ("pop-classic" etc.)
  voice?: VoiceGender;       // Vorgabe vom Nutzer
  preferredKey?: string;
  preferredBpm?: number;
  model?: ModelId;
}

export interface FusionTemplate {
  id: string;
  name: string;              // "Pop Klassisch", "Country Ballade", "Rock Standard"
  genres: string[];          // passende Genres
  feel: string;
  timeSignature: string;
  defaultBpm: number;
  sections: Omit<FusionSection, 'id' | 'chords'>[];  // Akkorde werden später gefüllt
}

// Persistiertes Song-Projekt im userData-Ordner.
export interface SongProject {
  id: string;                // ULID-ähnlich, lokal generiert
  title: string;             // Titel — vom Nutzer editierbar
  createdAt: string;         // ISO-Timestamp
  updatedAt: string;
  request: LyricsRequest;    // Originaler Eingabesatz
  result: LyricsPipelineResult;
  fusion?: FusionData;       // T06 — Song-Architektur
  notes?: string;            // Freitext-Notiz
  favorite?: boolean;
}

export interface SongListEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  genre: string;
  locale: string;
  favorite: boolean;
  hasFusion?: boolean;
}
