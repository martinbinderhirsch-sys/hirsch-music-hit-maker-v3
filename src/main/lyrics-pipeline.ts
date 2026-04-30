import { BrowserWindow } from 'electron';
import type { LyricsRequest, LyricsPipelineResult, LyricsProgress, ModelId } from '../shared/types';
import { aiRoute } from './ai-router';
import { settingsStore } from './settings-store';
import { findLocale } from '../shared/languages';
import { IPC } from '../shared/ipc-channels';

// 4-Stufen-Pipeline:
//  1) Song-DNA  — sprachneutraler Brief
//  2) Draft     — kreativer Entwurf in Zielsprache/Locale
//  3) Polish    — Linguistic Polish Pass
//  4) Localize  — Lokalisierung & Human Pass

function emit(p: LyricsProgress) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(IPC.LYRICS_PROGRESS, p);
  }
}

// Werft eine sprechende Exception, wenn eine Pipeline-Stufe fehlschlägt.
// Das wird im Renderer in der Fehler-Box angezeigt.
function ensureOk(stage: string, res: { ok: boolean; text: string; error?: string }) {
  if (!res.ok || !res.text.trim()) {
    const msg = `Stufe "${stage}" fehlgeschlagen: ${res.error ?? 'unbekannter Fehler'}`;
    emit({ stage: 'error', status: 'error', message: msg });
    throw new Error(msg);
  }
}

export async function generateLyrics(req: LyricsRequest): Promise<LyricsPipelineResult> {
  const start = Date.now();
  const model = (settingsStore.get('defaultModel') as ModelId) || 'google/gemini-2.5-flash';
  console.log(`[lyrics] Pipeline-Start mit Modell ${model}, Locale ${req.locale}`);

  const localeInfo = findLocale(req.locale);
  const localeLabel = localeInfo
    ? `${localeInfo.locale.label} (${localeInfo.locale.code})`
    : req.locale;
  const tier = localeInfo?.language.tier ?? 'B';

  // ── Stufe 1: Song-DNA ───────────────────────────────────────────────
  emit({ stage: 'songDna', status: 'start' });
  const dna = await aiRoute({
    model,
    system:
      'Du bist ein Songwriting-Architekt. Erzeuge eine sprachneutrale Song-DNA: ' +
      'Thema, Perspektive, Kernemotion, 5 Schlüsselbilder, Struktur (Verse/Chorus/Bridge), ' +
      'Hook-Ziel. Antworte kompakt in Stichpunkten auf Englisch (interne Arbeitssprache).',
    prompt:
      `Topic: ${req.topic}\nGenre: ${req.genre}\nMood: ${req.mood}\nStyle: ${req.style}\n` +
      `Rhyme strictness (1-10): ${req.rhymeStrictness}\n` +
      (req.syllableTarget ? `Syllable target per line: ${req.syllableTarget}\n` : '') +
      `Target locale: ${localeLabel} (cultural flavor only — do not write lyrics yet).`,
    temperature: 0.7
  });
  ensureOk('Song-DNA', dna);
  emit({ stage: 'songDna', status: 'done' });
  emit({ stage: 'draft', status: 'start' });

  // ── Stufe 2: Creative Draft in Zielsprache/Locale ───────────────────
  const draft = await aiRoute({
    model,
    system:
      `Du bist ein erstklassiger Songwriter. Schreibe Lyrics direkt in ${localeLabel}. ` +
      `Genre: ${req.genre}. Stil: ${req.style}. Reim-Strenge: ${req.rhymeStrictness}/10. ` +
      `Struktur: Verse 1 / Chorus / Verse 2 / Chorus / Bridge / Chorus. ` +
      (req.locale.startsWith('en-US')
        ? 'Verwende US-Schreibweise (color, favorite) und US-Idiomatik. '
        : '') +
      'Liefere NUR die Lyrics, klar getrennt nach Sektionen mit Labels.',
    prompt: `Song-DNA:\n${dna.text}\n\nSchreibe jetzt die Lyrics.`,
    temperature: 0.9
  });
  ensureOk('Draft', draft);
  emit({ stage: 'draft', status: 'done' });
  emit({ stage: 'polish', status: 'start' });

  // ── Stufe 3: Linguistic Polish ───────────────────────────────────────
  const polished = await aiRoute({
    model,
    system:
      `Du bist Lektor für Songtexte in ${localeLabel}. ` +
      'Verbessere Natürlichkeit, idiomatische Wendungen, Reime und Singbarkeit. ' +
      'Behalte Struktur und Bedeutung exakt bei. Gib NUR die polierte Version zurück.',
    prompt: draft.text,
    temperature: 0.5
  });
  ensureOk('Polish', polished);
  emit({ stage: 'polish', status: 'done' });
  emit({ stage: 'localize', status: 'start' });

  // ── Stufe 4: Localization / Human Pass ──────────────────────────────
  const localizationNote =
    tier === 'A'
      ? 'Feinschliff: minimale Anpassungen, vor allem Kulturreferenzen und Slang.'
      : tier === 'B'
        ? 'Mittlerer Schliff: Idiomatik und natürliche Phrasierung sicherstellen.'
        : 'Starker Schliff: Wortwahl, Rhythmus und Idiome konsequent lokalisieren.';

  const localized = await aiRoute({
    model,
    system:
      `Du bist Native-Speaker-Lektor für ${localeLabel}. ${localizationNote} ` +
      (req.locale.startsWith('en-US') && /country|blues|americana/i.test(req.genre)
        ? 'Verwende US-typische Hook-Phrasierung passend zu Nashville/Americana. '
        : '') +
      'Gib NUR die finale Version zurück.',
    prompt: polished.text,
    temperature: 0.6
  });
  ensureOk('Localize', localized);
  emit({ stage: 'localize', status: 'done' });

  console.log(`[lyrics] Pipeline OK in ${Date.now() - start}ms`);

  return {
    songDna: dna.text,
    draft: draft.text,
    polished: polished.text,
    localized: localized.text,
    meta: {
      language: req.language,
      locale: req.locale,
      model,
      durationMs: Date.now() - start
    }
  };
}
