import { app, dialog, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { SongProject, SongListEntry, LyricsRequest, LyricsPipelineResult, FusionData } from '../shared/types';

// Speicherort: <userData>/songs.json + <userData>/songs/<id>.json (Einzeldateien für Robustheit).
// Die Liste (songs.json) ist der Index, die Einzeldateien enthalten die vollen Inhalte.

function songsDir(): string {
  const dir = path.join(app.getPath('userData'), 'songs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function indexPath(): string {
  return path.join(app.getPath('userData'), 'songs.json');
}

function readIndex(): SongListEntry[] {
  try {
    if (!fs.existsSync(indexPath())) return [];
    const raw = fs.readFileSync(indexPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[songs] Index konnte nicht gelesen werden:', err);
    return [];
  }
}

function writeIndex(entries: SongListEntry[]): void {
  fs.writeFileSync(indexPath(), JSON.stringify(entries, null, 2), 'utf8');
}

function songFilePath(id: string): string {
  // Pfadtraversierung absichern — id darf nur safe-zeichen enthalten.
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Ungültige Song-ID: ${id}`);
  return path.join(songsDir(), `${id}.json`);
}

function generateId(): string {
  // Sortierbare ID: Timestamp-Präfix + 8 Hex-Zeichen.
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(4).toString('hex');
  return `${ts}-${rnd}`;
}

// Titel-Vorschlag aus Song-DNA extrahieren — Heuristik, simpel.
function suggestTitle(req: LyricsRequest, result: LyricsPipelineResult): string {
  // 1) Aus den Lyrics: erste Chorus-Zeile
  const chorusMatch = result.localized.match(/(?:^|\n)\s*(?:Chorus|Refrain|Hook)[:\s]*\n([^\n]+)/i);
  if (chorusMatch && chorusMatch[1]) {
    return chorusMatch[1].trim().replace(/[.?!]+$/, '').slice(0, 60);
  }
  // 2) Erste nicht-leere, nicht-Label Zeile
  const lines = result.localized.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines.find(l => !/^(Verse|Chorus|Bridge|Refrain|Hook|Pre-Chorus|Outro|Intro)/i.test(l));
  if (firstLine) return firstLine.replace(/[.?!]+$/, '').slice(0, 60);
  // 3) Fallback: Topic
  return req.topic.slice(0, 60) || 'Untitled Song';
}

function toListEntry(song: SongProject): SongListEntry {
  return {
    id: song.id,
    title: song.title,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
    genre: song.request.genre,
    locale: song.request.locale,
    favorite: !!song.favorite,
    hasFusion: !!song.fusion && song.fusion.sections.length > 0
  };
}

// === Public API ===

export const songsStore = {
  list(): SongListEntry[] {
    return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): SongProject | null {
    try {
      const file = songFilePath(id);
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf8')) as SongProject;
    } catch (err) {
      console.warn('[songs] Lesen fehlgeschlagen:', id, err);
      return null;
    }
  },

  create(args: { request: LyricsRequest; result: LyricsPipelineResult; title?: string }): SongProject {
    const now = new Date().toISOString();
    const song: SongProject = {
      id: generateId(),
      title: args.title?.trim() || suggestTitle(args.request, args.result),
      createdAt: now,
      updatedAt: now,
      request: args.request,
      result: args.result,
      favorite: false
    };
    fs.writeFileSync(songFilePath(song.id), JSON.stringify(song, null, 2), 'utf8');
    const index = readIndex();
    index.unshift(toListEntry(song));
    writeIndex(index);
    return song;
  },

  saveFusion(id: string, fusion: FusionData): SongProject | null {
    const existing = songsStore.get(id);
    if (!existing) return null;
    const updated: SongProject = {
      ...existing,
      fusion: { ...fusion, updatedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(songFilePath(id), JSON.stringify(updated, null, 2), 'utf8');
    const index = readIndex().map(e => e.id === id ? toListEntry(updated) : e);
    writeIndex(index);
    return updated;
  },

  async exportFusionTxt(id: string, win: BrowserWindow | null): Promise<{ ok: boolean; path?: string; error?: string }> {
    const song = songsStore.get(id);
    if (!song) return { ok: false, error: 'Song nicht gefunden' };
    if (!song.fusion) return { ok: false, error: 'Kein Fusion-Layout vorhanden' };

    const safeName = song.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || song.id;
    const result = await dialog.showSaveDialog(win ?? undefined as unknown as BrowserWindow, {
      title: 'Fusion (Lead-Sheet) als TXT speichern',
      defaultPath: `${safeName} — Fusion.txt`,
      filters: [{ name: 'Text', extensions: ['txt'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, error: 'Abgebrochen' };

    const f = song.fusion;
    const lines: string[] = [
      song.title,
      '='.repeat(song.title.length),
      '',
      `Tonart: ${f.key}   Tempo: ${f.tempoBpm} BPM   Takt: ${f.timeSignature}   Feel: ${f.feel}`,
      `Stimme: ${f.voice}   Genre: ${song.request.genre}`,
      '',
      '── ARRANGEMENT ──',
      f.arrangement || '(keine Notizen)',
      '',
      '── STRUKTUR ──',
      ''
    ];
    for (const s of f.sections) {
      const head = `[ ${s.label || s.kind.toUpperCase()} · ${s.bars} Takte${s.lyricsRef ? ` · Lyrics: ${s.lyricsRef}` : ''} ]`;
      lines.push(head);
      lines.push(`  ${s.chords}`);
      if (s.notes) lines.push(`  Note: ${s.notes}`);
      lines.push('');
    }
    fs.writeFileSync(result.filePath, lines.join('\n'), 'utf8');
    return { ok: true, path: result.filePath };
  },

  update(id: string, patch: Partial<Pick<SongProject, 'title' | 'notes' | 'favorite' | 'result' | 'fusion'>>): SongProject | null {
    const existing = songsStore.get(id);
    if (!existing) return null;
    const updated: SongProject = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(songFilePath(id), JSON.stringify(updated, null, 2), 'utf8');
    const index = readIndex().map(e => e.id === id ? toListEntry(updated) : e);
    writeIndex(index);
    return updated;
  },

  delete(id: string): boolean {
    try {
      const file = songFilePath(id);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      const index = readIndex().filter(e => e.id !== id);
      writeIndex(index);
      return true;
    } catch (err) {
      console.warn('[songs] Löschen fehlgeschlagen:', id, err);
      return false;
    }
  },

  duplicate(id: string): SongProject | null {
    const original = songsStore.get(id);
    if (!original) return null;
    return songsStore.create({
      request: original.request,
      result: original.result,
      title: `${original.title} (Kopie)`
    });
  },

  async exportTxt(id: string, win: BrowserWindow | null): Promise<{ ok: boolean; path?: string; error?: string }> {
    const song = songsStore.get(id);
    if (!song) return { ok: false, error: 'Song nicht gefunden' };

    const safeName = song.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || song.id;
    const result = await dialog.showSaveDialog(win ?? undefined as unknown as BrowserWindow, {
      title: 'Song als TXT speichern',
      defaultPath: `${safeName}.txt`,
      filters: [{ name: 'Text', extensions: ['txt'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, error: 'Abgebrochen' };

    const fusionBlock = song.fusion ? [
      '',
      '--- FUSION (Architektur) ---',
      '',
      `Tonart: ${song.fusion.key}  ·  Tempo: ${song.fusion.tempoBpm} BPM  ·  Takt: ${song.fusion.timeSignature}  ·  Feel: ${song.fusion.feel}`,
      `Stimme: ${song.fusion.voice}`,
      song.fusion.arrangement ? `Arrangement: ${song.fusion.arrangement}` : '',
      '',
      ...song.fusion.sections.map(s =>
        `[${(s.label || s.kind).toUpperCase()} · ${s.bars} Takte] ${s.chords}${s.notes ? ` (${s.notes})` : ''}`
      )
    ].filter(Boolean) : [];

    const txt = [
      song.title,
      '='.repeat(song.title.length),
      '',
      `Genre: ${song.request.genre}  ·  Mood: ${song.request.mood}  ·  Stil: ${song.request.style}`,
      `Sprache: ${song.request.locale}  ·  Modell: ${song.result.meta.model}`,
      `Erstellt: ${new Date(song.createdAt).toLocaleString()}`,
      '',
      '--- LYRICS (Final) ---',
      '',
      song.result.localized,
      ...fusionBlock,
      '',
      '--- POLISHED ---',
      '',
      song.result.polished,
      '',
      '--- DRAFT ---',
      '',
      song.result.draft,
      '',
      '--- SONG-DNA ---',
      '',
      song.result.songDna
    ].join('\n');

    fs.writeFileSync(result.filePath, txt, 'utf8');
    return { ok: true, path: result.filePath };
  },

  async exportBackup(win: BrowserWindow | null): Promise<{ ok: boolean; path?: string; count?: number; error?: string }> {
    const all = songsStore.list().map(e => songsStore.get(e.id)).filter(Boolean) as SongProject[];
    const result = await dialog.showSaveDialog(win ?? undefined as unknown as BrowserWindow, {
      title: 'Backup aller Songs',
      defaultPath: `hirsch-songs-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, error: 'Abgebrochen' };
    fs.writeFileSync(result.filePath, JSON.stringify({ version: 1, songs: all }, null, 2), 'utf8');
    return { ok: true, path: result.filePath, count: all.length };
  },

  async importBackup(win: BrowserWindow | null): Promise<{ ok: boolean; imported?: number; error?: string }> {
    const result = await dialog.showOpenDialog(win ?? undefined as unknown as BrowserWindow, {
      title: 'Backup importieren',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return { ok: false, error: 'Abgebrochen' };
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf8');
      const parsed = JSON.parse(raw) as { version: number; songs: SongProject[] };
      if (!Array.isArray(parsed.songs)) throw new Error('Ungültiges Backup-Format');
      let imported = 0;
      for (const s of parsed.songs) {
        // neue ID, damit Konflikte vermieden werden
        const fresh = songsStore.create({
          request: s.request,
          result: s.result,
          title: s.title
        });
        if (fresh) imported++;
      }
      return { ok: true, imported };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
};
