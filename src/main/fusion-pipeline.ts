import crypto from 'node:crypto';
import type {
  FusionData, FusionGenerateRequest, FusionSection, FusionTemplate,
  ModelId, SongProject, VoiceGender
} from '../shared/types';
import { aiRoute } from './ai-router';
import { settingsStore } from './settings-store';
import { FUSION_TEMPLATES, pickTemplateForGenre } from './fusion-templates';

// Diatonische Standard-Akkordfolgen pro Section-Kind (in Tonart C / Am).
// Werden später nach Tonart transponiert. Reine Heuristik als Fallback.
const DIATONIC_PROGRESSIONS: Record<string, { major: string[]; minor: string[] }> = {
  intro:        { major: ['I', 'V', 'vi', 'IV'],     minor: ['i', 'VII', 'VI', 'V']   },
  verse:        { major: ['I', 'V', 'vi', 'IV'],     minor: ['i', 'VII', 'VI', 'V']   },
  'pre-chorus': { major: ['IV', 'V', 'vi', 'V'],     minor: ['VI', 'VII', 'i', 'V']   },
  chorus:       { major: ['vi', 'IV', 'I', 'V'],     minor: ['i', 'VI', 'III', 'VII'] },
  'post-chorus':{ major: ['I', 'V', 'vi', 'IV'],     minor: ['i', 'VII', 'VI', 'V']   },
  bridge:       { major: ['vi', 'V', 'IV', 'I'],     minor: ['VI', 'V', 'iv', 'i']    },
  solo:         { major: ['I', 'IV', 'V', 'I'],      minor: ['i', 'iv', 'V', 'i']     },
  outro:        { major: ['I', 'V', 'I'],            minor: ['i', 'V', 'i']           },
  hook:         { major: ['I', 'V', 'vi', 'IV'],     minor: ['i', 'VII', 'VI', 'V']   },
  tag:          { major: ['I', 'IV', 'I'],           minor: ['i', 'iv', 'i']          }
};

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function parseKey(key: string): { tonic: string; minor: boolean; rootIndex: number } {
  const trimmed = key.trim();
  const minor = /m$/i.test(trimmed) && !/maj/i.test(trimmed);
  const tonic = trimmed.replace(/m$/i, '').replace(/aj/i, '');
  // Normalisieren: Bb → A#, Eb → D#
  const flats: Record<string, string> = { Bb: 'A#', Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#' };
  const norm = flats[tonic] ?? tonic;
  const idx = NOTES_SHARP.indexOf(norm);
  return { tonic: norm, minor, rootIndex: idx >= 0 ? idx : 0 };
}

function romanToChord(roman: string, root: number, isMinorKey: boolean): string {
  // Sehr kompakte Map: Stufenzahl + Qualität
  const map: Record<string, { offset: number; quality: '' | 'm' | 'dim' | 'maj' }> = isMinorKey
    ? {
        i:  { offset: 0,  quality: 'm'  },
        ii: { offset: 2,  quality: 'dim'},
        III:{ offset: 3,  quality: ''   },
        iv: { offset: 5,  quality: 'm'  },
        v:  { offset: 7,  quality: 'm'  },
        V:  { offset: 7,  quality: ''   },
        VI: { offset: 8,  quality: ''   },
        VII:{ offset: 10, quality: ''   }
      }
    : {
        I:  { offset: 0,  quality: ''  },
        ii: { offset: 2,  quality: 'm' },
        iii:{ offset: 4,  quality: 'm' },
        IV: { offset: 5,  quality: ''  },
        V:  { offset: 7,  quality: ''  },
        vi: { offset: 9,  quality: 'm' },
        vii:{ offset: 11, quality: 'dim'}
      };
  const entry = map[roman] ?? map[roman.toUpperCase()] ?? map[roman.toLowerCase()];
  if (!entry) return roman;
  const note = NOTES_SHARP[(root + entry.offset + 12) % 12];
  return `${note}${entry.quality}`;
}

function progressionForKind(kind: string, key: string): string {
  const { rootIndex, minor } = parseKey(key);
  const tpl = DIATONIC_PROGRESSIONS[kind] ?? DIATONIC_PROGRESSIONS.verse;
  const romans = minor ? tpl.minor : tpl.major;
  return romans.map(r => romanToChord(r, rootIndex, minor)).join('  ');
}

function mkId(): string {
  return crypto.randomBytes(4).toString('hex');
}

function suggestKey(genre: string, mood: string): string {
  const g = genre.toLowerCase();
  const m = mood.toLowerCase();
  const sad = /melan|sad|trauer|wehmut|dunkel/.test(m);
  if (/blues/.test(g)) return sad ? 'Em' : 'A';
  if (/country|americana|folk/.test(g)) return sad ? 'Am' : 'G';
  if (/rock/.test(g)) return sad ? 'Em' : 'E';
  if (/pop/.test(g)) return sad ? 'Am' : 'C';
  return sad ? 'Am' : 'C';
}

function suggestVoice(req: SongProject['request']): VoiceGender {
  // Kein Hinweis aus den Eingaben → 'any', User stellt um.
  return 'any';
}

export function buildFusionFromTemplate(
  template: FusionTemplate,
  key: string,
  bpm: number,
  voice: VoiceGender
): FusionData {
  const sections: FusionSection[] = template.sections.map(s => ({
    id: mkId(),
    kind: s.kind,
    label: s.label,
    bars: s.bars,
    chords: progressionForKind(s.kind, key),
    lyricsRef: s.lyricsRef,
    notes: s.notes
  }));
  return {
    voice,
    tempoBpm: bpm,
    key,
    timeSignature: template.timeSignature,
    feel: template.feel,
    sections,
    arrangement: '',
    updatedAt: new Date().toISOString()
  };
}

// === KI-gestützte Verfeinerung ===
// Nimmt Heuristik als Basis und lässt das Modell Akkorde feinjustieren + Arrangement schreiben.
export async function refineFusionWithAI(
  song: SongProject,
  base: FusionData,
  req: FusionGenerateRequest
): Promise<FusionData> {
  const model: ModelId = req.model ?? (settingsStore.get('defaultModel') as ModelId) ?? 'openai/gpt-4o';

  const sectionLines = base.sections
    .map((s, i) => `${i + 1}. ${s.kind}${s.label ? ` (${s.label})` : ''} — ${s.bars} Takte — Akkorde: ${s.chords}${s.lyricsRef ? ` [Lyrics: ${s.lyricsRef}]` : ''}`)
    .join('\n');

  const prompt =
    `Song-Titel: ${song.title}\n` +
    `Genre: ${song.request.genre}  ·  Mood: ${song.request.mood}  ·  Stil: ${song.request.style}\n` +
    `Tonart: ${base.key}  ·  Tempo: ${base.tempoBpm} BPM  ·  Takt: ${base.timeSignature}  ·  Feel: ${base.feel}\n` +
    `Stimme: ${base.voice}\n\n` +
    `Aktuelle Struktur:\n${sectionLines}\n\n` +
    `Lyrics (final):\n${song.result.localized.slice(0, 2000)}\n\n` +
    `Aufgabe:\n` +
    `1) Verbessere die Akkordfolgen pro Sektion (Genre-typisch, singbar). Behalte die Tonart ${base.key}.\n` +
    `2) Schreibe einen kompakten Arrangement-Vorschlag (max. 6 Sätze): Instrumentation, Dynamik, Aufbau.\n\n` +
    `Antworte als striktes JSON ohne Markdown:\n` +
    `{\n` +
    `  "sections": [{"index": 1, "chords": "C  G  Am  F"}, ...],\n` +
    `  "arrangement": "..."\n` +
    `}`;

  const response = await aiRoute({
    model,
    system:
      'Du bist Produzent und Arrangeur. Antworte AUSSCHLIESSLICH mit gültigem JSON. ' +
      'Keine Erklärungen, kein Markdown.',
    prompt,
    temperature: 0.5,
    maxTokens: 1200
  });

  if (!response.ok) {
    return base; // Fallback: Heuristik-Version reicht
  }

  try {
    const cleaned = response.text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      sections?: { index: number; chords: string }[];
      arrangement?: string;
    };
    const refined: FusionData = {
      ...base,
      arrangement: parsed.arrangement ?? base.arrangement,
      sections: base.sections.map((s, i) => {
        const match = parsed.sections?.find(p => p.index === i + 1);
        return match && match.chords ? { ...s, chords: match.chords } : s;
      }),
      updatedAt: new Date().toISOString()
    };
    return refined;
  } catch (err) {
    console.warn('[fusion] KI-Antwort konnte nicht geparst werden:', err);
    return base;
  }
}

export async function generateFusion(
  song: SongProject,
  req: FusionGenerateRequest
): Promise<FusionData> {
  const template = req.templateId
    ? FUSION_TEMPLATES.find(t => t.id === req.templateId) ?? pickTemplateForGenre(song.request.genre)
    : pickTemplateForGenre(song.request.genre);

  const key = req.preferredKey ?? suggestKey(song.request.genre, song.request.mood);
  const bpm = req.preferredBpm ?? template.defaultBpm;
  const voice = req.voice ?? suggestVoice(song.request);

  const base = buildFusionFromTemplate(template, key, bpm, voice);
  return refineFusionWithAI(song, base, req);
}

export function listTemplates(): FusionTemplate[] {
  return FUSION_TEMPLATES;
}
