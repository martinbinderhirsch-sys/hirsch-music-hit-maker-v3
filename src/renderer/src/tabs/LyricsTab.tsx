import { useEffect, useMemo, useState } from 'react';
import { LANGUAGES } from '../../../shared/languages';
import type { LyricsRequest, LyricsPipelineResult, LyricsProgress } from '../../../shared/types';
import { useSongs } from '../lib/songs-context';

type StageStatus = 'pending' | 'running' | 'done' | 'error';
const STAGE_LABELS: { id: 'songDna' | 'draft' | 'polish' | 'localize'; label: string }[] = [
  { id: 'songDna',  label: '1 · Song-DNA' },
  { id: 'draft',    label: '2 · Draft' },
  { id: 'polish',   label: '3 · Polish' },
  { id: 'localize', label: '4 · Localize' }
];

const GENRES = ['country', 'blues', 'americana', 'pop', 'rock', 'folk', 'hip-hop', 'r&b', 'electronic', 'metal'];
const STYLES = ['modern', 'traditional', 'radio-friendly', 'raw', 'poetic', 'storytelling'];
const MOODS  = ['uplifting', 'melancholic', 'reflective', 'romantic', 'angry', 'hopeful', 'nostalgic'];

export function LyricsTab() {
  const { activeSong, createSong, updateSong, selectSong } = useSongs();

  const [topic, setTopic] = useState('A long road home after a hard year');
  const [genre, setGenre] = useState('country');
  const [mood, setMood] = useState('reflective');
  const [style, setStyle] = useState('storytelling');
  const [language, setLanguage] = useState('en');
  const [locale, setLocale] = useState('en-US');
  const [rhyme, setRhyme] = useState(7);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LyricsPipelineResult | null>(null);
  const [activeStage, setActiveStage] = useState<'songDna' | 'draft' | 'polished' | 'localized'>('localized');
  const [stageStatus, setStageStatus] = useState<Record<string, StageStatus>>({});

  // Live-Fortschritt aus dem Main empfangen
  useEffect(() => {
    const off = window.hirsch.lyrics.onProgress(p => {
      if (p.stage === 'error') {
        setError(p.message);
        return;
      }
      setStageStatus(prev => ({ ...prev, [p.stage]: p.status === 'start' ? 'running' : 'done' }));
    });
    return off;
  }, []);

  // Wenn ein Song aus der Sidebar gewählt wurde → Eingaben + Ergebnis übernehmen.
  useEffect(() => {
    if (!activeSong) return;
    const r = activeSong.request;
    setTopic(r.topic);
    setGenre(r.genre);
    setMood(r.mood);
    setStyle(r.style);
    setLanguage(r.language);
    setLocale(r.locale);
    setRhyme(r.rhymeStrictness);
    setResult(activeSong.result);
    setActiveStage('localized');
    setError(null);
  }, [activeSong]);

  const localesForLang = useMemo(() => {
    const lang = LANGUAGES.find(l => l.code === language);
    return lang?.locales ?? [];
  }, [language]);

  function onLanguageChange(code: string) {
    setLanguage(code);
    const lang = LANGUAGES.find(l => l.code === code);
    if (lang && lang.locales.length > 0) setLocale(lang.locales[0].code);
  }

  function newSong() {
    selectSong(null);
    setResult(null);
    setError(null);
  }

  function resetStages() {
    setStageStatus({
      songDna: 'pending', draft: 'pending', polish: 'pending', localize: 'pending'
    });
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    resetStages();

    const req: LyricsRequest = {
      topic, genre, mood, style,
      language, locale,
      rhymeStrictness: rhyme
    };

    try {
      const res = await window.hirsch.lyrics.generate(req);
      setResult(res);
      setActiveStage('localized');
      // Auto-Save als neues Song-Projekt
      await createSong({ request: req, result: res });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function regenerateForActive() {
    if (!activeSong) return;
    setBusy(true);
    setError(null);
    resetStages();
    const req: LyricsRequest = {
      topic, genre, mood, style,
      language, locale,
      rhymeStrictness: rhyme
    };
    try {
      const res = await window.hirsch.lyrics.generate(req);
      setResult(res);
      setActiveStage('localized');
      await updateSong(activeSong.id, { result: res });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lyrics-tab">
      {activeSong && (
        <div className="active-song-bar">
          <div>
            <span className="muted">Bearbeite:</span> <strong>{activeSong.title}</strong>
            <span className="muted"> · gespeichert {new Date(activeSong.updatedAt).toLocaleString()}</span>
          </div>
          <button className="btn-secondary tiny" onClick={newSong}>Neuer Song</button>
        </div>
      )}

      <section className="form-grid">
        <div className="field field-wide">
          <label>Thema / Topic</label>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={2} />
        </div>

        <div className="field">
          <label>Genre</label>
          <select value={genre} onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Mood</label>
          <select value={mood} onChange={e => setMood(e.target.value)}>
            {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Stil</label>
          <select value={style} onChange={e => setStyle(e.target.value)}>
            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Sprache</label>
          <select value={language} onChange={e => onLanguageChange(e.target.value)}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name}) — Tier {l.tier}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Locale / Variante</label>
          <select value={locale} onChange={e => setLocale(e.target.value)}>
            {localesForLang.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Reim-Strenge: {rhyme}/10</label>
          <input type="range" min={1} max={10} value={rhyme}
            onChange={e => setRhyme(Number(e.target.value))} />
        </div>
      </section>

      <div className="actions">
        {activeSong ? (
          <>
            <button className="btn-primary" onClick={regenerateForActive} disabled={busy}>
              {busy ? 'Generiere…' : 'Neu generieren (überschreibt diesen Song)'}
            </button>
            <button className="btn-secondary" onClick={generate} disabled={busy}>
              Als neuen Song generieren
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={generate} disabled={busy}>
            {busy ? 'Generiere…' : 'Lyrics generieren (4-Stufen-Pipeline)'}
          </button>
        )}
      </div>

      {(busy || error) && (
        <div className="pipeline-progress">
          {STAGE_LABELS.map(s => {
            const st = stageStatus[s.id] ?? 'pending';
            return (
              <div key={s.id} className={`pipeline-step pipeline-step-${st}`}>
                <span className="pipeline-dot" />
                <span className="pipeline-label">{s.label}</span>
                <span className="pipeline-status">
                  {st === 'running' && '…'}
                  {st === 'done' && '✓'}
                  {st === 'error' && '✗'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="alert-error">Fehler: {error}</div>}

      {result && (
        <section className="result">
          <div className="stage-tabs">
            {(['songDna', 'draft', 'polished', 'localized'] as const).map(s => (
              <button
                key={s}
                className={`stage-tab ${activeStage === s ? 'active' : ''}`}
                onClick={() => setActiveStage(s)}
              >
                {s === 'songDna'   && '1 · Song-DNA'}
                {s === 'draft'     && '2 · Draft'}
                {s === 'polished'  && '3 · Polish'}
                {s === 'localized' && '4 · Final'}
              </button>
            ))}
          </div>
          <pre className="lyrics-output">{result[activeStage]}</pre>
          <div className="meta">
            Modell: <code>{result.meta.model}</code> ·
            Locale: <code>{result.meta.locale}</code> ·
            Dauer: {(result.meta.durationMs / 1000).toFixed(1)}s
          </div>
        </section>
      )}
    </div>
  );
}
