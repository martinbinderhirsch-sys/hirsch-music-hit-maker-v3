// Zentrale IPC-Kanal-Konstanten — werden von Main, Preload und Renderer importiert.
// Ein Kanal = ein Vertrag. Niemals Strings irgendwo hartcodieren.

export const IPC = {
  // App
  APP_GET_VERSION: 'app:getVersion',

  // Settings (verschlüsselter Store)
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_DIAGNOSE_KEY: 'settings:diagnoseKey',
  SETTINGS_CLEAR_KEY: 'settings:clearKey',
  SETTINGS_TEST_KEY: 'settings:testKey',

  // KI-Router
  AI_ROUTE: 'ai:route',
  AI_LIST_MODELS: 'ai:listModels',

  // Lyrics-Pipeline
  LYRICS_GENERATE: 'lyrics:generate',
  LYRICS_PROGRESS: 'lyrics:progress',  // Event vom Main → Renderer (Stufen-Status)

  // Auto-Updater
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_STATUS: 'update:status',  // Event vom Main → Renderer

  // Songs (Persistenz)
  SONGS_LIST: 'songs:list',
  SONGS_GET: 'songs:get',
  SONGS_CREATE: 'songs:create',
  SONGS_UPDATE: 'songs:update',
  SONGS_DELETE: 'songs:delete',
  SONGS_DUPLICATE: 'songs:duplicate',
  SONGS_EXPORT_TXT: 'songs:exportTxt',
  SONGS_EXPORT_BACKUP: 'songs:exportBackup',
  SONGS_IMPORT_BACKUP: 'songs:importBackup',

  // Fusion (T06)
  FUSION_TEMPLATES: 'fusion:templates',
  FUSION_GENERATE:  'fusion:generate',
  FUSION_SAVE:      'fusion:save',
  FUSION_EXPORT_TXT:'fusion:exportTxt'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
