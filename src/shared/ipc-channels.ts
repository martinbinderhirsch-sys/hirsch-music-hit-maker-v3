// Zentrale IPC-Kanal-Konstanten — werden von Main, Preload und Renderer importiert.
// Ein Kanal = ein Vertrag. Niemals Strings irgendwo hartcodieren.

export const IPC = {
  // App
  APP_GET_VERSION: 'app:getVersion',

  // Settings (verschlüsselter Store)
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',

  // KI-Router
  AI_ROUTE: 'ai:route',
  AI_LIST_MODELS: 'ai:listModels',

  // Lyrics-Pipeline
  LYRICS_GENERATE: 'lyrics:generate'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
