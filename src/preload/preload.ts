import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type {
  AIRouteRequest,
  LyricsRequest,
  LyricsPipelineResult,
  UpdateState,
  SongProject,
  SongListEntry,
  FusionData,
  FusionGenerateRequest,
  FusionTemplate
} from '../shared/types';

// Schmale, klar definierte Bridge — der Renderer hat KEINEN direkten Node-Zugriff.

const api = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_VERSION)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
    getAll: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL)
  },
  ai: {
    listModels: () => ipcRenderer.invoke(IPC.AI_LIST_MODELS),
    route: (req: AIRouteRequest) => ipcRenderer.invoke(IPC.AI_ROUTE, req)
  },
  lyrics: {
    generate: (req: LyricsRequest) => ipcRenderer.invoke(IPC.LYRICS_GENERATE, req)
  },
  updates: {
    check:    () => ipcRenderer.invoke(IPC.UPDATE_CHECK)    as Promise<UpdateState>,
    download: () => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD) as Promise<UpdateState>,
    install:  () => ipcRenderer.invoke(IPC.UPDATE_INSTALL)  as Promise<boolean>,
    onStatus: (cb: (state: UpdateState) => void) => {
      const listener = (_e: unknown, state: UpdateState) => cb(state);
      ipcRenderer.on(IPC.UPDATE_STATUS, listener);
      return () => ipcRenderer.removeListener(IPC.UPDATE_STATUS, listener);
    }
  },
  songs: {
    list:      () => ipcRenderer.invoke(IPC.SONGS_LIST) as Promise<SongListEntry[]>,
    get:       (id: string) => ipcRenderer.invoke(IPC.SONGS_GET, id) as Promise<SongProject | null>,
    create:    (args: { request: LyricsRequest; result: LyricsPipelineResult; title?: string }) =>
                  ipcRenderer.invoke(IPC.SONGS_CREATE, args) as Promise<SongProject>,
    update:    (id: string, patch: Partial<SongProject>) =>
                  ipcRenderer.invoke(IPC.SONGS_UPDATE, id, patch) as Promise<SongProject | null>,
    delete:    (id: string) => ipcRenderer.invoke(IPC.SONGS_DELETE, id) as Promise<boolean>,
    duplicate: (id: string) => ipcRenderer.invoke(IPC.SONGS_DUPLICATE, id) as Promise<SongProject | null>,
    exportTxt: (id: string) => ipcRenderer.invoke(IPC.SONGS_EXPORT_TXT, id) as Promise<{ ok: boolean; path?: string; error?: string }>,
    exportBackup: () => ipcRenderer.invoke(IPC.SONGS_EXPORT_BACKUP) as Promise<{ ok: boolean; path?: string; count?: number; error?: string }>,
    importBackup: () => ipcRenderer.invoke(IPC.SONGS_IMPORT_BACKUP) as Promise<{ ok: boolean; imported?: number; error?: string }>
  },
  fusion: {
    templates: () => ipcRenderer.invoke(IPC.FUSION_TEMPLATES) as Promise<FusionTemplate[]>,
    generate:  (req: FusionGenerateRequest) => ipcRenderer.invoke(IPC.FUSION_GENERATE, req) as Promise<FusionData>,
    save:      (id: string, fusion: FusionData) => ipcRenderer.invoke(IPC.FUSION_SAVE, id, fusion) as Promise<SongProject | null>,
    exportTxt: (id: string) => ipcRenderer.invoke(IPC.FUSION_EXPORT_TXT, id) as Promise<{ ok: boolean; path?: string; error?: string }>
  }
};

contextBridge.exposeInMainWorld('hirsch', api);

export type HirschAPI = typeof api;
