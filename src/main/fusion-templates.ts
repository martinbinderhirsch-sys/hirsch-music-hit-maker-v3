import type { FusionTemplate } from '../shared/types';

// Erprobte Song-Architekturen — als Startpunkt, frei editierbar im UI.
// Akkorde werden bewusst leer gelassen; die KI/Heuristik füllt sie auf Basis der Tonart.

export const FUSION_TEMPLATES: FusionTemplate[] = [
  {
    id: 'pop-classic',
    name: 'Pop Klassisch (V-C-V-C-B-C)',
    genres: ['pop', 'rock', 'indie'],
    feel: 'Straight 8th',
    timeSignature: '4/4',
    defaultBpm: 110,
    sections: [
      { kind: 'intro',     bars: 4 },
      { kind: 'verse',     bars: 8, lyricsRef: 'verse1' },
      { kind: 'pre-chorus',bars: 4 },
      { kind: 'chorus',    bars: 8, lyricsRef: 'chorus' },
      { kind: 'verse',     bars: 8, lyricsRef: 'verse2' },
      { kind: 'pre-chorus',bars: 4 },
      { kind: 'chorus',    bars: 8, lyricsRef: 'chorus' },
      { kind: 'bridge',    bars: 8, lyricsRef: 'bridge' },
      { kind: 'chorus',    bars: 8, lyricsRef: 'chorus' },
      { kind: 'outro',     bars: 4 }
    ]
  },
  {
    id: 'country-ballade',
    name: 'Country Ballade (V-V-C-V-C)',
    genres: ['country', 'americana', 'folk'],
    feel: 'Half-time Shuffle',
    timeSignature: '4/4',
    defaultBpm: 78,
    sections: [
      { kind: 'intro',  bars: 4 },
      { kind: 'verse',  bars: 8, lyricsRef: 'verse1' },
      { kind: 'verse',  bars: 8, lyricsRef: 'verse2' },
      { kind: 'chorus', bars: 8, lyricsRef: 'chorus' },
      { kind: 'verse',  bars: 8, lyricsRef: 'verse2' },
      { kind: 'chorus', bars: 8, lyricsRef: 'chorus' },
      { kind: 'outro',  bars: 4 }
    ]
  },
  {
    id: 'rock-standard',
    name: 'Rock Standard (V-C-V-C-Solo-C)',
    genres: ['rock', 'blues-rock', 'classic-rock'],
    feel: 'Driving 8th',
    timeSignature: '4/4',
    defaultBpm: 124,
    sections: [
      { kind: 'intro',  bars: 4 },
      { kind: 'verse',  bars: 8, lyricsRef: 'verse1' },
      { kind: 'chorus', bars: 8, lyricsRef: 'chorus' },
      { kind: 'verse',  bars: 8, lyricsRef: 'verse2' },
      { kind: 'chorus', bars: 8, lyricsRef: 'chorus' },
      { kind: 'solo',   bars: 8, notes: 'Lead-Solo über die Chorus-Akkorde' },
      { kind: 'chorus', bars: 8, lyricsRef: 'chorus' },
      { kind: 'chorus', bars: 8, lyricsRef: 'chorus' },
      { kind: 'outro',  bars: 4 }
    ]
  },
  {
    id: 'blues-12bar',
    name: '12-Bar Blues (klassisch)',
    genres: ['blues', 'blues-rock', 'soul'],
    feel: 'Shuffle',
    timeSignature: '4/4',
    defaultBpm: 96,
    sections: [
      { kind: 'intro', bars: 4 },
      { kind: 'verse', bars: 12, lyricsRef: 'verse1' },
      { kind: 'verse', bars: 12, lyricsRef: 'verse2' },
      { kind: 'solo',  bars: 12, notes: '12-Bar-Form' },
      { kind: 'verse', bars: 12, lyricsRef: 'verse2' },
      { kind: 'outro', bars: 4 }
    ]
  },
  {
    id: 'ballade-akustisch',
    name: 'Akustische Ballade (Intim)',
    genres: ['singer-songwriter', 'folk', 'acoustic', 'pop'],
    feel: 'Straight 8th, ruhig',
    timeSignature: '4/4',
    defaultBpm: 68,
    sections: [
      { kind: 'intro',     bars: 4 },
      { kind: 'verse',     bars: 8, lyricsRef: 'verse1' },
      { kind: 'chorus',    bars: 8, lyricsRef: 'chorus' },
      { kind: 'verse',     bars: 8, lyricsRef: 'verse2' },
      { kind: 'chorus',    bars: 8, lyricsRef: 'chorus' },
      { kind: 'bridge',    bars: 4, lyricsRef: 'bridge' },
      { kind: 'chorus',    bars: 8, lyricsRef: 'chorus' },
      { kind: 'outro',     bars: 8, notes: 'Ausklang, leiser werdend' }
    ]
  },
  {
    id: 'frei',
    name: 'Frei / Leer',
    genres: ['*'],
    feel: 'Straight 8th',
    timeSignature: '4/4',
    defaultBpm: 100,
    sections: []
  }
];

export function pickTemplateForGenre(genre: string): FusionTemplate {
  const g = genre.toLowerCase();
  const match = FUSION_TEMPLATES.find(t => t.genres.some(x => x === g || g.includes(x)));
  return match ?? FUSION_TEMPLATES[0];
}
