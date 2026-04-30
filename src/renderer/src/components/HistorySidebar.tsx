import { useMemo, useState } from 'react';
import { useSongs } from '../lib/songs-context';

export function HistorySidebar({ onPick }: { onPick?: () => void }) {
  const {
    list, activeId, selectSong,
    deleteSong, duplicateSong, updateSong, exportTxt,
    exportBackup, importBackup, refresh
  } = useSongs();
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.locale.toLowerCase().includes(q)
    );
  }, [list, query]);

  function startRename(id: string, currentTitle: string) {
    setRenamingId(id);
    setDraftTitle(currentTitle);
  }

  async function commitRename() {
    if (renamingId) {
      await updateSong(renamingId, { title: draftTitle.trim() || 'Untitled' });
    }
    setRenamingId(null);
  }

  async function handleDelete(id: string, title: string) {
    if (confirm(`Song „${title}" wirklich löschen?`)) {
      await deleteSong(id);
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    await updateSong(id, { favorite: !current });
  }

  async function handleExportBackup() {
    const res = await exportBackup();
    if (res.ok) alert(`Backup erstellt — ${res.count} Songs gesichert.`);
    else if (res.error && res.error !== 'Abgebrochen') alert(`Fehler: ${res.error}`);
  }

  async function handleImportBackup() {
    const res = await importBackup();
    if (res.ok) alert(`${res.imported} Songs importiert.`);
    else if (res.error && res.error !== 'Abgebrochen') alert(`Fehler: ${res.error}`);
  }

  return (
    <aside className="history-sidebar">
      <div className="sidebar-head">
        <input
          type="text"
          placeholder="Suchen…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="sidebar-search"
        />
        <button className="icon-btn" title="Neu laden" onClick={() => refresh()}>↻</button>
      </div>

      <div className="sidebar-list">
        {filtered.length === 0 && (
          <div className="sidebar-empty">
            {list.length === 0
              ? 'Noch keine Songs. Generiere im Lyrics-Tab deinen ersten Song.'
              : 'Keine Treffer.'}
          </div>
        )}
        {filtered.map(song => {
          const isActive = song.id === activeId;
          const isRenaming = song.id === renamingId;
          return (
            <div
              key={song.id}
              className={`song-item ${isActive ? 'active' : ''}`}
              onClick={() => { if (!isRenaming) { selectSong(song.id); onPick?.(); } }}
            >
              <div className="song-item-main">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={e => setDraftTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="rename-input"
                  />
                ) : (
                  <>
                    <div className="song-title">
                      {song.favorite && <span className="fav">★ </span>}
                      {song.title}
                    </div>
                    <div className="song-meta">
                      {song.genre} · {song.locale} · {new Date(song.updatedAt).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              <div className="song-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="icon-btn"
                  title={song.favorite ? 'Favorit entfernen' : 'Favorit'}
                  onClick={() => toggleFavorite(song.id, song.favorite)}
                >★</button>
                <button className="icon-btn" title="Umbenennen" onClick={() => startRename(song.id, song.title)}>✎</button>
                <button className="icon-btn" title="Duplizieren" onClick={() => duplicateSong(song.id)}>⧉</button>
                <button className="icon-btn" title="Als TXT exportieren" onClick={() => exportTxt(song.id)}>↓</button>
                <button className="icon-btn icon-danger" title="Löschen" onClick={() => handleDelete(song.id, song.title)}>×</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-foot">
        <button className="btn-secondary tiny" onClick={handleExportBackup}>Backup</button>
        <button className="btn-secondary tiny" onClick={handleImportBackup}>Import</button>
      </div>
    </aside>
  );
}
