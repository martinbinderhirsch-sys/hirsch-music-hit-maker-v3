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
