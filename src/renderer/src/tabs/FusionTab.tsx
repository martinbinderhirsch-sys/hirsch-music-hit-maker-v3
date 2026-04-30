import { useEffect, useMemo, useState } from 'react';
import { useSongs } from '../lib/songs-context';
import type {
  FusionData, FusionSection, FusionTemplate, SectionKind, VoiceGender
} from '../../../shared/types';

const SECTION_KINDS: SectionKind[] = [
  'intro', 'verse', 'pre-chorus', 'chorus', 'post-chorus',
  'bridge', 'solo', 'outro', 'hook', 'tag'
];

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
              'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

const VOICES: { id: VoiceGender; label: string }[] = [
  { id: 'any',    label: 'Beliebig' },
  { id: 'male',   label: 'Männlich' },
  { id: 'female', label: 'Weiblich' },
  { id: 'duet',   label: 'Duett' }
];

const TIME_SIGS = ['4/4', '3/4', '6/8', '12/8', '2/4'];

function newSectionId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptySection(): FusionSection {
  return { id: newSectionId(), kind: 'verse', bars: 8, chords: '' };
}

export function FusionTab() {
  const { activeSong, refresh, selectSong } = useSongs();
  const [templates, setTemplates] = useState<FusionTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [data, setData] = useState<FusionData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    window.hirsch.fusion.templates().then(setTemplates).catch(() => {});
  }, []);

  // Aktiven Song → Fusion-Daten übernehmen (oder leer initialisieren)
  useEffect(() => {
    if (!activeSong) { setData(null); return; }
    if (activeSong.fusion) {
      setData(activeSong.fusion);
    } else {
      setData({
        voice: 'any',
        tempoBpm: 100,
        key: 'C',
        timeSignature: '4/4',
        feel: 'Straight 8th',
        sections: [],
        arrangement: ''
      });
    }
    setError(null);
  }, [activeSong]);

  const canEdit = !!activeSong && !!data;

  async function generateAI() {
    if (!activeSong) return;
    setBusy(true);
    setError(null);
    try {
      const fusion = await window.hirsch.fusion.generate({
        songId: activeSong.id,
        templateId: templateId || undefined,
        voice: data?.voice,
        preferredKey: data?.key,
        preferredBpm: data?.tempoBpm
      });
      setData(fusion);
      await refresh();
      await selectSong(activeSong.id);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function applyTemplate(id: string) {
    setTemplateId(id);
    if (!data) return;
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setData({
      ...data,
      timeSignature: tpl.timeSignature,
      feel: tpl.feel,
      tempoBpm: tpl.defaultBpm,
      sections: tpl.sections.map(s => ({
        id: newSectionId(),
        kind: s.kind,
        label: s.label,
        bars: s.bars,
        chords: '',
        lyricsRef: s.lyricsRef,
        notes: s.notes
      }))
    });
  }

  async function save() {
    if (!activeSong || !data) return;
    setBusy(true);
    setError(null);
    try {
      await window.hirsch.fusion.save(activeSong.id, data);
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function exportTxt() {
    if (!activeSong) return;
    await window.hirsch.fusion.exportTxt(activeSong.id);
  }

  function patch(p: Partial<FusionData>) {
    if (!data) return;
    setData({ ...data, ...p });
  }

  function patchSection(idx: number, p: Partial<FusionSection>) {
    if (!data) return;
    const sections = data.sections.map((s, i) => (i === idx ? { ...s, ...p } : s));
    setData({ ...data, sections });
  }

  function moveSection(idx: number, dir: -1 | 1) {
    if (!data) return;
    const j = idx + dir;
    if (j < 0 || j >= data.sections.length) return;
    const sections = [...data.sections];
    [sections[idx], sections[j]] = [sections[j], sections[idx]];
    setData({ ...data, sections });
  }

  function addSection() {
    if (!data) return;
    setData({ ...data, sections: [...data.sections, emptySection()] });
  }

  function removeSection(idx: number) {
    if (!data) return;
    setData({ ...data, sections: data.sections.filter((_, i) => i !== idx) });
  }

  if (!activeSong) {
    return (
      <div className="fusion-tab">
        <div className="fusion-empty">
          <h2>Fusion</h2>
          <p className="hint">
            Wähle links einen Song aus oder erstelle zuerst Lyrics. Fusion baut darauf das musikalische Gerüst —
            Struktur, Akkorde, Tempo, Tonart und Stimme.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fusion-tab">
      <div className="fusion-header">
        <div>
          <h2>Fusion</h2>
          <p className="hint">{activeSong.title}</p>
        </div>
        <div className="fusion-actions">
          <select
            className="select"
            value={templateId}
            onChange={e => applyTemplate(e.target.value)}
            disabled={busy}
          >
            <option value="">Vorlage wählen…</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn-primary" onClick={generateAI} disabled={busy}>
            {busy ? 'KI denkt…' : 'KI-Vorschlag'}
          </button>
          <button className="btn-secondary" onClick={save} disabled={busy}>
            Speichern
          </button>
          <button className="btn-secondary" onClick={exportTxt} disabled={busy || data.sections.length === 0}>
            Export TXT
          </button>
          {savedFlash && <span className="saved-flash">Gespeichert ✓</span>}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="fusion-controls">
        <div className="setting-block">
          <label>Stimme</label>
          <div className="voice-toggle">
            {VOICES.map(v => (
              <button
                key={v.id}
                className={`voice-btn ${data.voice === v.id ? 'voice-btn-active' : ''}`}
                onClick={() => patch({ voice: v.id })}
                disabled={!canEdit}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-block">
          <label>Tonart</label>
          <select className="select" value={data.key} onChange={e => patch({ key: e.target.value })}>
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div className="setting-block">
          <label>Tempo (BPM)</label>
          <input
            type="number" min={40} max={220} value={data.tempoBpm}
            onChange={e => patch({ tempoBpm: Math.max(40, Math.min(220, Number(e.target.value) || 100)) })}
            className="input"
          />
        </div>

        <div className="setting-block">
          <label>Takt</label>
          <select className="select" value={data.timeSignature} onChange={e => patch({ timeSignature: e.target.value })}>
            {TIME_SIGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="setting-block setting-block-grow">
          <label>Feel / Groove</label>
          <input
            type="text" value={data.feel}
            onChange={e => patch({ feel: e.target.value })}
            className="input"
            placeholder="z.B. Shuffle, Half-time, Driving 8th"
          />
        </div>
      </div>

      <div className="fusion-section-header">
        <h3>Struktur</h3>
        <button className="btn-secondary btn-sm" onClick={addSection} disabled={!canEdit}>+ Sektion</button>
      </div>

      {data.sections.length === 0 && (
        <p className="hint">Wähle eine Vorlage oder lass die KI einen Vorschlag machen.</p>
      )}

      <div className="sections">
        {data.sections.map((s, i) => (
          <div key={s.id} className="section-card">
            <div className="section-row">
              <select
                className="select select-sm"
                value={s.kind}
                onChange={e => patchSection(i, { kind: e.target.value as SectionKind })}
              >
                {SECTION_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <input
                className="input input-sm"
                placeholder="Label (optional)"
                value={s.label ?? ''}
                onChange={e => patchSection(i, { label: e.target.value })}
              />
              <div className="bars-input">
                <span className="bars-label">Takte</span>
                <input
                  type="number" min={1} max={64}
                  className="input input-xs"
                  value={s.bars}
                  onChange={e => patchSection(i, { bars: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="section-buttons">
                <button className="icon-btn" title="hoch" onClick={() => moveSection(i, -1)}>▲</button>
                <button className="icon-btn" title="runter" onClick={() => moveSection(i, 1)}>▼</button>
                <button className="icon-btn icon-btn-danger" title="löschen" onClick={() => removeSection(i)}>✕</button>
              </div>
            </div>
            <input
              className="input chord-strip"
              placeholder={`Akkorde (z.B. ${data.key}  Am  F  G)`}
              value={s.chords}
              onChange={e => patchSection(i, { chords: e.target.value })}
            />
            <input
              className="input input-sm"
              placeholder="Notiz / Performance-Hinweis"
              value={s.notes ?? ''}
              onChange={e => patchSection(i, { notes: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="setting-block" style={{ marginTop: 20 }}>
        <label>Arrangement-Notizen</label>
        <textarea
          className="textarea"
          rows={4}
          placeholder="Instrumentation, Dynamik, Aufbau…"
          value={data.arrangement ?? ''}
          onChange={e => patch({ arrangement: e.target.value })}
        />
      </div>
    </div>
  );
}
