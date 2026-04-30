import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { SongListEntry, SongProject, LyricsRequest, LyricsPipelineResult } from '../../../shared/types';

interface SongsContextValue {
  list: SongListEntry[];
  activeId: string | null;
  activeSong: SongProject | null;
  refresh: () => Promise<void>;
  selectSong: (id: string | null) => Promise<void>;
  createSong: (args: { request: LyricsRequest; result: LyricsPipelineResult; title?: string }) => Promise<SongProject>;
  updateSong: (id: string, patch: Partial<SongProject>) => Promise<SongProject | null>;
  deleteSong: (id: string) => Promise<void>;
  duplicateSong: (id: string) => Promise<void>;
  exportTxt: (id: string) => Promise<void>;
  exportBackup: () => Promise<{ count?: number; ok: boolean; error?: string }>;
  importBackup: () => Promise<{ imported?: number; ok: boolean; error?: string }>;
}

const SongsContext = createContext<SongsContextValue | null>(null);

export function SongsProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<SongListEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<SongProject | null>(null);

  const refresh = useCallback(async () => {
    const next = await window.hirsch.songs.list();
    setList(next);
  }, []);

  const selectSong = useCallback(async (id: string | null) => {
    setActiveId(id);
    if (!id) { setActiveSong(null); return; }
    const song = await window.hirsch.songs.get(id);
    setActiveSong(song);
  }, []);

  const createSong: SongsContextValue['createSong'] = useCallback(async (args) => {
    const song = await window.hirsch.songs.create(args);
    await refresh();
    setActiveId(song.id);
    setActiveSong(song);
    return song;
  }, [refresh]);

  const updateSong: SongsContextValue['updateSong'] = useCallback(async (id, patch) => {
    const updated = await window.hirsch.songs.update(id, patch);
    await refresh();
    if (updated && activeId === id) setActiveSong(updated);
    return updated;
  }, [refresh, activeId]);

  const deleteSong: SongsContextValue['deleteSong'] = useCallback(async (id) => {
    await window.hirsch.songs.delete(id);
    if (activeId === id) { setActiveId(null); setActiveSong(null); }
    await refresh();
  }, [refresh, activeId]);

  const duplicateSong: SongsContextValue['duplicateSong'] = useCallback(async (id) => {
    const copy = await window.hirsch.songs.duplicate(id);
    await refresh();
    if (copy) { setActiveId(copy.id); setActiveSong(copy); }
  }, [refresh]);

  const exportTxt: SongsContextValue['exportTxt'] = useCallback(async (id) => {
    await window.hirsch.songs.exportTxt(id);
  }, []);

  const exportBackup: SongsContextValue['exportBackup'] = useCallback(async () => {
    return window.hirsch.songs.exportBackup();
  }, []);

  const importBackup: SongsContextValue['importBackup'] = useCallback(async () => {
    const res = await window.hirsch.songs.importBackup();
    if (res.ok) await refresh();
    return res;
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SongsContext.Provider value={{
      list, activeId, activeSong,
      refresh, selectSong,
      createSong, updateSong, deleteSong, duplicateSong,
      exportTxt, exportBackup, importBackup
    }}>
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs(): SongsContextValue {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs muss innerhalb von SongsProvider verwendet werden');
  return ctx;
}
