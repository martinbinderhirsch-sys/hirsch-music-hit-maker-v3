import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { AIRouteRequest, LyricsRequest, UpdateState } from '../shared/types';

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
  }
};

contextBridge.exposeInMainWorld('hirsch', api);

export type HirschAPI = typeof api;
