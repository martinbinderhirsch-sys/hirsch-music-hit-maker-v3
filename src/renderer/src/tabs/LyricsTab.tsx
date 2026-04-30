import { useMemo, useState } from 'react';
import { LANGUAGES } from '../../../shared/languages';
import type { LyricsRequest, LyricsPipelineResult } from '../../../shared/types';

const GENRES = ['country', 'blues', 'americana', 'pop', 'rock', 'folk', 'hip-hop', 'r&b', 'electronic', 'metal'];
const STYLES = ['modern', 'traditional', 'radio-friendly', 'raw', 'poetic', 'storytelling'];
const MOODS  = ['uplifting', 'melancholic', 'reflective', 'romantic', 'angry', 'hopeful', 'nostalgic'];

export function LyricsTab() {
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

  const localesForLang = useMemo(() => {
    const lang = LANGUAGES.find(l => l.code === language);
    return lang?.locales ?? [];
  }, [language]);

  function onLanguageChange(code: string) {
    setLanguage(code);
    const lang = LANGUAGES.find(l => l.code === code);
    if (lang && lang.locales.length > 0) setLocale(lang.locales[0].code);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);

    const req: LyricsRequest = {
      topic, genre, mood, style,
      language, locale,
      rhymeStrictness: rhyme
    };

    try {
      const res = await window.hirsch.lyrics.generate(req);
      setResult(res);
      setActiveStage('localized');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lyrics-tab">
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
        <button className="btn-primary" onClick={generate} disabled={busy}>
          {busy ? 'Generiere…' : 'Lyrics generieren (4-Stufen-Pipeline)'}
        </button>
      </div>

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
