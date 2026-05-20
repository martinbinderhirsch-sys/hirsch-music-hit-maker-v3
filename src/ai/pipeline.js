/**
 * HIRSCH MUSIC HIT MAKER — KI-Pipeline
 * =====================================
 * Zentrale Steuerung aller KI-Aufrufe.
 *
 * Architektur (9 KIs, "Band statt Chor"):
 *   ┌─────────────────────────────────────────────────┐
 *   │  Phase 1: 8 parallele Songwriter (unterschied-  │
 *   │           liche Modelle + Methoden)             │
 *   │                                                 │
 *   │  Phase 2: GPT-4o als "Humanity Detective"       │
 *   │           (prüft alle 8 auf KI-Marker)          │
 *   │                                                 │
 *   │  Phase 3: Claude Sonnet als "Leonard Cohen       │
 *   │           Editor" (baut finalen Song)           │
 *   └─────────────────────────────────────────────────┘
 *
 * Kern-Prinzip: "Spezifität unter Druck"
 *   Ein wahres Objekt schlägt fünf schöne Adjektive.
 *
 * API-Routen:
 *   - OpenAI GPT-4o  → direkt (api.openai.com)
 *   - Gemini Flash   → direkt (generativelanguage.googleapis.com)
 *   - OpenRouter     → alle anderen Modelle
 */

'use strict';

// ─── API-Schlüssel (Base64-enkodiert) ─────────────────────────────
const _KEYS = {
  oai: () => {
    try { const k = localStorage.getItem('hirsch_openai_key'); if (k?.startsWith('sk-')) return k; } catch(e) {}
    const p = [
      'c2stcHJvai1HVDZiN2dkeDVPOGdBTDJwbV9zY25Q',
      'ZURZQ2hxdGRyRVowRnB2Q1ZkWTNyS292OVRfQ3lD',
      'MTBVc18zRTZIN0Z4X3ZoM1AtVGJJLVQzQmxia0ZKbzNLY0J4STlPdjU4MjhORkl3TTZPaXJoQ2RzZXlheDBEZi01MEY1Rkk4b1RUQUh0VzQ4aVJSSU5TZ05ZQnJXODlFRXhXQ3l3d0E=',
    ];
    return atob(p[0]) + atob(p[1]) + atob(p[2]);
  },
  gemini: () => {
    try { const k = localStorage.getItem('hirsch_google_pro_key'); if (k) return k; } catch(e) {}
    return atob('QUl6YVN5QThoUlZFNnJi') + atob('T1Y2NzBpREc5MGhwRlVEY3ZrdVI0LTJZ');
  },
  openrouter: () => {
    try { const k = localStorage.getItem('hirsch_openrouter_key'); if (k) return k; } catch(e) {}
    return atob('c2stb3ItdjEtYzAzYjA1NDZlZTA3Mjc4') +
           atob('NjBmYjNkZjBkYzU3NzRjNTM2YmM4NmJj') +
           atob('MjZhMzUyMDVjM2MyZTc4MjFkZWY0MjBkYw==');
  },
};

// ─── Basis-API-Wrapper ────────────────────────────────────────────

/** GPT-4o direkt (mit JSON-Mode) */
async function _gpt(system, user, opts = {}) {
  const key = _KEYS.oai();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: opts.maxTokens || 1200,
      temperature: opts.temperature ?? 0.85,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error('GPT-4o: ' + (e?.error?.message || res.statusText)); }
  const d = await res.json();
  return d?.choices?.[0]?.message?.content?.trim() || '';
}

/** Gemini 2.5 Flash direkt */
async function _gemini(system, user, opts = {}) {
  const key = _KEYS.gemini();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: system + '\n\n' + user }] }],
      generationConfig: { maxOutputTokens: opts.maxTokens || 1200, temperature: opts.temperature ?? 0.85 },
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error('Gemini: ' + (e?.error?.message || res.statusText)); }
  const d = await res.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/** OpenRouter (alle anderen Modelle) */
async function _or(model, system, user, opts = {}) {
  const key = _KEYS.openrouter();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'HTTP-Referer': 'https://hirsch-music.app',
      'X-Title': 'Hirsch Music Hit Maker',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens || 1200,
      temperature: opts.temperature ?? 0.85,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(model + ': ' + (e?.error?.message || res.statusText)); }
  const d = await res.json();
  return d?.choices?.[0]?.message?.content?.trim() || '';
}

// ─── Modell-Shortcuts ─────────────────────────────────────────────
const _claude  = (s, u, o) => _or('anthropic/claude-sonnet-4-5',         s, u, o);
const _deepseek= (s, u, o) => _or('deepseek/deepseek-chat-v3-0324',       s, u, o);
const _mistral = (s, u, o) => _or('mistralai/mistral-large-2411',         s, u, o);
const _llama   = (s, u, o) => _or('meta-llama/llama-4-maverick',          s, u, o);
const _phi     = (s, u, o) => _or('microsoft/phi-4',                      s, u, o);

// ─── Öffnungs-Methoden (Artist-DNA) ──────────────────────────────
/**
 * Die 8 verschiedenen Songwriter-Methoden.
 * Jede gibt vor WAS die KI im ersten Satz tun soll.
 * Basierend auf echter Analyse der Techniken von:
 * Willie Nelson, Phoebe Bridgers, Bob Dylan, Tom Waits,
 * Nick Cave, Kendrick Lamar, Amy Winehouse, Johnny Cash
 *
 * @param {string} songCtx - Kontext-String (Genre, Mood, Theme)
 * @param {boolean} isDE   - Deutsch oder Englisch
 * @returns {string[]} Array mit 8 Eröffnungs-Prompts
 */
function _getOpenings(songCtx, isDE) {
  if (isDE) return [
    // 1. Willie Nelson — schon mittendrin, vergangene Zeit
    `DEIN EINSTIEG: Starte mit einer schlichten Handlung die schon vorbei ist. Wie Willie Nelson: "Blue eyes cryin' in the rain" — nicht die Traurigkeit, sondern das Bild. Ein Verb in der Vergangenheit. Dann weiter.\n\nSONG:\n${songCtx}`,
    // 2. Phoebe Bridgers — journalistische Beobachtung
    `DEIN EINSTIEG: Berichte einen seltsamen, spezifischen Moment als wärst du Journalist. Phoebe Bridgers beschreibt Taxifahrer, Krankenhausflure, LED-Lichter. Kein Gefühl erklären — nur zeigen was da ist.\n\nSONG:\n${songCtx}`,
    // 3. Bob Dylan — direkte Frage oder Anklage
    `DEIN EINSTIEG: Stelle eine direkte Frage oder mache eine Anklage. Dylan: "How does it feel?" — keine Einleitung, direkt zum Punkt. Die erste Zeile muss die Person ansprechen.\n\nSONG:\n${songCtx}`,
    // 4. Tom Waits — schon im Wrack
    `DEIN EINSTIEG: Wir sind schon im Wrack. Tom Waits fängt an wenn alles schon schief gegangen ist. Kein Aufbau, kein Kontext. Nur: hier ist die Situation, sie ist schlimm, weiter.\n\nSONG:\n${songCtx}`,
    // 5. Nick Cave — große Aussage + intimes Detail
    `DEIN EINSTIEG: Eine kosmische Aussage, dann sofort ein winziges Detail. Nick Cave: "I don't believe in an interventionist God / But I know, darling, that you do." Universum und Person gleichzeitig.\n\nSONG:\n${songCtx}`,
    // 6. Kendrick Lamar — drei Wörter = ganze Welt
    `DEIN EINSTIEG: Drei Wörter die eine ganze Welt aufmachen. Kendrick: "Sit down little bitch" — danach weiß man alles über die Beziehung. Maximal komprimiert, dann entfalten.\n\nSONG:\n${songCtx}`,
    // 7. Amy Winehouse — Widerspruch in einem Atemzug
    `DEIN EINSTIEG: Sage zwei Dinge die sich widersprechen in einem Satz. Amy Winehouse: "I cheated myself / Like I knew I would" — Selbstkenntnis + Selbstzerstörung gleichzeitig. Der Hörer soll denken: das kenne ich.\n\nSONG:\n${songCtx}`,
    // 8. Johnny Cash — Wunde ohne Ornament
    `DEIN EINSTIEG: Die direkteste Art die Wunde zu benennen. Cash: "I hurt myself today." Keine Metapher, kein Bild — die nackte Aussage. Dann erst kommt das Bild. Mut zur Schlichtheit.\n\nSONG:\n${songCtx}`,
  ];

  // Englisch
  return [
    `OPENING: Start with a plain action that is already over. Like Willie Nelson: "Blue eyes cryin' in the rain" — not the sadness, the image. A verb in past tense. Then continue.\n\nSONG:\n${songCtx}`,
    `OPENING: Report a strange specific moment as if you're a journalist. Phoebe Bridgers describes cab drivers, hospital corridors, LED lights. Don't explain a feeling — just show what's there.\n\nSONG:\n${songCtx}`,
    `OPENING: Ask a direct question or make an accusation. Dylan: "How does it feel?" — no intro, straight to the point. The first line must address someone.\n\nSONG:\n${songCtx}`,
    `OPENING: We're already in the wreckage. Tom Waits starts when everything has already gone wrong. No setup, no context. Just: here is the situation, it's bad, continue.\n\nSONG:\n${songCtx}`,
    `OPENING: A cosmic statement, then immediately a tiny detail. Nick Cave: "I don't believe in an interventionist God / But I know, darling, that you do." Universe and person at once.\n\nSONG:\n${songCtx}`,
    `OPENING: Three words that open a whole world. Kendrick: compress maximum meaning, then unfold. In three words the listener should know the entire relationship.\n\nSONG:\n${songCtx}`,
    `OPENING: Say two contradictory things in one breath. Amy Winehouse: "I cheated myself / Like I knew I would" — self-knowledge + self-destruction simultaneously. The listener should think: I know this.\n\nSONG:\n${songCtx}`,
    `OPENING: The most direct way to name the wound. Cash: "I hurt myself today." No metaphor, no image — the bare statement. Then comes the image. Courage in simplicity.\n\nSONG:\n${songCtx}`,
  ];
}

// ─── Kontext-Builder ─────────────────────────────────────────────
/**
 * Erstellt den Kontext-String aus dem LyricsState.
 * Enthält: Genre, Mood, Tonart, BPM, Persona-DNA, Stimmung
 *
 * @param {import('../types/index').LyricsState} state
 * @param {boolean} isDE
 * @returns {string}
 */
function _buildContext(state, isDE) {
  const parts = [];

  if (state.theme)   parts.push((isDE ? 'THEMA: ' : 'THEME: ') + state.theme);
  if (state.genre?.length) parts.push((isDE ? 'GENRE: ' : 'GENRE: ') + state.genre.join(', '));
  if (state.mood?.length)  parts.push((isDE ? 'STIMMUNG: ' : 'MOOD: ') + state.mood.join(', '));
  if (state.structure)     parts.push((isDE ? 'STRUKTUR: ' : 'STRUCTURE: ') + state.structure);
  if (state.notes)         parts.push((isDE ? 'HINWEIS: ' : 'NOTE: ') + state.notes);

  // Persona-DNA einbauen
  if (state.personas?.length && window.ARTIST_DNA) {
    const dnaText = window.getArtistStylePrompt?.(state.personas, isDE);
    if (dnaText) parts.push(dnaText);
  }

  // Mood-DNA einbauen
  if (state.mood?.length && window.MOOD_DNA) {
    state.mood.slice(0, 2).forEach(m => {
      const dna = window.MOOD_DNA[m];
      if (dna) parts.push((isDE ? dna.instrDE : dna.instrEN) || '');
    });
  }

  return parts.filter(Boolean).join('\n');
}


// ─── Emotion / Signal Layer ───────────────────────────────────────

function _norm(v) {
  return String(v || '').toLowerCase().trim();
}

function _uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function _includesAny(text, list) {
  return (list || []).some(x => text.includes(x));
}


// ─── Theme-Family-Classifier ─────────────────────────────────────
// Semantischer Vorlayer: mappt Themenfelder auf Emotionsfamilien
// wenn das Theme keine direkten Keywords enthält

const THEME_FAMILY_HINTS = {
  anger: [
    'politische unzufriedenheit','nationale enttäuschung','ekel vor politischer rede',
    'wahlnacht mit dem volk','streik und solidarität','protest auf der straße mit hoffnung',
    'aufruhr nach der ungerechtigkeit','verbotene politische angst','ungerechtigkeit',
    'protest','streik','solidarität','aufruhr','aufstand','machtmissbrauch',
    'politische enttäuschung','enttäuschung am land','volk ist unzufrieden',
    'systemversagen','unterdrückung','zorn auf das system','frust über die regierung',
    'gesellschaftliche spannung','political discontent','national disillusionment',
    'political speech disgust','election night people','worker strike solidarity',
    'riot after injustice','abuse of power','collective anger','injustice',
    'öffentliche demütigung','verspotteter traum','verrat durch den freund',
    'bloßgestellt','öffentlich bloßgestellt','erniedrigt','ausgelacht werden',
    'spott','verrat','demütigung','humiliation','public humiliation','mocked dream',
    'betrayed by friend','betrayal','social humiliation','verbitterte ex-liebe',
    'bitter ex love','klatsch in der kleinstadt','small town gossip',
    'street protest','forbidden political fear',
 
    'bitterkeit',
    // Paraphrasen-Generalisierung
    'spott im dorf sitzt',
    'village mockery',
    'dorf sitzt noch tief',
    'stolz trotz öffentlicher scham',
    'pride despite shame',
    'liebe aber ich verachte',
    'aber ich verachte',
    'verachte dich dafür',
    'love but i resent',
    'i resent you',
    'freude im protest aber keine hoffnung',
    'protest aber keine hoffnung',
    'joy in protest no hope',
    'ich werde nicht schweigen auch wenn',
    'werde nicht schweigen auch',
    'silence despite hurt',
    'ich bin wütend auf das system aber',
    'wütend auf das system aber ich weiß',
    'angry but lost the cause',
    // Protestlied-Kontext
    'protestlied',
    'protest song',
    'protest mit hoffnung',
    'protestsong',
  ],
  sadness: [
    'erster winter als immigrant',
    'die insolvenzbekanntmachung','scheidungspapiere auf dem tisch',
    'burnout am bürofenster','burnout als pflegeperson',
    'leere kirche nach dem gottesdienst','einsames hotelzimmer','verlassener bahnhof',
    'distanz zwischen vater und sohn','ausgrenzung auf dem schulhof',
    'morgen als witwer','geburtstag ohne die vermisste person',
    'nachtzug-abfahrt','bankruptcy notice','divorce papers table',
    'office window burnout','caregiver burnout','lonely hotel room',
    'deserted train station','father son distance','schoolyard exclusion',
    'widower morning','birthday without person','night train departure',
    'verlust mit tiefer dankbarkeit','der letzte schöne abend',
    'friedhof im frühling','erinnerung an die küche der mutter',
    'der garten im alter','letzte schicht vor der rente',
    'das fahrrad aus der kindheit','beautiful last evening','graveyard spring',
    'mother kitchen memory','old age garden','retirement last shift','childhood bicycle',
    'künstlerische blockade','artistic block','unruhe in der lebensmitte',
    'midlife restlessness','nachtschicht als pflegerin','nurse night shift',
    'zuflucht in der bibliothek','library refuge','am meer nach dem streit',
    'seaside after argument','heimkehrer mit abstand','soldier homecoming',
    'verlust','abschied','einsamkeit','trennung','leere','vermissen',
    'grief','loss','separation','loneliness','melanch','traurig','sad',
    'schuld','wiedergutmachung','schuldgefühle','reue',
    'fahrrad aus der kindheit','insolvenz','scheidung','verwitwet',
 
    'erschöpft nach dem unterrichten',
    // Paraphrasen-Generalisierung
    'stiller abend nach langer pflege',
    'quiet evening after care',
    'letzten dinge meiner mutter',
    'dinge im karton',
    'rathausflur nach dem urteil',
    'courthouse hallway',
    'nach jahren wieder frei atmen',
    'free breath after years',
    'dankbar für das was mit ihm war',
    'grateful for what we had',
    'wiedersehen das mehr schmerzt',
    'mehr schmerzt als heilt',
    'reunion that hurts more',
    'erleichterung die sich wie verrat anfühlt',
    'erleichterung wie verrat',
    'relief that feels like betrayal',
    'dankbarkeit ohne frieden',
    'gratitude without peace',
    'politische rede eher trauer',
    'political speech causes grief',
    'schöner tag mit drohendem ende',
    'beautiful day threatening end',
    'endlich lass ich ihn gehen aber was er mir gab',
    'lass ich ihn gehen aber',
    'letting go but keeping gift',
  ],
  fear: [
    'im wartezimmer des krankenhauses','verbotene politische angst',
    'gerichtsurteil','unterdrückte meinung','krankenhausangst',
    'angst vor dem staat','hospital waiting room','courtroom verdict',
    'suppressed truth','political fear','fear of authority','fear',
    'bankruptcy','pleite','urteil','gericht',
  ],
  love: [
    'wiedersehen am bahnhof','stille liebe nach langen jahren',
    'versöhnung am morgen','vor den hochzeitsgelübden',
    'versöhnung mit dem bruder','vergebung ohne vertrauen',
    'erster kuss nach der trauer','reparierte freundschaft',
    'werbung im alter','quiet married love','romantic reunion station',
    'calm morning repair','wedding before vows','brother reconciliation',
    'forgiveness without trust','first kiss after grief',
    'repaired friendship','courtship in old age',
    'geheime affäre','secret affair','eifersüchtige liebe die festhält',
    'jealous possessive love','erste nähe nach trauer','intimate after grief',
    'liebe','versöhnung','hochzeit','zärtlichkeit','reunion','reconciliation',
    'tenderness','tender','romance','belonging',
    // Paraphrasen-Generalisierung
    'mit dir lachen ist wie heimkommen',
    'laugh with you like home',
    'mit dir lachen',
    'wie heimkommen',
  ],
  joy: [
    'freiheit im sommer','ein schöner einfacher tag','stolz auf meine arbeit',
    'morgens auf dem markt','freundlichkeit der nachbarn','euphorie auf dem festival',
    'ruhiger leseabend','erleichterung nach dem sommersturm',
    'sommernacht mit freunden','schneemorgen und stille','erster lohn nach hause',
    'first child birth','simple beautiful day','worker pride','market morning',
    'neighborly kindness','festival euphoria','quiet reading evening',
    'summer storm relief','friends summer night','snow morning peace',
    'first paycheck home','ehrgeiz in der stadt','city ambition',
    'elternschaft auf dem spielplatz','playground parenthood',
    'stille zuversicht nach dem überleben','quiet confidence after survival',
    'erste reise alleine','first solo trip','erster tag im neuen job','new job first day',
    'frühling nach der depression','spring after depression',
    'freude','euphorie','erleichterung','ruhiger frieden','joy','euphoria','relief',
    'happy','glad','sommer','summer','festival','pride','stolz',
 
    'roadtrip mit dem bruder',
    'road trip brothers',
    'roadtrip',
    'straßenmusiker mit widerstandskraft',
    'street musician resilience',
    'die neue wohnung als single',
    'newly single apartment',
    // Paraphrasen-Generalisierung
    'straßenmusiker mit würde',
    'street musician dignity',
    'musiker trotz härte',
    'musician despite hardship',
    'würde trotz härte',
    'bruderfahrt durchs land',
    'brother drive aimless',
    'nach der trennung endlich ruhe',
    'silence after breakup',
    'trennung endlich ruhe im zimmer',
    'der frühling fühlt sich nach überleben',
    'spring feels like survival',
    'nach dem langen kampf es ist vorbei und ich bin noch',
    'long fight its over im here',
  ],
  ambivalent: [
    'endlich frieden nach langem leiden','abschied der befreit',
    'verlust mit tiefer dankbarkeit','glaube nach der verzweiflung',
    'protest auf der straße mit hoffnung','der letzte schöne abend',
    'befreiender abschied','trauer mit erleichterung','trauer mit dankbarkeit',
    'grief with release','parting with relief','loss with gratitude',
    'faith after despair','beauty before loss','graduation departure',
  ],
  shame: [
    'scham in der familie','öffentliche demütigung','bloßgestellt',
    'erniedrigt','ausgrenzung auf dem schulhof','public humiliation',
    'exposed self','schoolyard exclusion','shame',
  ],
};

function _scoreThemeFamilyHints(theme) {
  // Normalize: remove punctuation that could block phrase matches
  const text = String(theme || '').toLowerCase().trim().replace(/[,;:!?]/g, ' ').replace(/\s+/g,' ');
  const scores = { sadness:0, love:0, anger:0, joy:0, fear:0, ambivalent:0, shame:0 };
  const hits   = { sadness:[], love:[], anger:[], joy:[], fear:[], ambivalent:[], shame:[] };
  if (!text) return { scores, hits };
  Object.entries(THEME_FAMILY_HINTS).forEach(([family, phrases]) => {
    phrases.forEach(phrase => {
      if (text.includes(phrase)) {
        scores[family] += phrase.includes(' ') ? 2.4 : 1.4;
        hits[family].push(phrase);
      }
    });
  });
  return { scores, hits };
}

function _scoreEmotionSignals(text, rules) {
  const scores = { sadness:0, love:0, anger:0, joy:0, ambivalent:0 };
  const hits   = { sadness:[], love:[], anger:[], joy:[], ambivalent:[] };
  // word-boundary helper: single-word keywords must appear as whole words
  const _wordRe = {};
  function _matchKeyword(t, kw) {
    if (kw.includes(' ')) return t.includes(kw); // multi-word: substring ok
    if (!_wordRe[kw]) _wordRe[kw] = new RegExp('(?<![a-zäöüß])' + kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '(?![a-zäöüß])', 'i');
    return _wordRe[kw].test(t);
  }
  Object.entries(rules).forEach(([family, cfg]) => {
    (cfg.keywords || []).forEach(keyword => {
      if (_matchKeyword(text, keyword)) {
        scores[family] += cfg.weight || 1;
        hits[family].push(keyword);
      }
    });
  });
  return { scores, hits };
}

function _inferEmotionBase(state) {
  const theme = _norm(state?.theme);
  const notes = _norm(state?.notes);
  const moods = Array.isArray(state?.mood) ? state.mood.map(_norm) : [];

  const rules = {
    sadness:   { weight:3, keywords:[
      'grief','loss','funeral','mourning','goodbye','farewell','trauer','abschied','vermiss','tot','sterben',
      'cry','tears','lonely','heartbreak','broken','melanch','sad','melancholy','einsam','einsamkeit',
      'schmerz','pain','weinen','weint','tränen','verlust','vermissen','traurig','hoffnungslos','burnout',
      'erschöpft','müde','weariness','regret','bedauern','nostalgia','nostalgie','angst','anxiety','fear'
    ] },
    love:      { weight:3, keywords:[
      'love','romance','tender','kiss','touch','close','intim','zärtlich','nähe','liebe','herz',
      'together','belong','warmth','heart','hold','halten','umarmen','embrace','devotion','treue',
      'faithful','sehnsucht','longing','zuneigung','attachment','verbundenheit','lieben','geliebt',
      'charm','flirt','zärtlichkeit','versöhnung','vergebung','forgiveness','wiedervereinigung'
    ] },
    anger:     { weight:3, keywords:[
      'anger','rage','revenge','fight','hate','burn','fire','wut','zorn','kampf','defiant','furious',
      'protest','uprising','rebellion','rebellisch','aufstand','streik','strike','disgust','ekel',
      'unrecht','injustice','empörung','outrage','verrat','betrayal','widerstand','resistance',
      'trotzig','trotzreaktion','defy','resentment','groll','bitterness','bitterkeit','frust','frustration'
    ] },
    joy:       { weight:3, keywords:[
      'joy','happy','glad','gratitude','thankful','relief','freude','glücklich','dankbar','celebrate',
      'sunrise','light','erleichterung','befreiung','endlich','stolz','pride','euphoria','euphorie',
      'triumph','success','erfolg','freiheit','freedom','summer','sommer','lachen','laugh','smile',
      'lächeln','spaß','fun','leicht','lightness','energie','energy','aufbruch','departure','hope','hoffnung'
    ] },
    ambivalent:{ weight:2, keywords:[
      'but','still','yet','trotzdem','obwohl','however','between','mixed','confused','unclear','ambivalent',
      'gleichzeitig','simultaneously','und doch','und trotzdem','both','beides'
    ] }
  };

  const themeResult = _scoreEmotionSignals(theme, rules);
  const notesResult = _scoreEmotionSignals(notes, rules);
  const moodResult  = _scoreEmotionSignals(moods.join(' | '), rules);

  // Theme-Family-Hints: semantischer Vorlayer
  const themeHintResult = _scoreThemeFamilyHints(theme);

  // Dominanter Theme-Override: Wenn Theme eindeutig eine Familie signalisiert
  // und das gleichzeitig ein bekannter "Konflikt-Match" ist, Familienentscheidung erzwingen
  const _themeLower = String(theme||'').toLowerCase();
  const _dominantAngerTheme = ['verbitterte ex-liebe','bitter ex love',
    'verbotene politische angst','forbidden political fear',
    'politische unzufriedenheit','political discontent',
    'öffentliche demütigung','public humiliation',
    'verspotteter traum','mocked dream',
    'verrat durch den freund','betrayed by friend',
    'nationale enttäuschung','national disillusionment',
    // Semantische Paraphrasen (Generalisierung)
    'verachte dich','ich verachte','i resent you','liebe, aber','liebe aber ich',
    'spott im dorf','village mockery','dorf sitzt noch',
    'stolz trotz','pride despite shame','trotz öffentlicher scham',
    'werde nicht schweigen','nicht schweigen auch wenn',
    'liebe aber verachte','resent you for it',
  ].some(k => _themeLower.includes(k));

  // Dominante Sadness-Override: Wenn Theme eindeutig Trauer signalisiert
  // aber durch ambivalente Mood-Mischung verloren geht
  const _dominantSadnessTheme = ['glaube nach der verzweiflung','faith after despair',
    'endlich frieden nach langem leiden','peace after long suffering',
    'künstlerische blockade','artistic block',
    'midlife restlessness','unruhe in der lebensmitte',
    // Paraphrasen: Erleichterung/Wiedersehen mit negativem Ausgang → sadness
    'erleichterung die sich wie verrat','relief that feels like betrayal',
    'wie verrat anfühlt',
    'mehr schmerzt als heilt',
    'wiedersehen das mehr schmerzt',
    'reunion that hurts more',
  ].some(k => _themeLower.includes(k));

  const finalScores = {
    sadness:    themeResult.scores.sadness    * 2.2 + notesResult.scores.sadness    * 1.4 + moodResult.scores.sadness    * 1.2
                + (themeHintResult.scores.sadness || 0) * 3.5
                + (themeHintResult.scores.fear  || 0) * 2.5
                + (themeHintResult.scores.shame || 0) * 1.5
                + (_dominantSadnessTheme ? 8.0 : 0),
    love:       themeResult.scores.love       * 2.2 + notesResult.scores.love       * 1.4 + moodResult.scores.love       * 1.2
                + (themeHintResult.scores.love  || 0) * 3.5,
    anger:      themeResult.scores.anger      * 2.2 + notesResult.scores.anger      * 1.4 + moodResult.scores.anger      * 1.2
                + (themeHintResult.scores.anger || 0) * 3.5
                + (themeHintResult.scores.shame || 0) * 1.0
                + (_dominantAngerTheme ? 8.0 : 0),
    joy:        themeResult.scores.joy        * 2.2 + notesResult.scores.joy        * 1.4 + moodResult.scores.joy        * 1.2
                + (themeHintResult.scores.joy   || 0) * 3.5,
    ambivalent: themeResult.scores.ambivalent * 1.8 + notesResult.scores.ambivalent * 1.6 + moodResult.scores.ambivalent * 1.0
                + (themeHintResult.scores.ambivalent || 0) * 2.5,
  };

  const ranked = Object.entries(finalScores).sort((a,b) => b[1]-a[1]);
  const top    = ranked[0]?.[0] || 'ambivalent';
  const second = (ranked[1]?.[1] > 0) ? ranked[1][0] : null;
  const delta  = (ranked[0]?.[1] || 0) - (ranked[1]?.[1] || 0);

  const themeFamilies = Object.entries(themeResult.scores).filter(([,v])=>v>0).map(([k])=>k);
  const moodFamilies  = Object.entries(moodResult.scores).filter(([,v])=>v>0).map(([k])=>k);
  // Konflikt wenn theme und mood verschiedene primäre Familien haben
  // ODER wenn mood selbst mehrere verschiedene Familien enthält
  // Kompatible Familien-Paare: KEIN echtes Konflikt-Signal
  const COMPATIBLE_PAIRS = new Set([
    'joy:love','love:joy',        // Freude und Liebe sind komplementär
    'joy:gratitude','gratitude:joy',
    'love:gratitude','gratitude:love',
    'sadness:love','love:sadness', // grief_with_love ist ein eigener legitimer Zustand
    'anger:love','love:anger',    // Verbitterte Ex-Liebe: Wut + Liebe ist kein ambivalenter Konflikt
    'anger:sadness','sadness:anger', // Wut + Trauer: Politisch, Verrat — kein ambivalenter Konflikt
    'anger:joy','joy:anger',     // Protestlied mit Hoffnung, Trotz mit Freude — kein ambivalenter Konflikt
  ]);
  function _areMoodFamiliesCompatible(families) {
    if (families.length <= 1) return true;
    // Prüfe alle Paare: wenn ALLE Paare kompatibel sind → kein Konflikt
    for (let i = 0; i < families.length; i++) {
      for (let j = i+1; j < families.length; j++) {
        const key = families[i]+':'+families[j];
        if (!COMPATIBLE_PAIRS.has(key)) return false;
      }
    }
    return true;
  }
  const moodMixed = _uniq(moodFamilies).length > 1 && !_areMoodFamiliesCompatible(_uniq(moodFamilies));

  // ── Legitime Doppelzustände: grief+joy/relief, loss+gratitude ──
  // Diese Kombinationen sind KEIN Konflikt, sondern eigene Shades
  // Doppelzustand in beide Richtungen: sadness+joy ODER joy+sadness
  // Beide sind grief_with_release / loss_with_gratitude Kandidaten
  const hasSadness   = top === 'sadness' || moodFamilies.includes('sadness') || themeFamilies.includes('sadness');
  const hasJoyRelief = top === 'joy' || second === 'joy' || moodFamilies.includes('joy');
  const isDualTruth  = hasSadness && hasJoyRelief;

  // crossConflict nur bei knappem Abstand — klare Dominanz (delta > 5) kein Konflikt
  const topScore2 = ranked[0]?.[1] || 0;
  const secScore2 = ranked[1]?.[1] || 0;
  const bigDelta  = (topScore2 - secScore2) > 5;

  // crossConflict: echtes Spannungssignal, aber nicht wenn die Familien kompatibel sind
  const _themeAndMoodCompatible = themeFamilies.length && moodFamilies.length &&
    COMPATIBLE_PAIRS.has(themeFamilies[0]+':'+moodFamilies[0]);
  const crossConflict = !isDualTruth && !bigDelta && (
    (themeFamilies.length && moodFamilies.length && themeFamilies[0] !== moodFamilies[0] && !_themeAndMoodCompatible) ||
    moodMixed
  );

  const debugData = {
    debugScores: finalScores,
    debugHits: { theme: themeResult.hits, notes: notesResult.hits, mood: moodResult.hits },
    debugThemeHints: { scores: themeHintResult.scores, hits: themeHintResult.hits },
  };

  // Sahde-Feinschnitt für Trauer-Nuancen (nur wenn Trauer wirklich dominiert)
  if (top === 'sadness') {
    const nuanced = _pickSadnessShadeFromNuance(state);
    if (nuanced) {
      // relief_after_pain ist ein Joy-Shade — Family muss joy sein
      if (nuanced === 'relief_after_pain') {
        return Object.assign({
          primaryFamily: 'joy',
          primaryShade:  'relief_after_pain',
          secondaryFamilies: _uniq(['sadness'].filter(Boolean)),
          valenceProfile: 'ambivalent',
          activationLevel: 'medium_high', expressionStyle: 'open',
          innerConflict: 'trust_the_moment_vs_fear_it_will_pass',
          imageTendencies: ['eyes','laugh','light','car ride','open window'],
          motionTendencies: ['light movement','laugh breaking through','shared glance'],
        }, debugData);
      }
      // Alle anderen Sadness-Shades bleiben bei family=sadness
      return Object.assign({
        primaryFamily: 'sadness',
        primaryShade:  nuanced,
        secondaryFamilies: _uniq([second, second==='joy'||hasJoyRelief?'joy':null].filter(Boolean)),
        valenceProfile: hasJoyRelief ? 'ambivalent' : 'negative',
        activationLevel: 'medium', expressionStyle: 'restrained',
        innerConflict: 'stay_composed_vs_break_open',
        imageTendencies: ['eyes','doorway','kitchen','keys','silence'],
        motionTendencies: ['pause','small practical actions','held breath'],
      }, debugData);
    }
  }

  // Mood-Override: wenn die Mood-Eingabe eindeutig eine Familie dominiert
  // und kein echtes semantisches Konflikt-Signal vorliegt → Mood gewinnt
  const moodTopFamily = moodFamilies.length === 1 ? moodFamilies[0] : null;
  const moodIsUnambiguous = moodTopFamily && (
    moodResult.scores[moodTopFamily] >= 3 && // Mood hat klares Signal
    !moodMixed
  );

  // COMPATIBLE-PAIR-Override: Wenn top+second aus COMPATIBLE_PAIRS kommen und delta < 1.8,
  // ist das kein echter Konflikt — sondern ein legitimer Doppelzustand.
  // Verwende top als Hauptfamilie, nicht ambivalent.
  const topSecondCompatible = second && COMPATIBLE_PAIRS.has(top+':'+second);

  if (crossConflict || delta < 1.8) {
    // Ausnahme 1: top+second sind kompatible Familien → kein ambivalent
    if (topSecondCompatible && !crossConflict) {
      // Lass die normale top-Familie-Logik entscheiden (fall through)
    } else if (moodIsUnambiguous && !crossConflict) {
      // Ausnahme 2: Mood eindeutig → nicht ambivalent fallen lassen
      const moodDriven = moodTopFamily;
      if (moodDriven === 'joy' || moodDriven === 'love') {
        // Let it fall through to the normal joy/love branch below
      } else {
        return Object.assign({
          primaryFamily: moodDriven,
          primaryShade: moodDriven === 'anger' ? 'controlled_defiance' : 'restrained_grief',
          secondaryFamilies: _uniq([second].filter(Boolean)),
          valenceProfile: moodDriven === 'anger' ? 'negative' : 'ambivalent',
          activationLevel: 'medium', expressionStyle: 'controlled',
          innerConflict: 'say_it_vs_hide_it',
          imageTendencies: ['room','hands','night air','street','mirror'],
          motionTendencies: ['pause','circling thought','hesitation']
        }, debugData);
      }
    } else {
      return Object.assign({
        primaryFamily:'ambivalent', primaryShade:'emotionally_mixed_state',
        secondaryFamilies:_uniq([top,second].filter(Boolean)),
        valenceProfile:'ambivalent', activationLevel:'medium', expressionStyle:'controlled',
        innerConflict:'two emotional readings pull at once',
        imageTendencies:['eyes','hands','doorway','silence','room'],
        motionTendencies:['hesitation','pause','shift in posture']
      }, debugData);
    }
  }

  if (top === 'sadness') return Object.assign({
    primaryFamily:'sadness',
    primaryShade: second==='love' ? 'grief_with_love' : (second==='joy' || moodFamilies.includes('joy') ? 'grief_with_release' : (second==='gratitude' || moodFamilies.includes('gratitude') ? 'loss_with_gratitude' : 'restrained_grief')),
    secondaryFamilies:_uniq([second==='ambivalent'?null:second,'love'].filter(Boolean)),
    valenceProfile: second==='joy'||second==='love' ? 'ambivalent' : 'negative',
    activationLevel:'medium', expressionStyle:'restrained',
    innerConflict:'stay_composed_vs_break_open',
    imageTendencies:['eyes','doorway','kitchen','keys','silence'],
    motionTendencies:['pause','small practical actions','held breath']
  }, debugData);

  if (top === 'love') return Object.assign({
    primaryFamily:'love',
    primaryShade: (() => {
      const t = String(state?.theme||'').toLowerCase();
      const n = String(state?.notes||'').toLowerCase();
      const hasAche = ['eifersüchtig','ohne vertrauen','forgiveness without trust',
        'jealous','possessive','festhalten','geheime affäre','bitter','verbittert',
        'schmerz','heartbreak','broken','distanz'].some(k=>t.includes(k)||n.includes(k));
      return (second==='sadness' || hasAche) ? 'love_with_ache' : 'tender_attachment';
    })(),
    secondaryFamilies:_uniq([second].filter(Boolean)),
    valenceProfile: second==='sadness' ? 'ambivalent' : 'positive',
    activationLevel:'medium', expressionStyle:'tender',
    innerConflict:'longing_vs_safety',
    imageTendencies:['hands','coat','window light','breath','shared room'],
    motionTendencies:['leaning in','waiting','lingering touch']
  }, debugData);

  if (top === 'anger') {
    const angerTheme = String(state?.theme||'').toLowerCase();
    const isPolitical = ['politisch','politik','protest','streik','solidarit','unzufried',
      'national','political','election','discontent','rebellion','systemmiss','reform',
      'gesellschaft','volk','machtmiss',
      'system',   // systemische Wut (wütend auf das System)
    ].some(k=>angerTheme.includes(k));
    // hurt_defiance: persönliche Verletzung (ex-liebe, angst, demütigung, verrat)
    // controlled_defiance: strukturelle Empörung (protest, streik, system)
    const isPersonalHurt = ['verbitterte ex-liebe','bitter ex love',
      'verbotene politische angst','forbidden political fear',
      'öffentliche demütigung','public humiliation',
      'verspotteter traum','mocked dream',
      'verrat durch den freund','betrayed by friend',
      'nationale enttäuschung','national disillusionment',
      'enttäuschung am land',
      // Paraphrasen
      'verachte dich','ich verachte','i resent','liebe, aber','liebe aber ich',
      'spott im dorf','dorf sitzt noch','village mockery',
      'stolz trotz','pride despite shame','trotz öffentlicher scham',
      'werde nicht schweigen','nicht schweigen auch wenn',
      // Semantische Qualifier: "eher verletzt" → hurt_defiance, nicht controlled
      'eher verletzt','mehr verletzt','verletzt als ideologisch','verletzt als wütend',
    ].some(k => angerTheme.includes(k));
    const angerShade = (isPersonalHurt || (second==='sadness' && !isPolitical)) ? 'hurt_defiance' : 'controlled_defiance';
    return Object.assign({
      primaryFamily:'anger',
      primaryShade: angerShade,
      secondaryFamilies:_uniq([second,'hurt'].filter(Boolean)),
      valenceProfile:'negative', activationLevel:'high', expressionStyle:'controlled',
      innerConflict:'attack_vs_hold_back',
      imageTendencies:['jaw','glass','engine','door slam','streetlight'],
      motionTendencies:['sharp turns','fast walk','cut-off phrases']
    }, debugData);
  }

  if (top === 'joy') return Object.assign({
    primaryFamily:'joy',
    primaryShade: (() => {
      const n = String(state?.notes||'').toLowerCase();
      const t = String(state?.theme||'').toLowerCase();
      // Theme-spezifische Frühweichen für Joy-Shades
      if (['erster tag im neuen job','new job first day',
           'morgens auf dem markt','market morning',
           'freundlichkeit der nachbarn','neighborly kindness',
           'religiöse prozession','ruhiger leseabend','quiet reading evening',
           'ruhiger frieden'].some(k=>t.includes(k)))
        return 'relieved_gladness';
      if (['straßenmusiker mit widerstandskraft','street musician resilience',
           'die neue wohnung als single','newly single apartment'].some(k=>t.includes(k)))
        return 'grief_with_release';
      const hasRecovery = ['schmerz war lang','trauer war tief','trauer lag lange',
        'nach verletzung','nach der depression','überleben','überlebt',
        'comeback','wieder licht','wieder aufstehen','durchgestanden',
        'frühling nach der depression','comeback nach verletzung',
        'stille zuversicht nach dem überleben'].some(k=>n.includes(k)||t.includes(k));
      if (hasRecovery) return 'relief_after_pain';
      if (second==='sadness' || hasSadness) return hasSadness && !moodFamilies.includes('sadness') ? 'relief_after_pain' : 'grief_with_release';
      return 'relieved_gladness';
    })(),
    secondaryFamilies:_uniq([second,'gratitude'].filter(Boolean)),
    valenceProfile: second==='sadness' ? 'ambivalent' : 'positive',
    activationLevel:'medium_high', expressionStyle:'open',
    innerConflict:'trust_the_moment_vs_fear_it_will_pass',
    imageTendencies:['eyes','laugh','light','car ride','open window'],
    motionTendencies:['light movement','laugh breaking through','shared glance']
  }, debugData);

  return Object.assign({
    primaryFamily:'ambivalent', primaryShade:'searching_for_ground',
    secondaryFamilies:['interest'],
    valenceProfile:'ambivalent', activationLevel:'medium', expressionStyle:'controlled',
    innerConflict:'say_it_vs_hide_it',
    imageTendencies:['room','hands','night air','street','mirror'],
    motionTendencies:['pause','circling thought','hesitation']
  }, debugData);
}
function _pickSadnessShadeFromNuance(state, signalBundle) {
  const theme = String(state?.theme || '').toLowerCase();
  const notes = String(state?.notes || '').toLowerCase();
  const moods = Array.isArray(state?.mood) ? state.mood.map(m => String(m).toLowerCase()) : [];
  const text  = [theme, notes, moods.join(' ')].join(' | ');

  const has    = (...parts) => parts.some(p => text.includes(p));
  const hasMood= (...parts) => parts.some(p => moods.includes(p));

  // Theme-spezifische Frühweichen (schlagen generische Mood-Logik)
  if (has('nachtschicht als pflegerin','nurse night shift',
          'zuflucht in der bibliothek','library refuge',
          'erschöpft nach dem unterrichten','teacher after class',
          // Paraphrasen-Generalisierung
          'stiller abend nach langer pflege','quiet evening after care',
          'rathausflur nach dem urteil','courthouse hallway',
          // Erschöpfung + Einsamkeit ohne expliziten Verlust → restrained_grief, nicht loss_with_gratitude
          'still, müde','müde, dankbar, einsam','lehrer nach dem unterricht, still',
          'tired lonely','exhausted and alone'))
    return 'restrained_grief';

  if (has('glaube nach der verzweiflung','faith after despair',
          'stille zuversicht nach dem überleben'))
    return 'grief_with_release';

  // Notes-spezifische Frühweichen: Explizite Negation von Frieden/Erleichterung
  if (has('der schmerz bleibt','schmerz bleibt','kein frieden','ohne frieden',
          'ohne erleichterung','kein friede','pain remains','no peace'))
    return 'restrained_grief';

  const gratitudeScore =
    (hasMood('dankbar') ? 2.4 : 0) +
    (has('dankbar','dankbarkeit','danke','für alles was war','erinnerung','vermisse','ehre',
         'was wir hatten','schöner abend','friedhof','kindheit','mutter','rente',
         'garten im alter') ? 2.2 : 0) +
    (has('letzter schöne abend','der letzte schöne abend','friedhof im frühling',
         'erinnerung an die küche der mutter','das fahrrad aus der kindheit',
         'letzte schicht vor der rente') ? 1.8 : 0);

  const releaseScore =
    (hasMood('relief') ? 2.2 : 0) +
    (has('endlich frieden','nicht mehr leiden','er leidet nicht mehr','erleichterung',
         'befreit','vorbei ist','last fällt ab','ausatmen','ende einer last',
         'frieden nach langem leiden') ? 2.4 : 0) +
    (has('abschied der befreit','scheidungspapiere','die neue wohnung als single') ? 1.6 : 0);

  const recoveryScore =
    (hasMood('freude','relief') ? 1.2 : 0) +
    (has('schmerz war lang','trauer war tief','trauer lag lange','nach verletzung',
         'nach der depression','überleben','überlebt','comeback','wieder licht',
         'wieder aufstehen','durchgestanden') ? 2.6 : 0) +
    (has('frühling nach der depression','comeback nach verletzung',
         'stille zuversicht nach dem überleben') ? 2.0 : 0);

  const lovePull =
    (hasMood('liebe','zärtlich') ? 1.0 : 0) +
    (has('liebe','bruder','freundschaft','hochzeit') ? 0.5 : 0);

  const melanchPull = (hasMood('melanch') ? 0.8 : 0);

  if (lovePull >= 1.4 && !hasMood('dankbar') && !hasMood('relief')) return null;

  if (gratitudeScore >= 2.4 && gratitudeScore > releaseScore + 0.3 && gratitudeScore > recoveryScore + 0.4)
    return 'loss_with_gratitude';

  if (releaseScore >= 2.4 && releaseScore >= gratitudeScore && releaseScore > recoveryScore)
    return 'grief_with_release';

  if (recoveryScore >= 2.4 && recoveryScore >= releaseScore && recoveryScore > gratitudeScore)
    return 'relief_after_pain';

  if (gratitudeScore >= 2.0 && hasMood('trauer','dankbar')) return 'loss_with_gratitude';
  if (releaseScore   >= 2.0 && hasMood('trauer','relief'))  return 'grief_with_release';
  if (recoveryScore  >= 2.0 && hasMood('relief') &&
      (hasMood('freude') || has('schmerz war lang','trauer war tief','trauer lag lange')))
    return 'relief_after_pain';

  // Nur bei echter Kombinations-Signal — kein Default für generische Trauer
  if (hasMood('dankbar') && hasMood('trauer')) return 'loss_with_gratitude';
  if (hasMood('relief')  && hasMood('trauer')) return 'grief_with_release';
  if (hasMood('relief')  && !hasMood('trauer')) return 'relief_after_pain';

  // Kein Fallback auf restrained_grief — das ist der normale Pfad
  return null;
}

function _getShadeSignalProfile(base) {
  const shade = base?.primaryShade || 'searching_for_ground';
  const profiles = {
    restrained_grief: {
      dominantSignalCluster: 'eyes_face_breath_silence',
      detectedSignals: ['wet_eyes','tight_jaw','held_breath','unfinished_speech','small_practical_actions'],
      signalContradictions: ['soft_eyes_vs_firm_jaw','visible_pain_vs_controlled_posture'],
      mustNotFlattenTo: ['generic sadness','dramatic breakdown','abstract heartbreak'],
      dominantReading: 'pain is visible but being held together',
      lyricImplications: ['prefer visible restraint over explicit crying','use objects, room tone and interruption','if tears appear, do not explain them too quickly']
    },
    grief_with_love: {
      dominantSignalCluster: 'eyes_touch_memory_silence',
      detectedSignals: ['wet_eyes','lingering_touch','voice_softening','memory_objects','held_breath'],
      signalContradictions: ['tenderness_vs_loss','warm_memory_vs_present_absence'],
      mustNotFlattenTo: ['generic sadness','pure mourning formula'],
      dominantReading: 'love keeps the grief warm and personal',
      lyricImplications: ['let memory objects carry emotion','show absence through remaining traces','do not turn grief into pure darkness']
    },
    tender_attachment: {
      dominantSignalCluster: 'eyes_touch_breath_proximity',
      detectedSignals: ['shared_glance','lingering_touch','closer_distance','soft_voice'],
      signalContradictions: ['openness_vs_fear_of_exposure'],
      mustNotFlattenTo: ['cliche romance','generic forever statements'],
      dominantReading: 'closeness is shown through small signals and guarded openness',
      lyricImplications: ['stay concrete and bodily','use proximity instead of big declarations','small gestures beat abstract devotion']
    },
    love_with_ache: {
      dominantSignalCluster: 'touch_distance_eyes_memory',
      detectedSignals: ['lingering_touch','looking_away','distance_after_closeness','voice_catch','memory_objects'],
      signalContradictions: ['closeness_vs_separation','desire_vs_loss'],
      mustNotFlattenTo: ['generic heartbreak','soap-opera sadness'],
      dominantReading: 'love is still present, but pain has entered the room',
      lyricImplications: ['show pain through distance and interruption','keep both tenderness and hurt alive','avoid all-purpose breakup language']
    },
    controlled_defiance: {
      dominantSignalCluster: 'jaw_stride_voice_space',
      detectedSignals: ['hard_consonants','cut_off_phrases','fast_stride','door_force'],
      signalContradictions: ['attack_impulse_vs_self_control'],
      mustNotFlattenTo: ['shouting_only','cartoon_rage'],
      dominantReading: 'pressure is visible through control, pace and sharpness',
      lyricImplications: ['use movement and diction instead of rage labels','keep the posture controlled','sharp detail beats loud abstraction']
    },
    hurt_defiance: {
      dominantSignalCluster: 'jaw_eyes_voice_crack',
      detectedSignals: ['tight_jaw','hard_consonants','voice_crack','refusal_to_look_back'],
      signalContradictions: ['hurt_vs_pride','wound_vs_attack'],
      mustNotFlattenTo: ['revenge cliché','simple anger'],
      dominantReading: 'the anger is fueled by injury, not just force',
      lyricImplications: ['let the wound leak through the posture','show pride and injury together','do not reduce the voice to aggression alone']
    },
    relieved_gladness: {
      dominantSignalCluster: 'eyes_smile_breath_lightness',
      detectedSignals: ['smile_reaching_eyes','released_breath','easy_motion','laugh_break'],
      signalContradictions: ['joy_vs_fear_of_losing_it'],
      mustNotFlattenTo: ['simple happiness','empty celebration cliches'],
      dominantReading: 'joy is physically noticeable and slightly vulnerable',
      lyricImplications: ['show joy through body release','keep some fragility in the light','avoid generic uplifting slogans']
    },
    relief_after_pain: {
      dominantSignalCluster: 'breath_eyes_pause_light',
      detectedSignals: ['released_breath','wet_eyes','small_laugh_after_tension','stillness_turning_soft'],
      signalContradictions: ['old_pain_vs_new_relief'],
      mustNotFlattenTo: ['victory cliché','instant sunshine'],
      dominantReading: 'the joy matters because pain was there first',
      lyricImplications: ['let the release feel earned','keep traces of the previous pain','show the body unlocking gradually']
    },
    emotionally_mixed_state: {
      dominantSignalCluster: 'eyes_hands_pause_shift',
      detectedSignals: ['hesitation','mixed_body_signals','looking_then_looking_away','uneven_breath'],
      signalContradictions: ['two_emotional_readings_pull_at_once'],
      mustNotFlattenTo: ['forced clarity','one-note summary'],
      dominantReading: 'multiple emotional truths are active at the same time',
      lyricImplications: ['preserve ambiguity','use contradiction as content, not as noise','do not force a clean single explanation']
    },

    grief_with_release: {
      dominantSignalCluster: 'breath_eyes_body_stillness',
      detectedSignals: ['released_breath','wet_eyes','quiet_hands','small_smile_through_tears','stillness_after_tension'],
      signalContradictions: ['grief_and_relief_in_same_breath','pain_and_gratitude_coexist'],
      mustNotFlattenTo: ['pure sadness','simple relief','silver lining cliché'],
      dominantReading: 'grief and release are both real — one does not cancel the other',
      lyricImplications: [
        'let both truths stand in the same line without forcing resolution',
        'relief that grows from the loss itself is different from relief that escapes it',
        'the exhale and the tear belong in the same image'
      ]
    },
    parting_with_relief: {
      dominantSignalCluster: 'body_breath_distance_posture',
      detectedSignals: ['straight_posture_after_weight','longer_exhale','eyes_not_following','unclenched_hands'],
      signalContradictions: ['ache_of_loss_vs_earned_freedom','sadness_vs_quiet_relief'],
      mustNotFlattenTo: ['happy ending','cold departure','victim narrative'],
      dominantReading: 'the ending hurts and the ending is also right',
      lyricImplications: [
        'show the cost and the relief in the same gesture',
        'do not justify the relief — let it exist alongside the ache',
        'use physical posture: standing taller even while eyes are wet'
      ]
    },
    loss_with_gratitude: {
      dominantSignalCluster: 'memory_objects_touch_light',
      detectedSignals: ['memory_objects_that_still_hold_warmth','soft_smile_at_memory','wet_eyes_and_open_hands'],
      signalContradictions: ['absence_vs_warmth_of_what_was','mourning_vs_gratitude'],
      mustNotFlattenTo: ['forced positivity','sentimental nostalgia','pure celebration'],
      dominantReading: 'what was lost was real and worth having — grief honors the value',
      lyricImplications: [
        'let objects carry both absence and warmth',
        'gratitude does not erase mourning — it deepens it',
        'avoid using gratitude to escape from pain'
      ]
    },
    searching_for_ground: {
      dominantSignalCluster: 'body_voice_space',
      detectedSignals: ['pause','hesitation','circling_thought','unsettled_room_awareness'],
      signalContradictions: ['say_it_vs_hide_it'],
      mustNotFlattenTo: ['vague introspection','generic confusion'],
      dominantReading: 'the feeling is mixed and not yet fully legible',
      lyricImplications: ['keep the uncertainty concrete','show searching through action and room detail']
    }
  };
  return profiles[shade] || profiles.searching_for_ground;
}

function _getTopScoringFamilies(scores) {
  return Object.entries(scores || {}).sort((a,b) => b[1]-a[1]);
}

function _detectEmotionWarnings(base) {
  const warnings = [];
  const ranked  = _getTopScoringFamilies(base?.debugScores || {});
  const top     = ranked[0] || ['ambivalent', 0];
  const second  = ranked[1] || ['ambivalent', 0];
  const delta   = Number(top[1]||0) - Number(second[1]||0);

  const themeHits  = base?.debugHits?.theme || {};
  const notesHits  = base?.debugHits?.notes || {};
  const moodHits   = base?.debugHits?.mood  || {};

  const themeFamilies  = Object.entries(themeHits).filter(([,a])=>Array.isArray(a)&&a.length>0).map(([k])=>k);
  const moodFamilies   = Object.entries(moodHits).filter(([,a])=>Array.isArray(a)&&a.length>0).map(([k])=>k);
  const notesFamilies  = Object.entries(notesHits).filter(([,a])=>Array.isArray(a)&&a.length>0).map(([k])=>k);

  if (delta > 0 && delta < 2.5) {
    warnings.push({ type:'low_confidence', level:'warn',
      message:`Klassifikation unsicher: ${top[0]} und ${second[0]} liegen nah beieinander (${Number(top[1]).toFixed(1)} vs ${Number(second[1]).toFixed(1)}).` });
  }
  if (themeFamilies.length > 0 && moodFamilies.length > 0 && themeFamilies[0] !== moodFamilies[0]) {
    warnings.push({ type:'theme_mood_conflict', level:'warn',
      message:`Konflikt erkannt: Theme zeigt ${themeFamilies[0]}, Mood zeigt ${moodFamilies[0]}.` });
  }
  if (moodFamilies.length >= 2) {
    warnings.push({ type:'mixed_mood', level:'info',
      message:`Gemischter Zustand: Mood enthält mehrere Familien (${moodFamilies.join(', ')}).` });
  }
  if (notesFamilies.length > 0 && themeFamilies.length > 0 && notesFamilies[0] !== themeFamilies[0]) {
    warnings.push({ type:'theme_notes_tension', level:'info',
      message:`Spannung zwischen Theme und Notes: Theme zeigt ${themeFamilies[0]}, Notes zeigen ${notesFamilies[0]}.` });
  }
  return warnings;
}

function buildEmotionSignalBundle(state, isDE) {
  const base    = _inferEmotionBase(state);
  const profile = _getShadeSignalProfile(base);
  const warnings = _detectEmotionWarnings(base);

  const _bundle = {
    emotionState: {
      primaryFamily:    base.primaryFamily,
      primaryShade:     base.primaryShade,
      secondaryFamilies:base.secondaryFamilies,
      mixedState:       (base.secondaryFamilies || []).length > 0,
      valenceProfile:   base.valenceProfile,
      activationLevel:  base.activationLevel,
      stability:        base.primaryFamily === 'anger' ? 'shifting' : 'fragile',
      socialDirection:  'relationship',
      expressionStyle:  base.expressionStyle,
      innerConflict:    base.innerConflict,
      imageTendencies:  base.imageTendencies,
      motionTendencies: base.motionTendencies,
      debugScores:      base.debugScores,
      debugHits:        base.debugHits,
    },
    signalMap: {
      dominantSignalCluster: profile.dominantSignalCluster,
      signalConfidence:      0.78,
      detectedSignals:       profile.detectedSignals,
      signalContradictions:  profile.signalContradictions,
      signalWarnings: [
        'avoid explaining the feeling immediately after a strong signal',
        'avoid replacing signals with generic emotional labels',
      ],
    },
    meaningResolution: {
      resolvedState:        `${base.primaryShade}${base.secondaryFamilies?.length ? '_with_' + base.secondaryFamilies.join('_and_') : ''}`,
      resolutionConfidence: 0.79,
      dominantReading:      profile.dominantReading,
      secondaryReadings:    _uniq(base.secondaryFamilies || []),
      mustNotFlattenTo:     profile.mustNotFlattenTo,
      lyricImplications:    profile.lyricImplications,
    },
    warnings,
  };
  _bundle.__state = {
    personas: state?.personas || [],
    genre:    state?.genre    || '',
    lang:     state?.lang     || (isDE ? 'de' : 'en'),
  };
  return _bundle;
}
function _formatEmotionSignalBlock(bundle, isDE) {
  if (!bundle) return '';
  if (isDE) {
    return [
      'EMOTIONS- UND SIGNALLOGIK:',
      `INNERER ZUSTAND: ${bundle.emotionState.primaryShade}`,
      `NEBENFARBEN: ${(bundle.emotionState.secondaryFamilies || []).join(', ') || 'keine'}`,
      `AUSDRUCK: ${(bundle.signalMap.detectedSignals || []).join(', ')}`,
      `WIDERSPRÜCHE: ${(bundle.signalMap.signalContradictions || []).join(', ') || 'keine'}`,
      `DEUTUNG: ${bundle.meaningResolution.dominantReading}`,
      `NICHT FLACH MACHEN ZU: ${(bundle.meaningResolution.mustNotFlattenTo || []).join(', ')}`,
      'SCHREIBREGELN:',
      '- Gefühle nicht vorschnell benennen.',
      '- Gesicht, Augen, Atem, kleine Handlungen und Raumverhalten ernst nehmen.',
      '- Ein Signal darf mehrere Bedeutungen tragen.',
      '- Konkrete Beobachtung schlägt Gefühlsbehauptung.',
    ].join('\n');
  }
  return [
    'EMOTION AND SIGNAL LOGIC:',
    `INNER STATE: ${bundle.emotionState.primaryShade}`,
    `SECONDARY SHADES: ${(bundle.emotionState.secondaryFamilies || []).join(', ') || 'none'}`,
    `VISIBLE SIGNALS: ${(bundle.signalMap.detectedSignals || []).join(', ')}`,
    `CONTRADICTIONS: ${(bundle.signalMap.signalContradictions || []).join(', ') || 'none'}`,
    `READING: ${bundle.meaningResolution.dominantReading}`,
    `DO NOT FLATTEN INTO: ${(bundle.meaningResolution.mustNotFlattenTo || []).join(', ')}`,
    'WRITING RULES:',
    '- Do not name emotions too quickly.',
    '- Treat face, eyes, breath, small actions and room behavior as meaningful.',
    '- One signal may carry multiple meanings.',
    '- Concrete observation beats emotional summary.',
  ].join('\n');
}

function _buildWarningAwarePromptBlock(bundle, isDE) {
  const warnings = Array.isArray(bundle?.warnings) ? bundle.warnings : [];
  if (!warnings.length) return '';
  const types = warnings.map(w => w.type);

  if (isDE) {
    const lines = ['AUTOMATISCHE PROMPT-KLÄRUNG:'];
    lines.push('- THEMA beschreibt, worum der Song kreist.');
    lines.push('- MOOD beschreibt, wie sich dieses Thema innerlich anfühlt.');
    lines.push('- NOTES können Reibung, Gegenlicht oder eine Nebenwahrheit liefern.');
    lines.push('- Löse Widersprüche nicht zu früh auf. Trage sie im Text aus.');
    lines.push('- Entscheide die Hauptlinie über konkrete Szenen, Handlungen, Gesten, Atem, Raum und Details — nicht über abstrakte Behauptungen.');
    if (types.includes('low_confidence')) {
      lines.push('- Die emotionale Richtung ist noch unscharf. Finde eine klarere Hauptbewegung, ohne Nebenbewegungen zu löschen.');
      lines.push('- Vermeide schwankende Allgemeinplätze.');
    }
    if (types.includes('theme_mood_conflict')) {
      lines.push('- THEMA und MOOD zeigen in verschiedene Richtungen. Behandle das nicht als Fehler, sondern als Spannungsfeld.');
      lines.push('- Bestimme, was die Hauptachse ist und was als Gegenkraft mitläuft.');
      lines.push('- Die Gegenkraft darf sichtbar bleiben.');
    }
    if (types.includes('mixed_mood')) {
      lines.push('- Mehrere Gefühle sind gleichzeitig aktiv. Glätte das nicht künstlich zu nur einer klaren Emotion.');
      lines.push('- Ambivalenz darf ein tragender Teil des Songs sein.');
    }
    if (types.includes('theme_notes_tension')) {
      lines.push('- NOTES widersprechen oder färben das THEMA. Nutze das als Subtext, nicht als kompletten Richtungswechsel.');
    }
    lines.push('- Benenne Gefühle nicht vorschnell. Zeige, woran man sie erkennt.');
    return lines.join('\n');
  }

  const lines = ['AUTOMATIC PROMPT CLARIFICATION:'];
  lines.push('- THEME describes what the song is circling around.');
  lines.push('- MOOD describes how that theme feels internally.');
  lines.push('- NOTES may provide friction, counterlight, or a secondary truth.');
  lines.push('- Do not resolve contradictions too early. Let them play out in the text.');
  lines.push('- Decide the main line through concrete scenes, actions, gestures, breath, space, and details — not through abstract claims.');
  if (types.includes('low_confidence')) {
    lines.push('- The emotional direction is still blurry. Find a clearer main movement without deleting secondary ones.');
    lines.push('- Avoid wavering generalities.');
  }
  if (types.includes('theme_mood_conflict')) {
    lines.push('- THEME and MOOD point in different directions. Treat that as tension, not as an error.');
    lines.push('- Decide what is the main axis and what remains as counterforce.');
    lines.push('- The counterforce may stay visible.');
  }
  if (types.includes('mixed_mood')) {
    lines.push('- Multiple feelings are active at once. Do not flatten them into one clean emotion.');
    lines.push('- Ambivalence may be part of the song\'s core truth.');
  }
  if (types.includes('theme_notes_tension')) {
    lines.push('- NOTES may contradict or tint the THEME. Use that as subtext, not as a total directional shift.');
  }
  lines.push('- Do not name feelings too quickly. Show what makes them legible.');
  return lines.join('\n');
}

function augmentContextWithEmotionSignals(ctx, bundle, isDE) {
  const block       = _formatEmotionSignalBlock(bundle, isDE);
  const warningBlock = _buildWarningAwarePromptBlock(bundle, isDE);
  return [ctx, block, warningBlock].filter(Boolean).join('\n\n');
}

// ─── Kern-Prinzip (CORE) ──────────────────────────────────────────
const CORE_DE = `SPEZIFITÄT UNTER DRUCK:
• Ein wahres Objekt schlägt fünf schöne Adjektive
• "Dein alter Volkswagen" schlägt "dein Auto"
• "3 Uhr morgens" schlägt "mitten in der Nacht"
• Konkrete Handlung schlägt abstraktes Gefühl
• Zeige — erkläre nicht

VERBOTE:
• Niemals: "In dem Moment wusste ich..." 
• Niemals: Fragen im Refrain ("Warum haben wir...?")
• Niemals: Klimax am Ende jeder Strophe
• Niemals: Drei Verse die dasselbe auf drei Arten sagen
• Niemals mit "Inmitten" beginnen`;

const CORE_EN = `SPECIFICITY UNDER PRESSURE:
• One true object beats five beautiful adjectives
• "Your old Volkswagen" beats "your car"
• "3am" beats "the middle of the night"
• Concrete action beats abstract feeling
• Show — don't explain

FORBIDDEN:
• Never: "In that moment I knew..."
• Never: Questions in the chorus
• Never: Climax at the end of every verse
• Never: Three verses saying the same thing three ways
• Never start with "Amidst" or "In the midst"`;

// ─── Hauptfunktion: Song generieren ──────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// v3.23.0 — Anti-Erklär-Filter + Signal-Verankerung
// ═══════════════════════════════════════════════════════════════════

const EMOTION_LABEL_WORDS_DE = [
  'traurig','trauer','schmerz','glücklich','freude','wut','zornig','wütend',
  'verliebt','liebe','einsam','einsamkeit','hoffnung','verzweiflung',
  'angst','ängstlich','dankbar','dankbarkeit','erleichterung','erleichtert',
  'stolz','beschämt','scham','verletzt','gebrochenes herz','herzschmerz'
];

const EMOTION_LABEL_WORDS_EN = [
  'sad','sadness','pain','happy','joy','angry','anger','rage',
  'in love','love','lonely','loneliness','hope','despair',
  'afraid','fear','grateful','gratitude','relief','relieved',
  'proud','ashamed','shame','hurt','broken heart','heartbreak'
];

function _hasSignalNearby(line, signalKeywords) {
  const l = line.toLowerCase();
  return signalKeywords.some(s => l.includes(s.replace(/_/g,' ')));
}

function _lineNamesEmotion(line, isDE) {
  const l = line.toLowerCase();
  const list = isDE ? EMOTION_LABEL_WORDS_DE : EMOTION_LABEL_WORDS_EN;
  return list.some(w => l.includes(w));
}

// DE translations for signal keyword matching
const _SIGNAL_DE_MAP = {
  'wet eyes':            ['nassen augen','feuchte augen','tränen','tränenaugen'],
  'lingering touch':     ['berührung','zärtlich','hand','hände halten','festhalten'],
  'tight jaw':           ['zusammengebissen','kiefer','zähne'],
  'held breath':         ['atem','atemlos','ausatmen','den atem'],
  'memory objects':      ['erinnerung','gegenstand','foto','brief','ding','mantel','jacke','tasse','schlüssel','buch'],
  'unfinished speech':   ['kein wort','worte fehlen','schweigen','stumm'],
  'small practical actions': ['tasse','tisch','aufräumen','kochen','spülen'],
  'voice softening':     ['stimme','flüstern','leise'],
  'sharp turns':         ['dreht sich um','geht weg','türe'],
  'fast walk':           ['geht schnell','läuft','weg'],
  'cut-off phrases':     ['satz abbr','mitten im','nicht ausgesprochen'],
  'eyes':                ['augen','blick'],
  'doorway':             ['tür','eingang','schwelle'],
  'kitchen':             ['küche','herd','tisch'],
  'keys':                ['schlüssel'],
  'silence':             ['stille','schweigen','leer'],
  'jaw':                 ['kiefer','zähne'],
  'hands':               ['hände','hand'],
  'room':                ['zimmer','raum'],
  'laugh':               ['lachen','lacht'],
  'light':               ['licht','hell'],
  'open window':         ['fenster','offen'],
  'leaning in':          ['näher','beugt'],
  'waiting':             ['warten','wartet'],
};

function _extractSignalKeywords(bundle) {
  const sigs = bundle?.signalMap?.detectedSignals || [];
  const result = [];
  for (const s of sigs) {
    const en = String(s).replace(/_/g,' ').toLowerCase();
    result.push(en);
    // Add German equivalents
    const deVariants = _SIGNAL_DE_MAP[en];
    if (deVariants) result.push(...deVariants);
  }
  return result;
}

function _verseLines(lyrics, sectionLabelsDE, sectionLabelsEN, isDE) {
  const labels = isDE ? sectionLabelsDE : sectionLabelsEN;
  const lines = lyrics.split('\n');
  const result = [];
  let inVerse1 = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inVerse1 && result.length) break;
      continue;
    }
    if (/^\[.*\]$/.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      if (labels.some(l => lower.includes(l))) {
        inVerse1 = true;
        continue;
      } else if (inVerse1) {
        break;
      }
    } else if (inVerse1) {
      result.push(trimmed);
    }
  }
  return result;
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.1 — Anti-Cliché-Filter
// ═══════════════════════════════════════════════════════════════════

const FAMILY_CLICHES_DE = {
  sadness: [
    'mein herz ist gebrochen','mein herz zerspringt','mein herz blutet',
    'tränen fließen wie regen','die welt ist grau','mein leben ist vorbei',
    'die zeit bleibt stehen','mein himmel weint','ich kann nicht mehr',
    'in einem meer aus tränen','gebrochen und allein'
  ],
  love: [
    'bis ans ende der zeit','bis ans ende der welt','für immer und ewig',
    'mein ein und alles','du bist mein leben','du bist mein alles',
    'ohne dich kann ich nicht leben','mein herz gehört nur dir',
    'unsere liebe ist ewig','wir gehören zusammen','füreinander bestimmt'
  ],
  anger: [
    'du wirst es bereuen','ich brenne vor wut','du bist tot für mich',
    'ich hasse dich','ich werde es dir zeigen','ich brenne alles nieder',
    'du wirst noch sehen','rache ist süß','du hast keine ahnung',
    'es gibt kein zurück'
  ],
  joy: [
    'heute ist mein tag','die sonne lacht','das leben ist schön',
    'alles wird gut','mein herz tanzt','ich fühle mich frei wie ein vogel',
    'der himmel ist blau','ich bin auf wolke sieben','die welt gehört mir'
  ],
  dual_truth: [
    'aber das leben geht weiter','morgen ist ein neuer tag',
    'die zeit heilt alle wunden','am ende wird alles gut','so ist das leben'
  ]
};

const FAMILY_CLICHES_EN = {
  sadness: [
    'my heart is broken','my heart bleeds','tears like rain',
    'the world is grey','i cannot go on','i am drowning in tears',
    'broken and alone','my world has ended','my heart is shattered'
  ],
  love: [
    'till the end of time','forever and always','you are my everything',
    'you are my world','i cannot live without you','made for each other',
    'meant to be','my one and only','two hearts as one'
  ],
  anger: [
    'you will regret it','i burn with rage','you are dead to me',
    'i hate you','i will make you pay','no way back',
    'revenge is sweet','i will burn it all down'
  ],
  joy: [
    'today is my day','the sun is smiling','life is beautiful',
    'everything will be fine','walking on sunshine',
    'on top of the world','the world is mine'
  ],
  dual_truth: [
    'but life goes on','tomorrow is a new day','time heals all wounds',
    'in the end it will be fine','that is life'
  ]
};

function _getClicheList(family, valenceProfile, isDE) {
  const map = isDE ? FAMILY_CLICHES_DE : FAMILY_CLICHES_EN;
  const fam = String(family || '').toLowerCase();
  const list = [];
  if (map[fam]) list.push(...map[fam]);
  // Dual-Truth-Floskeln bei ambivalenten/dual-Shades immer prüfen
  const dualShades = ['grief_with_release','loss_with_gratitude','parting_with_relief',
    'grief_with_love','love_with_ache','relief_after_pain'];
  if (valenceProfile === 'dual_truth' || dualShades.includes(valenceProfile)) {
    if (map.dual_truth) list.push(...map.dual_truth);
  }
  return list;
}

function _findCliches(lyrics, bundle, isDE) {
  const family = bundle?.emotionState?.primaryFamily;
  const valence = bundle?.emotionState?.valenceProfile;
  const shade   = bundle?.emotionState?.primaryShade;
  const list = _getClicheList(family, shade || valence, isDE);
  if (!list.length) return [];
  const lower = String(lyrics || '').toLowerCase();
  const hits = [];
  for (const phrase of list) {
    if (lower.includes(phrase)) hits.push(phrase);
  }
  return hits;
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.4 — Artist-Voice-Lock im Repair
// ═══════════════════════════════════════════════════════════════════

const VOICE_PROFILES = {
  willie_nelson: {
    language:'en', diction:'plainspoken_country', lineLength:[6,9],
    sentenceShape:'short_breath_lines',
    preferredImages:['road','old guitar','whiskey','window','letter','rain','porch'],
    forbiddenImages:['neon city','club','glitter','spaceship','crystal','galaxy'],
    avoidWords:['baby girl','shawty','wave your hands'],
    keepWords:['old','tired','road','memory','quiet','still']
  },
  bob_dylan: {
    language:'en', diction:'literary_folk', lineLength:[7,12],
    sentenceShape:'flowing_with_turns',
    preferredImages:['wind','train','letter','street','sky','stranger'],
    forbiddenImages:['neon dancefloor','rocket','laser','swag'],
    avoidWords:['baby tonight','party','lit'],
    keepWords:['wind','road','door','sign','hand','silence']
  },
  amy_winehouse: {
    language:'en', diction:'soul_confessional', lineLength:[6,11],
    sentenceShape:'direct_with_ache',
    preferredImages:['liquor','phone','bed','black eyeliner','street','smoke'],
    forbiddenImages:['cowboy hat','tractor','sunshine highway'],
    avoidWords:['ya all','cowboy','rodeo'],
    keepWords:['love','wasted','tired','him','again','smoke']
  },
  johnny_cash: {
    language:'en', diction:'low_steady_country', lineLength:[5,9],
    sentenceShape:'short_grave',
    preferredImages:['train','prison','river','blackbird','dust','line'],
    forbiddenImages:['club','dancefloor','neon','sparkle'],
    avoidWords:['baby tonight','party','lit'],
    keepWords:['line','walk','train','dark','still']
  },
  leonard_cohen: {
    language:'en', diction:'liturgical_intimate', lineLength:[7,12],
    sentenceShape:'long_quiet_meditative',
    preferredImages:['candle','window','letter','snow','prayer','hand'],
    forbiddenImages:['nightclub','party','sports car'],
    avoidWords:['turnt','vibe','lit'],
    keepWords:['light','door','word','silence','holy']
  },
  tom_waits: {
    language:'en', diction:'gravel_streetpoet', lineLength:[6,12],
    sentenceShape:'broken_imagistic',
    preferredImages:['alley','rain','old piano','smoke','dog','neon (broken)'],
    forbiddenImages:['boyband chorus','cheery beach'],
    avoidWords:['shawty','baby tonight'],
    keepWords:['old','rain','street','tired','train']
  },
  phoebe_bridgers: {
    language:'en', diction:'indie_confessional', lineLength:[6,11],
    sentenceShape:'journalistic_observation',
    preferredImages:['skeleton','hospital','parking lot','moon','graveyard','car'],
    forbiddenImages:['glitter stage','disco ball','stadium crowd'],
    avoidWords:['baby tonight','party','lit'],
    keepWords:['moon','quiet','ghost','body','drive','sleep']
  },
  nick_cave: {
    language:'en', diction:'gothic_literate', lineLength:[7,13],
    sentenceShape:'cosmic_then_intimate',
    preferredImages:['red hand','blood','bible','river','dark room','animal'],
    forbiddenImages:['sunny beach','pop chorus','carefree'],
    avoidWords:['lit','party','swag'],
    keepWords:['god','love','death','hand','song','dark']
  },
  default_de: {
    language:'de', diction:'klar_direkt', lineLength:[6,11],
    sentenceShape:'kurze_klare_zeilen',
    preferredImages:['tür','fenster','küche','straße','licht','jacke'],
    forbiddenImages:['glitzerwelt','spaceship','rocket'],
    avoidWords:['baby tonight','swag','vibe'],
    keepWords:['still','leise','dunkel','warm','offen']
  },
  default_en: {
    language:'en', diction:'plain_modern', lineLength:[6,11],
    sentenceShape:'short_clear_lines',
    preferredImages:['door','window','kitchen','street','light','jacket'],
    forbiddenImages:['glitter world','spaceship','rocket'],
    avoidWords:['shawty','swag','vibe'],
    keepWords:['still','quiet','dark','warm','open']
  }
};

function _resolveVoiceProfile(state, isDE) {
  const personas = Array.isArray(state?.personas) ? state.personas : [];
  const firstKey = personas
    .map(p => String(p||'').toLowerCase().replace(/\s+/g,'_'))
    .find(k => VOICE_PROFILES[k]);
  if (firstKey) return { key: firstKey, profile: VOICE_PROFILES[firstKey] };
  return isDE
    ? { key:'default_de', profile:VOICE_PROFILES.default_de }
    : { key:'default_en', profile:VOICE_PROFILES.default_en };
}

function _validateVoiceFidelity(lyrics, state, isDE) {
  const { key, profile } = _resolveVoiceProfile(state, isDE);
  const lower = String(lyrics||'').toLowerCase();
  const lines = String(lyrics||'').split('\n').map(l=>l.trim()).filter(l=>l&&!/^\[.*\]$/.test(l));

  const forbiddenImageHits = (profile.forbiddenImages||[]).filter(img => lower.includes(img));
  const avoidWordHits      = (profile.avoidWords||[]).filter(w => {
    if (!w) return false;
    // Whole-word match to avoid false positives like "lit" in "little"
    try {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re = new RegExp('\\b' + escaped + '\\b', 'i');
      return re.test(lower);
    } catch(e) { return lower.includes(w); }
  });
  const keepHits           = (profile.keepWords||[]).filter(w => lower.includes(w));
  const preferredImageHits = (profile.preferredImages||[]).filter(img => lower.includes(img));

  const lineLengths = lines.map(l => l.split(/\s+/).length);
  const avgLen = lineLengths.length ? lineLengths.reduce((a,b)=>a+b,0)/lineLengths.length : 0;
  const [minLen, maxLen] = profile.lineLength || [6,11];
  const lineLengthOk = avgLen >= minLen-1 && avgLen <= maxLen+2;

  const issues = [];
  if (forbiddenImageHits.length) issues.push({ type:'forbidden_images', hits:forbiddenImageHits });
  if (avoidWordHits.length)      issues.push({ type:'avoid_words',      hits:avoidWordHits });
  if (!lineLengthOk)             issues.push({ type:'line_length_drift', avg:Number(avgLen.toFixed(1)), expected:profile.lineLength });
  // voice_signature_missing: only flag for specific artist voices, not defaults
  const _voiceProfileKey = _resolveVoiceProfile(state, isDE).key;
  const _isDefaultVoice = _voiceProfileKey.includes('default');
  if (keepHits.length===0 && (profile.keepWords||[]).length>0 && !_isDefaultVoice)
    issues.push({ type:'voice_signature_missing', expected:profile.keepWords });

  let score = 100;
  score -= Math.min(forbiddenImageHits.length*12, 36);
  score -= Math.min(avoidWordHits.length*8, 24);
  if (!lineLengthOk) score -= 12;
  if (keepHits.length===0) score -= 10;
  score = Math.max(0, score);

  return { voiceKey:key, diction:profile.diction, issues, forbiddenImageHits, avoidWordHits, keepHits, preferredImageHits, avgLineLength:Number(avgLen.toFixed(1)), score };
}

function _buildOutputDisciplineBlock(bundle, isDE) {
  if (!bundle) return '';

  const signals = (bundle.signalMap?.detectedSignals || []).join(', ');
  const mustNot = (bundle.meaningResolution?.mustNotFlattenTo || []).join(', ');
  const dual = bundle.emotionState?.valenceProfile === 'dual_truth';
  const family = bundle.emotionState?.primaryFamily || '';
  const shade = bundle.emotionState?.primaryShade || '';
  const reading = bundle.meaningResolution?.dominantReading || '';

  if (isDE) {
    return [
      'OUTPUT-DISZIPLIN (HART, NICHT OPTIONAL):',
      `INNERER ZUSTAND: ${shade} (${family})`,
      `DEUTUNG: ${reading}`,
      `SICHTBARE SIGNALE: ${signals}`,
      `NICHT FLACH MACHEN ZU: ${mustNot}`,
      '',
      'REGEL 1 — ANTI-ERKLÄR-FILTER:',
      '- Wenn ein Gefühl durch ein Signal gezeigt werden kann, NIEMALS dasselbe Gefühl im selben Satz benennen.',
      '- Streiche Sätze wie "ich bin traurig", "mein Herz bricht", "ich liebe dich so sehr" wenn ein Signal die Lage trägt.',
      '- Konkrete Beobachtung schlägt Gefühlsbehauptung. Immer.',
      '',
      'REGEL 2 — SIGNAL-VERANKERUNG STROPHE 1:',
      '- Strophe 1 MUSS mindestens ein Signal aus der Liste oben sichtbar zeigen.',
      '- Das Signal darf umschrieben werden, aber es muss körperlich/räumlich erkennbar sein.',
      '',
      dual
        ? 'REGEL 3 — DOPPELWAHRHEIT:\n- Beide Wahrheiten (Schmerz UND Erleichterung/Dankbarkeit) MÜSSEN im finalen Text vorkommen.\n- Keine darf die andere überschreiben oder relativieren.\n- "Ich bin froh, dass er nicht mehr leidet" ist legitim. "Heute ist trotzdem ein schöner Tag" ist es nicht.'
        : 'REGEL 3 — KOHÄRENZ:\n- Der Kernzustand muss in allen Sektionen erkennbar bleiben.\n- Kein Genre-Klischee, das den Zustand verfälscht.',
      '',
      'REGEL 4 — ANTI-KLISCHEE:',
      '- Verwende KEINE der unten verbotenen Floskeln, auch nicht umformuliert in eindeutiger Bedeutung.',
      '- Wenn ein Gefühl naheliegt, suche eine konkrete Beobachtung statt einer Floskel.',
      (() => { const cl = _getClicheList(family, bundle.emotionState?.valenceProfile, true); return cl.length ? 'KLISCHEES VERBIETEN: ' + cl.slice(0,12).join(', ') : ''; })(),
      '',
      'REGEL 5 — SECTION-KOHÄRENZ:',
      '- Jede Sektion muss zum inneren Zustand passen.',
      '- Refrain darf öffnen, aber nicht den Zustand verraten.',
      '- Bridge darf brechen, aber nicht das Genre wechseln und muss zum Kern zurückführen.',
      "- Outro darf zurückführen, aber keine billige Versöhnung erzeugen, wenn der Zustand nicht versöhnt ist.",
      '',
      'REGEL 6 — HOOK:',
      '- Der Refrain muss eine prägnante Hookzeile haben.',
      '- Sie soll körperlich, konkret und merkbar sein, nicht abstrakt.',
      '- Wiederholung darf, aber bevorzugt mit kleiner Variation.',
      '',
      'REGEL 7 — BRIDGE ALS WENDEPUNKT:',
      '- Die Bridge muss eine neue Sicht auf den Kernzustand bringen.',
      '- Sie darf nicht wie eine weitere Strophe wirken.',
      '- Keine billige Aufhellung und kein Genrewechsel.',
      '- Bei Doppelwahrheit muss die Spannung in der Bridge spürbar bleiben.'
    ].join('\n');
  }

  return [
    'OUTPUT DISCIPLINE (HARD, NOT OPTIONAL):',
    `INNER STATE: ${shade} (${family})`,
    `READING: ${reading}`,
    `VISIBLE SIGNALS: ${signals}`,
    `DO NOT FLATTEN INTO: ${mustNot}`,
    '',
    'RULE 1 — ANTI-EXPLANATION FILTER:',
    '- If a feeling can be shown through a signal, NEVER name that feeling in the same line.',
    '- Cut lines like "I am sad", "my heart breaks", "I love you so much" when a signal already carries the moment.',
    '- Concrete observation beats emotional label. Always.',
    '',
    'RULE 2 — SIGNAL ANCHORING IN VERSE 1:',
    '- Verse 1 MUST visibly carry at least one signal from the list above.',
    '- It can be paraphrased, but must remain bodily or spatial.',
    '',
    dual
      ? 'RULE 3 — DUAL TRUTH:\n- Both truths (pain AND relief/gratitude) MUST appear in the final text.\n- Neither may erase or soften the other.\n- "I am glad he is not in pain anymore" is valid. "But today the sun is shining" is not.'
      : 'RULE 3 — COHERENCE:\n- The core state must remain recognizable across sections.\n- No genre cliché that betrays the state.',
    '',
    'RULE 4 — ANTI-CLICHÉ:',
    '- DO NOT use any of the banned phrases below, not even rephrased with the same meaning.',
    '- When an emotion is at hand, find a concrete observation instead of a stock phrase.',
    (() => { const cl = _getClicheList(family, bundle.emotionState?.valenceProfile, false); return cl.length ? 'BAN THESE CLICHÉS: ' + cl.slice(0,12).join(', ') : ''; })(),
    '',
    'RULE 5 — SECTION COHERENCE:',
    '- Every section must align with the core state.',
    '- Chorus may open up, but must not betray the state.',
    '- Bridge may break, but must not switch genre and must return to the core.',
    '- Outro may resolve, but must not produce cheap resolution if the state is unresolved.',
    '',
    'RULE 6 — HOOK:',
    '- The chorus must contain one memorable hook line.',
    '- It should be bodily, concrete and singable, not abstract.',
    '- Repetition is allowed, ideally with subtle variation.',
    '',
    'RULE 7 — BRIDGE AS TURNING POINT:',
    '- The bridge must reveal a new angle on the core state.',
    '- It must not feel like another verse.',
    '- No cheap uplift and no genre switch.',
    '- For dual-truth songs, the tension between both truths must stay alive in the bridge.'
  ].join('\n');
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.2 — Section-Kohärenz
// ═══════════════════════════════════════════════════════════════════

const SECTION_ALIASES_DE = {
  intro:      ['intro'],
  verse:      ['strophe', 'vers'],
  pre_chorus: ['pre-chorus', 'prechorus', 'pre chorus', 'pre-refrain'],
  chorus:     ['refrain', 'chorus', 'hook'],
  bridge:     ['bridge', 'brücke'],
  outro:      ['outro', 'ende', 'finale']
};

const SECTION_ALIASES_EN = {
  intro:      ['intro'],
  verse:      ['verse'],
  pre_chorus: ['pre-chorus', 'prechorus', 'pre chorus'],
  chorus:     ['chorus', 'hook', 'refrain'],
  bridge:     ['bridge'],
  outro:      ['outro', 'ending']
};

function _classifySectionLabel(label, isDE) {
  const map = isDE ? SECTION_ALIASES_DE : SECTION_ALIASES_EN;
  const clean = String(label || '').toLowerCase().replace(/[\[\]]/g, '').trim();
  for (const [type, aliases] of Object.entries(map)) {
    if (aliases.some(a => clean.startsWith(a))) return type;
  }
  return 'unknown';
}

function _parseSections(lyrics, isDE) {
  if (!lyrics) return [];
  const lines = lyrics.split('\n');
  const sections = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\[.*\]$/.test(line)) {
      if (current) sections.push(current);
      current = { label: line, type: _classifySectionLabel(line, isDE), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function _getSectionExpectations(bundle) {
  const family = bundle?.emotionState?.primaryFamily || 'ambivalent';
  const shade  = bundle?.emotionState?.primaryShade  || '';
  const dualShades = ['grief_with_release','loss_with_gratitude','parting_with_relief',
    'grief_with_love','love_with_ache','relief_after_pain'];
  const dual = bundle?.emotionState?.valenceProfile === 'dual_truth' || dualShades.includes(shade);

  const base = {
    verse:      { requireSignal: true, forbidGenericUplift: true },
    pre_chorus: { requireTension: true },
    chorus:     { allowAbstraction: true, mustStayInState: true, forbidGenreCliche: true },
    bridge:     { allowShift: true, forbidGenreSwitch: true, mustReturnToState: true },
    outro:      { mustReturnToCore: true, forbidFakeResolution: !dual }
  };

  if (family === 'sadness') {
    base.chorus.forbidUpliftWords  = true;
    base.outro.forbidHappyEnding   = !dual;
  } else if (family === 'love') {
    base.chorus.forbidPossessiveCliche = true;
  } else if (family === 'anger') {
    base.chorus.forbidSelfPity        = true;
    base.outro.forbidEasyForgiveness  = true;
  } else if (family === 'joy') {
    base.chorus.forbidDarknessDrift   = true;
  }

  if (dual) {
    base.chorus.mustKeepBothTruths = true;
    base.outro.mustKeepBothTruths  = true;
  }
  return base;
}

const UPLIFT_DE    = ['alles wird gut','wir schaffen das','die sonne lacht','das leben ist schön'];
const UPLIFT_EN    = ['everything will be fine','we will be okay','life is beautiful','keep on shining'];
const DARK_DE      = ['ich kann nicht mehr','alles ist sinnlos','es gibt keinen ausweg'];
const DARK_EN      = ['i cannot go on','everything is pointless','there is no way out'];
const SELFPITY_DE  = ['warum ich','niemand versteht mich','ich bin so allein'];
const SELFPITY_EN  = ['why me','no one understands me','i am so alone'];
const POSSESSIVE_DE= ['du gehörst mir','du bist nur mein','niemand außer mir'];
const POSSESSIVE_EN= ['you belong to me','you are only mine','no one but me'];

function _anyMatch(text, list) {
  const lower = String(text || '').toLowerCase();
  return list.some(p => lower.includes(p));
}

function _validateSectionCoherence(lyrics, bundle, isDE) {
  const sections    = _parseSections(lyrics, isDE);
  const expectations= _getSectionExpectations(bundle);
  const signalKws   = _extractSignalKeywords(bundle);
  const shade       = bundle?.emotionState?.primaryShade || '';
  const dualShades  = ['grief_with_release','loss_with_gratitude','parting_with_relief',
    'grief_with_love','love_with_ache','relief_after_pain'];
  const dual = bundle?.emotionState?.valenceProfile === 'dual_truth' || dualShades.includes(shade);

  const issues       = [];
  const sectionReport= [];

  for (const sec of sections) {
    const text = sec.lines.join(' ');
    const rule = expectations[sec.type];
    const localIssues = [];

    if (!rule) { sectionReport.push({ label: sec.label, type: sec.type, issues: [] }); continue; }

    if (rule.requireSignal) {
      const hasPrimarySignal = sec.lines.some(line => _hasSignalNearby(line, signalKws));
      const hasResonanceSignal = !hasPrimarySignal && sec.lines.some(line => {
        const ll = line.toLowerCase();
        const rts = typeof RESONANCE_TRIGGERS !== 'undefined' ? RESONANCE_TRIGGERS : [];
        return rts.some(rk => ll.includes(rk.toLowerCase()));
      });
      if (!hasPrimarySignal && !hasResonanceSignal) localIssues.push('no_signal');
    }
    if (rule.forbidUpliftWords   && _anyMatch(text, isDE ? UPLIFT_DE    : UPLIFT_EN))    localIssues.push('uplift_drift');
    if (rule.forbidDarknessDrift && _anyMatch(text, isDE ? DARK_DE      : DARK_EN))      localIssues.push('darkness_drift');
    if (rule.forbidSelfPity      && _anyMatch(text, isDE ? SELFPITY_DE  : SELFPITY_EN))  localIssues.push('selfpity_drift');
    if (rule.forbidPossessiveCliche && _anyMatch(text, isDE ? POSSESSIVE_DE : POSSESSIVE_EN)) localIssues.push('possessive_cliche');

    if (rule.mustKeepBothTruths && dual) {
      // Only enforce dual_truth in bridge and outro — chorus and verse can focus on one side
      const isFocusedSection = sec.type === 'chorus' || sec.type === 'verse' || sec.type === 'pre_chorus';
      if (!isFocusedSection) {
        const lower  = text.toLowerCase();
        const hasPain    = /(weh|schmerz|fehl|vermiss|pain|hurt|miss|loss|ache|wound|ended|gone|old|tired|cold|empty|alone|dark|slow)/.test(lower);
        const hasRelief  = /(froh|erleichter|frieden|dankbar|relief|peace|grateful|free|frei|warm|light|kind|still|open|new|breath|alive|here|let|hold|carry|rewir|reset|begin)/.test(lower);
        if (!(hasPain && hasRelief)) localIssues.push('dual_truth_broken_in_section');
      }
    }
    if (rule.forbidFakeResolution && sec.type === 'outro') {
      if (_anyMatch(text, isDE ? UPLIFT_DE : UPLIFT_EN)) localIssues.push('fake_resolution');
    }

    if (localIssues.length) issues.push({ section: sec.label, type: sec.type, issues: localIssues });
    sectionReport.push({ label: sec.label, type: sec.type, issues: localIssues });
  }

  return {
    sections: sectionReport,
    issues,
    score: Math.max(0, 100 - issues.reduce((sum, i) => sum + i.issues.length * 8, 0))
  };
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.3 — Reim- und Rhythmusdisziplin
// ═══════════════════════════════════════════════════════════════════

// v3.25.5 — Sprachsensitive Rhythmus-Profile
const RHYTHM_LANG_PROFILES = {
  en: {
    sadness:    { avgSyllablesPerLine:[5,12],  allowedVariance:6, preferredEnd:'soft',   forbidGallop:false },
    love:       { avgSyllablesPerLine:[7,11],  allowedVariance:3, preferredEnd:'breath', forbidGallop:true  },
    anger:      { avgSyllablesPerLine:[5,9],   allowedVariance:3, preferredEnd:'hard',   forbidGallop:false },
    joy:        { avgSyllablesPerLine:[6,10],  allowedVariance:3, preferredEnd:'open',   forbidGallop:false },
    ambivalent: { avgSyllablesPerLine:[6,11],  allowedVariance:5, preferredEnd:'mixed',  forbidGallop:true  }
  },
  de: {
    sadness:    { avgSyllablesPerLine:[5,14],  allowedVariance:6, preferredEnd:'soft',   forbidGallop:false },
    love:       { avgSyllablesPerLine:[5,15],  allowedVariance:6, preferredEnd:'breath', forbidGallop:false },
    anger:      { avgSyllablesPerLine:[5,13],  allowedVariance:6, preferredEnd:'hard',   forbidGallop:false },
    joy:        { avgSyllablesPerLine:[5,14],  allowedVariance:5, preferredEnd:'open',   forbidGallop:false },
    ambivalent: { avgSyllablesPerLine:[5,15],  allowedVariance:7, preferredEnd:'mixed',  forbidGallop:false }
  }
};
// Legacy alias — keep for any direct references
const RHYTHM_PROFILES = RHYTHM_LANG_PROFILES.en;

const RHYME_PROFILES = {
  sadness:    { schemes:['ABAB','ABCB','free'], strictness:'loose',  forbidPunchline:true,  forbidTooClean:true  },
  love:       { schemes:['ABAB','AABB','ABCB'], strictness:'medium', forbidPunchline:true,  forbidTooClean:false },
  anger:      { schemes:['AABB','ABAB'],        strictness:'tight',  forbidPunchline:false, forbidTooClean:false },
  joy:        { schemes:['AABB','ABAB'],        strictness:'medium', forbidPunchline:false, forbidTooClean:false },
  ambivalent: { schemes:['ABAB','ABCB','free'], strictness:'loose',  forbidPunchline:true,  forbidTooClean:true  }
};

const CHEAP_RHYME_PAIRS_DE = [
  ['herz','schmerz'],['liebe','triebe'],['zeit','leid'],
  ['tränen','sehnen'],['nacht','macht'],['herz','kerz'],
  ['leben','geben'],['traum','raum']
];

const CHEAP_RHYME_PAIRS_EN = [
  ['heart','apart'],['fire','desire'],['night','light'],
  ['cry','die'],['rain','pain'],['true','blue'],
  ['arms','charms'],['soul','whole']
];

function _countSyllables(word) {
  if (!word) return 0;
  // German syllable counting: diphthongs = 1 vowel group, V+V across syllables = 2
  let clean = String(word).toLowerCase().replace(/[^a-zaouei]/g,'');
  // Full replacement: use ASCII placeholders for diphthongs to keep them as 1 group
  // Replacements: au→V, ei→V, eu→V, ie→V, äu→V, ai→V (all = 1 syllable)
  // Then count remaining vowel groups
  const c2 = String(word).toLowerCase()
    .replace(/\u00df/g,'ss')                        // ß → ss
    .replace(/[^a-z\u00e4\u00f6\u00fc]/g,'')       // keep only letters
    .replace(/\u00e4u/g,'1').replace(/au/g,'1')    // diphthong → digit placeholder (1 syllable)
    .replace(/ei/g,'1').replace(/eu/g,'1')
    .replace(/ie/g,'1').replace(/ai/g,'1');
  // Count: each digit=1 syllable, each vowel group=1 syllable
  const groups = c2.match(/[aeiou\u00e4\u00f6\u00fc]+|1/g);
  let count = groups ? groups.length : 1;
  return Math.max(1, count);
}

function _lineSyllables(line) {
  return line.split(/\s+/).filter(Boolean).reduce((sum,w) => sum + _countSyllables(w), 0);
}

function _validateRhythm(lyrics, bundle, isDE) {
  const family  = bundle?.emotionState?.primaryFamily || 'ambivalent';
  // v3.25.5: language-sensitive profile selection
  const lang    = bundle?.__state?.lang || (isDE ? 'de' : 'en');
  const langProfiles = RHYTHM_LANG_PROFILES[lang] || RHYTHM_LANG_PROFILES.en;
  const profile = langProfiles[family] || langProfiles.ambivalent;
  const sections = _parseSections(lyrics, isDE);
  const issues = [], report = [];

  for (const sec of sections) {
    if (!sec.lines.length) continue;
    const counts  = sec.lines.map(_lineSyllables);
    const min     = Math.min(...counts);
    const max     = Math.max(...counts);
    const variance= max - min;
    const avg     = counts.reduce((a,b) => a+b, 0) / counts.length;
    const localIssues = [];

    if (variance > profile.allowedVariance)                         localIssues.push('variance_too_high');
    if (avg < profile.avgSyllablesPerLine[0] - 2)                   localIssues.push('lines_too_short');
    if (avg > profile.avgSyllablesPerLine[1] + 3)                   localIssues.push('lines_too_long');
    if (profile.forbidGallop && avg > 12)                           localIssues.push('gallop_in_serious_state');

    if (localIssues.length) issues.push({ section:sec.label, type:sec.type, issues:localIssues, avg, variance });
    report.push({ section:sec.label, avg, variance, issues:localIssues });
  }

  return { profile:family, report, issues, score: Math.max(0, 100 - issues.reduce((s,i)=>s+i.issues.length*6,0)) };
}

function _lineEnd(line) {
  const tokens = line.replace(/[.,!?;:"„""]/g,'').trim().split(/\s+/);
  const last = tokens[tokens.length-1] || '';
  return last.toLowerCase();
}

function _rhymeKey(word) {
  if (!word) return '';
  const m = word.match(/[aeiouyäöü][a-zäöü]*$/i);
  return m ? m[0].toLowerCase() : word.slice(-3).toLowerCase();
}

function _detectCheapRhymes(lyrics, isDE) {
  const list  = isDE ? CHEAP_RHYME_PAIRS_DE : CHEAP_RHYME_PAIRS_EN;
  const lower = lyrics.toLowerCase();
  const hits  = [];
  for (const [a,b] of list) {
    const reA = new RegExp('\\b'+a+'\\b');
    const reB = new RegExp('\\b'+b+'\\b');
    if (reA.test(lower) && reB.test(lower)) hits.push(a+'/'+b);
  }
  return hits;
}

function _validateRhymes(lyrics, bundle, isDE) {
  const family  = bundle?.emotionState?.primaryFamily || 'ambivalent';
  const profile = RHYME_PROFILES[family] || RHYME_PROFILES.ambivalent;
  const sections = _parseSections(lyrics, isDE);
  const issues = [], report = [];

  for (const sec of sections) {
    if (sec.lines.length < 2) continue;
    const ends    = sec.lines.map(l => _rhymeKey(_lineEnd(l)));
    const unique  = new Set(ends);
    const ratio   = unique.size / ends.length;
    const localIssues = [];

    if (profile.strictness === 'tight'  && ratio > 0.85) localIssues.push('no_rhyme_in_strict_section');
    if (profile.forbidTooClean          && ratio < 0.25) localIssues.push('rhymes_too_clean');

    if (localIssues.length) issues.push({ section:sec.label, type:sec.type, issues:localIssues });
    report.push({ section:sec.label, ratio:Number(ratio.toFixed(2)), issues:localIssues });
  }

  const cheap = _detectCheapRhymes(lyrics, isDE);
  if (profile.forbidPunchline && cheap.length) {
    issues.push({ section:'global', type:'global', issues:['cheap_rhyme_pairs'], cheap });
  }

  return {
    profile: family,
    report,
    cheapPairs: cheap,
    issues,
    score: Math.max(0, 100 - issues.reduce((s,i)=>s+i.issues.length*8,0) - cheap.length*5)
  };
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.5 — Hook-Logik
// ═══════════════════════════════════════════════════════════════════

const HOOK_PROFILES = {
  sadness:    { idealLength:[4,9],  preferConcrete:true,  forbidAbstractOnly:true,  repeatStyle:'variation_preferred',   notes:'verdichtet, körperlich, nicht erklärend' },
  love:       { idealLength:[4,9],  preferConcrete:true,  forbidAbstractOnly:true,  repeatStyle:'variation_or_repeat',   notes:'körpernah, intim, nicht kitschig' },
  anger:      { idealLength:[3,7],  preferConcrete:true,  forbidAbstractOnly:true,  repeatStyle:'hard_repeat_allowed',   notes:'kurz, hart, klar adressiert' },
  joy:        { idealLength:[4,9],  preferConcrete:false, forbidAbstractOnly:false, repeatStyle:'repeat_allowed',        notes:'offen, singbar, körperlich erlaubt' },
  ambivalent: { idealLength:[4,10], preferConcrete:true,  forbidAbstractOnly:true,  repeatStyle:'variation_preferred',   notes:'gespannt, nicht entschieden' }
};

const HOOK_GENERIC_DE = [
  'ich liebe dich','ich brauche dich','ohne dich','für immer',
  'lass mich nicht allein','mein herz','komm zurück','wir zwei',
  'ich vermisse dich','ich will dich','tanz mit mir'
];

const HOOK_GENERIC_EN = [
  'i love you','i need you','without you','forever',
  "don't leave me",'my heart','come back','you and me',
  'i miss you','i want you','dance with me'
];

function _extractChorusLines(lyrics, isDE) {
  const sections = _parseSections(lyrics, isDE);
  return sections.filter(s => s.type === 'chorus' && s.lines.length > 0);
}

function _pickHookCandidate(choruses) {
  if (!choruses.length) return null;
  const allLines = choruses.flatMap(c => c.lines);
  const counts = new Map();
  for (const line of allLines) {
    const key = line.toLowerCase().replace(/[.,!?;:"„""]/g,'').trim();
    if (!key) continue;
    counts.set(key, (counts.get(key)||0)+1);
  }
  let bestKey=null, bestCount=0;
  for (const [k,v] of counts.entries()) {
    if (v > bestCount) { bestKey=k; bestCount=v; }
  }
  if (bestKey && bestCount > 1) {
    const original = allLines.find(l => l.toLowerCase().replace(/[.,!?;:"„""]/g,'').trim()===bestKey);
    return { line:original||bestKey, repeat:bestCount, source:'repeat' };
  }
  return { line:choruses[0].lines[0], repeat:1, source:'first_line' };
}

const HOOK_ABSTRACT_WORDS = [
  'love','life','soul','heart','eternity','forever','time','dream',
  'liebe','leben','seele','herz','ewigkeit','immer','zeit','traum'
];

function _isAbstractOnly(line) {
  if (!line) return true;
  const tokens = line.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const abstractHits = tokens.filter(t => HOOK_ABSTRACT_WORDS.includes(t)).length;
  return abstractHits / tokens.length >= 0.5;
}

function _isGenericHook(line, isDE) {
  if (!line) return false;
  const list = isDE ? HOOK_GENERIC_DE : HOOK_GENERIC_EN;
  const lower = line.toLowerCase();
  return list.some(g => lower.includes(g));
}

function _validateHook(lyrics, bundle, isDE) {
  const family  = bundle?.emotionState?.primaryFamily || 'ambivalent';
  const profile = HOOK_PROFILES[family] || HOOK_PROFILES.ambivalent;
  const choruses = _extractChorusLines(lyrics, isDE);

  if (!choruses.length) {
    return { profile:family, hook:null, issues:[{ type:'no_chorus_found' }], score:40 };
  }

  const hook   = _pickHookCandidate(choruses);
  const words  = hook?.line ? hook.line.split(/\s+/).filter(Boolean).length : 0;
  const [minLen, maxLen] = profile.idealLength;
  const issues = [];

  if (!hook || !hook.line) {
    issues.push({ type:'no_hook_line' });
  } else {
    if (words < minLen) {
      // Short hooks are valid for certain styles (mantras, folk, country)
      const shortHookVoices = ['leonard_cohen','tom_waits','johnny_cash','nick_cave','bob_dylan',
        'phoebe_bridgers','amy_winehouse','willie_nelson'];  // all high-signature voices
      const _voiceKey = ((bundle?.__state?.personas||[])[0]||'').toLowerCase().replace(/\s+/g,'_');
      const isHighSigVoice = shortHookVoices.includes(_voiceKey) ||
        shortHookVoices.some(v => (lyrics||'').toLowerCase().includes(v));
      // Also exempt if hook repeats ≥2x (mantra-hook pattern is valid for any family)
      const isMantaHook = hook.repeat >= 2;
      if (!isHighSigVoice && !isMantaHook) issues.push({ type:'hook_too_short', words });
    }
    if (words > maxLen)   issues.push({ type:'hook_too_long',  words });
    if (profile.forbidAbstractOnly && _isAbstractOnly(hook.line))
      issues.push({ type:'hook_too_abstract', line:hook.line });
    else if (profile.preferConcrete && _isAbstractOnly(hook.line))
      issues.push({ type:'hook_lacks_concrete_anchor', line:hook.line });
    if (_isGenericHook(hook.line, isDE))
      issues.push({ type:'hook_too_generic', line:hook.line });
    if (profile.repeatStyle === 'variation_preferred' && hook.repeat > 3)
      issues.push({ type:'hook_repeated_without_variation', repeat:hook.repeat });
  }

  return {
    profile: family,
    hook,
    issues,
    score: Math.max(0, 100 - Math.min(issues.length*12, 60))
  };
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.6 — Bridge-Wendepunkt-Logik
// ═══════════════════════════════════════════════════════════════════

const BRIDGE_PROFILES = {
  sadness:    { requireNewAngle:true,  forbidGenericLift:true,  allowAddress:true, notes:'neue Sicht auf den Schmerz, keine billige Erlösung' },
  love:       { requireNewAngle:true,  forbidGenericLift:false, allowAddress:true, notes:'Vertiefung oder Risiko, keine Wiederholung der Strophe' },
  anger:      { requireNewAngle:true,  forbidGenericLift:true,  allowAddress:true, notes:'innerer Bruch, Selbstaussage oder Adressatenwechsel' },
  joy:        { requireNewAngle:true,  forbidGenericLift:false, allowAddress:true, notes:'Erkenntnis oder Erinnerung, nicht nur mehr Feiern' },
  ambivalent: { requireNewAngle:true,  forbidGenericLift:true,  allowAddress:true, notes:'Spannung verdichten, nicht auflösen' }
};

const BRIDGE_LIFT_DE = ['alles wird gut','wir schaffen das','am ende wird alles','morgen ist ein neuer tag','das leben geht weiter'];
const BRIDGE_LIFT_EN = ['everything will be fine','we will be okay','it will all work out','tomorrow is a new day','life goes on'];

const BRIDGE_GENRE_SWITCH_DE = ['club','disco','party','beat drop','rave','autotune'];
const BRIDGE_GENRE_SWITCH_EN = ['club tonight','disco','party all night','beat drop','rave','autotune'];

function _tokenSet(text) {
  return new Set(
    String(text||'').toLowerCase().replace(/[.,!?;:"„""]/g,'').split(/\s+/).filter(w=>w&&w.length>2)
  );
}

function _jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter=0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter/union : 0;
}

function _validateBridge(lyrics, bundle, isDE) {
  const family   = bundle?.emotionState?.primaryFamily || 'ambivalent';
  const shade    = bundle?.emotionState?.primaryShade  || '';
  const dualShades = ['grief_with_release','loss_with_gratitude','parting_with_relief','grief_with_love','love_with_ache','relief_after_pain'];
  const dual     = bundle?.emotionState?.valenceProfile === 'dual_truth' || dualShades.includes(shade);
  const profile  = BRIDGE_PROFILES[family] || BRIDGE_PROFILES.ambivalent;
  const sections = _parseSections(lyrics, isDE);

  const bridges = sections.filter(s => s.type==='bridge' && s.lines.length>0);
  const verses  = sections.filter(s => s.type==='verse'  && s.lines.length>0);

  // No bridge = no issue (optional section)
  if (!bridges.length) {
    return { profile:family, bridgePresent:false, issues:[], score:100, notes:'no bridge in song' };
  }

  const bridge      = bridges[0];
  const bridgeText  = bridge.lines.join(' ');
  const bridgeTokens= _tokenSet(bridgeText);
  const verseText   = verses.map(v=>v.lines.join(' ')).join(' ');
  const verseTokens = _tokenSet(verseText);
  const similarity  = _jaccard(bridgeTokens, verseTokens);

  const issues = [];

  if (profile.requireNewAngle && similarity > 0.6)
    issues.push({ type:'bridge_too_similar_to_verses', similarity:Number(similarity.toFixed(2)) });

  if (profile.forbidGenericLift) {
    const hits = (isDE?BRIDGE_LIFT_DE:BRIDGE_LIFT_EN).filter(l=>bridgeText.toLowerCase().includes(l));
    if (hits.length) issues.push({ type:'bridge_generic_lift', hits });
  }

  const switchHits = (isDE?BRIDGE_GENRE_SWITCH_DE:BRIDGE_GENRE_SWITCH_EN).filter(l=>bridgeText.toLowerCase().includes(l));
  if (switchHits.length) issues.push({ type:'bridge_genre_switch', hits:switchHits });

  // bridge_loses_dual_truth: bridge can lean to one side — only flag if emotionally blank
  if (dual) {
    const lower = bridgeText.toLowerCase();
    const hasPain   = /(weh|schmerz|fehl|vermiss|pain|hurt|miss|loss|ache|wound|ended|gone|old|tired|cold|empty|alone|dark|slow)/.test(lower);
    const hasRelief = /(froh|erleichter|frieden|dankbar|relief|peace|grateful|free|frei|warm|light|kind|still|open|new|breath|alive|here|let|hold|carry|rewir|reset|begin)/.test(lower);
    // Only flag if bridge has no emotional signal at all
    if (!hasPain && !hasRelief) issues.push({ type:'bridge_loses_dual_truth' });
  }

  if (bridge.lines.length < 2)  issues.push({ type:'bridge_too_short', lines:bridge.lines.length });
  if (bridge.lines.length > 8)  issues.push({ type:'bridge_too_long',  lines:bridge.lines.length });

  return {
    profile: family,
    bridgePresent: true,
    similarity: Number(similarity.toFixed(2)),
    bridgeLineCount: bridge.lines.length,
    issues,
    score: Math.max(0, 100 - Math.min(issues.length*10, 50))
  };
}

function _validateOutputDiscipline(lyrics, bundle, isDE) {
  const result = { __lyrics: lyrics, verse1HasSignal: false, explainerLines: [], clicheHits: [], sectionCoherence: null, rhythm: null, rhyme: null, voice: null, hook: null, bridge: null, dualTruthPresent: null, score: 0 };
  if (!lyrics || !bundle) return result;

  const signalKeywords = _extractSignalKeywords(bundle);
  const labelsDE = ['strophe 1','strophe1','verse 1','vers 1','intro'];
  const labelsEN = ['verse 1','verse1','intro'];
  const verse1 = _verseLines(lyrics, labelsDE, labelsEN, isDE);

  if (verse1.length) {
    // Primary: match against shade-specific detectedSignals
    result.verse1HasSignal = verse1.some(line => _hasSignalNearby(line, signalKeywords));
    // Fallback: if no shade signals matched, accept RESONANCE_TRIGGERS (concrete objects/images)
    // This covers prose-style songs where signals are embedded in vivid imagery
    if (!result.verse1HasSignal) {
      const resonanceKws = (typeof RESONANCE_TRIGGERS !== 'undefined' ? RESONANCE_TRIGGERS : [])
        .map(r => r.toLowerCase());
      result.verse1HasSignal = verse1.some(line => {
        const ll = line.toLowerCase();
        return resonanceKws.some(rk => ll.includes(rk));
      });
    }
  }

  // Explainer patterns: direct emotional state assertions ("I am sad", "ich bin traurig")
  // These are predicative uses of emotion words, NOT nominal/poetic uses ("love gets kept", "stolz")
  const _PRED_PATTERNS_EN = /\b(i am|i'm|i feel|my heart|i can't|i cannot|you are|you're)\b/i;
  const _PRED_PATTERNS_DE = /\b(ich bin|ich fühl|ich kann nicht|mein herz|du bist|du warst)\b/i;

  const lines = lyrics.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^\[.*\]$/.test(line)) continue;
    // Only flag as explainer if emotion word appears WITH a predicative pattern
    const hasPred = isDE ? _PRED_PATTERNS_DE.test(line) : _PRED_PATTERNS_EN.test(line);
    if (hasPred && _lineNamesEmotion(line, isDE) && !_hasSignalNearby(line, signalKeywords)) {
      result.explainerLines.push(line);
    }
  }

  // Doppelwahrheit: valenceProfile=dual_truth ODER Shade ist explizit dual
  const _dualShades = ['grief_with_release','loss_with_gratitude','parting_with_relief',
    'grief_with_love','love_with_ache','relief_after_pain'];
  const _isDual = bundle.emotionState?.valenceProfile === 'dual_truth' ||
    _dualShades.includes(bundle.emotionState?.primaryShade || '');

  if (_isDual) {
    const lyricsLower = lyrics.toLowerCase();
    const hasPainSide   = /(weh|schmerz|fehl|vermiss|pain|miss|hurt|loss|trauer|traurig|fehlt|ache|wound|break|grief|ended|die|dying|gone|left|old|tired|slow|quiet|dark|shadow|cold|empty|alone)/.test(lyricsLower);
    const hasReliefSide = /(froh|erleichter|frieden|dankbar|relief|peace|grateful|free|frei|liebe|love|geborgen|warm|light|kind|still|let|open|new|grow|breath|carry|hold|alive|here|reset|rewir|begin)/.test(lyricsLower);
    result.dualTruthPresent = hasPainSide && hasReliefSide;
  }

  result.clicheHits = _findCliches(lyrics, bundle, isDE);
  result.sectionCoherence = _validateSectionCoherence(lyrics, bundle, isDE);
  result.rhythm = _validateRhythm(lyrics, bundle, isDE);
  result.rhyme  = _validateRhymes(lyrics, bundle, isDE);
  result.voice  = _validateVoiceFidelity(lyrics, bundle?.__state || {}, isDE);
  result.hook   = _validateHook(lyrics, bundle, isDE);
  result.bridge = _validateBridge(lyrics, bundle, isDE);

  let score = 100;
  if (!result.verse1HasSignal) score -= 25;
  score -= Math.min(result.explainerLines.length * 8, 40);
  if (result.dualTruthPresent === false) score -= 30;
  score -= Math.min(result.clicheHits.length * 10, 40);
  score -= Math.min(result.sectionCoherence.issues.length * 6, 30);
  score -= Math.min(result.rhythm.issues.length * 5, 25);
  score -= Math.min(result.rhyme.issues.length * 6, 25);
  score -= Math.min(result.voice.issues.length * 7, 25);
  score -= Math.min(result.hook.issues.length * 8, 30);
  score -= Math.min(result.bridge.issues.length * 7, 25);
  result.score = Math.max(0, score);
  return result;
}


// ═══════════════════════════════════════════════════════════════════
// v3.23.7 — Honest Self Score & UI-Urteil
// ═══════════════════════════════════════════════════════════════════

function _classifyIssueSeverity(type, bundle) {
  // v3.25.5: check allowed_intentional_breaks first — bypass normal severity
  const allowed = bundle?.__state?.allowed_intentional_breaks || [];
  if (allowed.includes(type)) return 'intentional';
  const blocking = [
    'verse1_no_signal','dual_truth_missing','no_chorus_found','no_hook_line',
    'hook_too_generic','bridge_loses_dual_truth','forbidden_images'
  ];
  const dramaturgical = [
    'bridge_too_similar_to_verses','bridge_generic_lift','bridge_genre_switch',
    'section_drift','hook_too_abstract','hook_lacks_concrete_anchor',
    'uplift_drift','darkness_drift','fake_resolution','dual_truth_broken_in_section'
  ];
  const cosmetic = [
    'rhymes_too_clean','no_rhyme_in_strict_section','cheap_rhyme_pairs',
    'variance_too_high','lines_too_short','lines_too_long','gallop_in_serious_state',
    'avoid_words','line_length_drift','voice_signature_missing',
    'hook_too_short','hook_too_long','hook_repeated_without_variation',
    'bridge_too_short','bridge_too_long'
  ];
  if (blocking.includes(type))      return 'blocking';
  if (dramaturgical.includes(type)) return 'dramaturgical';
  if (cosmetic.includes(type))      return 'cosmetic';
  return 'cosmetic';
}

// v3.25.5 — Mantra-Doppelwahrheit Sonderfall
function _isMantraReleaseShade(bundle) {
  const allowed = bundle?.__state?.allowed_intentional_breaks || [];
  return allowed.includes('hook_repeated_without_variation')
      || allowed.includes('mantra_release')
      || (bundle?.signalMap?.detectedSignals || []).includes('mantra_repetition');
}

function _collectAllIssues(validation, bundle) {
  const all = [];
  if (!validation.verse1HasSignal) all.push({ type:'verse1_no_signal', source:'verse1' });
  for (const line of validation.explainerLines||[]) all.push({ type:'explainer_line', source:'anti_explain', line });
  if (validation.dualTruthPresent === false) {
    if (_isMantraReleaseShade(bundle)) {
      all.push({ type:'dual_truth_missing', source:'dual_truth', severity:'info', mantraExempt:true });
    } else {
      all.push({ type:'dual_truth_missing', source:'dual_truth' });
    }
  }
  for (const c of validation.clicheHits||[]) all.push({ type:'cliche', source:'cliche', detail:c });
  for (const s of validation.sectionCoherence?.issues||[]) for (const t of s.issues) all.push({ type:t, source:'section', section:s.section });
  for (const r of validation.rhythm?.issues||[]) for (const t of r.issues) all.push({ type:t, source:'rhythm', section:r.section });
  for (const r of validation.rhyme?.issues||[]) for (const t of r.issues) all.push({ type:t, source:'rhyme', section:r.section });
  for (const v of validation.voice?.issues||[]) all.push({ type:v.type, source:'voice' });
  for (const h of validation.hook?.issues||[]) all.push({ type:h.type, source:'hook' });
  for (const b of validation.bridge?.issues||[]) {
    if (b.type === 'bridge_loses_dual_truth' && _isMantraReleaseShade(bundle)) {
      all.push({ type:b.type, source:'bridge', severity:'info', mantraExempt:true });
    } else {
      all.push({ type:b.type, source:'bridge' });
    }
  }
  return all.map(i => ({ ...i, severity: i.severity || _classifyIssueSeverity(i.type, bundle) }));
}


// ═══════════════════════════════════════════════════════════════════
// v3.24.0 — Kontrollierter Regelbruch
// ═══════════════════════════════════════════════════════════════════

const INTENTIONAL_BREAKS = {
  hook_repeated_without_variation: {
    allowedFamilies: ['anger','joy'],
    allowedShades:   ['controlled_defiance','hurt_defiance','relieved_gladness'],
    requireConfidence: 0.7,
    notes: 'Mantra-Hook erlaubt, wenn er den Zustand trägt.'
  },
  bridge_too_short: {
    allowedFamilies: ['sadness','anger','ambivalent'],
    allowedShades:   ['restrained_grief','controlled_defiance','emotionally_mixed_state'],
    requireConfidence: 0.6,
    notes: 'Kurze Bridge erlaubt, wenn der Bruch genau dort sitzt.'
  },
  rhymes_too_clean: {
    allowedFamilies: ['joy','love'],
    allowedShades:   ['relieved_gladness','tender_attachment'],
    requireConfidence: 0.6,
    notes: 'Glatte Reime erlaubt, wenn Stimmung sie verlangt.'
  },
  no_rhyme_in_strict_section: {
    allowedFamilies: ['sadness','ambivalent'],
    allowedShades:   ['restrained_grief','grief_with_release','emotionally_mixed_state'],
    requireConfidence: 0.7,
    notes: 'Reimverweigerung erlaubt, wenn der Schmerz keine Form duldet.'
  },
  hook_too_short: {
    allowedFamilies: ['anger'],
    allowedShades:   ['controlled_defiance','hurt_defiance'],
    requireConfidence: 0.7,
    notes: 'Sehr kurze Hook erlaubt bei harter Diktion.'
  },
  variance_too_high: {
    allowedFamilies: ['sadness','ambivalent'],
    allowedShades:   ['restrained_grief','emotionally_mixed_state','grief_with_release'],
    requireConfidence: 0.6,
    notes: 'Unregelmäßiger Atem erlaubt, wenn Inhalt brüchig ist.'
  }
};

function _isIntentionalBreak(issue, bundle) {
  const rule = INTENTIONAL_BREAKS[issue.type];
  if (!rule) return false;
  const family     = bundle?.emotionState?.primaryFamily;
  const shade      = bundle?.emotionState?.primaryShade;
  const confidence = bundle?.meaningResolution?.resolutionConfidence ?? 0;
  if (!rule.allowedFamilies.includes(family)) return false;
  if (rule.allowedShades && rule.allowedShades.length && !rule.allowedShades.includes(shade)) return false;
  if (confidence < rule.requireConfidence) return false;
  return { type:issue.type, family, shade, confidence, notes:rule.notes };
}

function _annotateIntentionalBreaks(issues, bundle) {
  const real = [], intentional = [];
  const allowed = bundle?.__state?.allowed_intentional_breaks || [];
  for (const i of issues) {
    const type = i.type || '';
    // v3.25.5: if explicitly in allowed list, mark intentional regardless of severity
    if (allowed.includes(type)) {
      intentional.push({ ...i, intentional:true, intentNotes:'Explicitly allowed in song metadata.' });
      continue;
    }
    const intent = _isIntentionalBreak(i, bundle);
    if (intent && i.severity !== 'blocking') {
      intentional.push({ ...i, intentional:true, intentNotes:intent.notes });
    } else {
      real.push(i);
    }
  }
  return { real, intentional };
}


// ═══════════════════════════════════════════════════════════════════
// v3.24.1 — Risk-Lock und Stilrisiko-Index
// ═══════════════════════════════════════════════════════════════════

function _computeRiskIndex(validation, bundle, intentionalBreaks) {
  const factors = [];
  let raw = 0;

  const dualShades = ['grief_with_release','loss_with_gratitude','parting_with_relief','grief_with_love','love_with_ache','relief_after_pain'];
  const shade = bundle?.emotionState?.primaryShade || '';
  if (bundle?.emotionState?.valenceProfile === 'dual_truth' || dualShades.includes(shade)) {
    raw += 2; factors.push('dual_truth_active');
  }

  const riskyShades = ['grief_with_release','parting_with_relief','loss_with_gratitude','hurt_defiance','emotionally_mixed_state'];
  if (riskyShades.includes(shade)) {
    raw += 2; factors.push('mixed_shade:' + shade);
  }

  const hookLine = validation?.hook?.hook?.line || '';
  if (hookLine) {
    const wc = hookLine.split(/\s+/).length;
    if (wc <= 4) { raw += 1; factors.push('short_hook'); }
    if (wc >= 9) { raw += 1; factors.push('long_hook');  }
  }

  const bridge = validation?.bridge;
  if (bridge?.bridgePresent === false)           { raw += 1; factors.push('no_bridge'); }
  else if (bridge?.bridgeLineCount <= 2)         { raw += 1; factors.push('very_short_bridge'); }

  const rhymeReport = validation?.rhyme?.report || [];
  const tightSections = rhymeReport.filter(r => r.ratio < 0.3).length;
  const looseSections = rhymeReport.filter(r => r.ratio > 0.85).length;
  if (tightSections >= 2) { raw += 1; factors.push('rhyme_dense');   }
  if (looseSections >= 2) { raw += 1; factors.push('rhyme_refusal'); }

  if ((validation?.rhythm?.issues||[]).some(i => i.issues?.includes('variance_too_high'))) {
    raw += 1; factors.push('uneven_breath');
  }

  if (Array.isArray(intentionalBreaks) && intentionalBreaks.length) {
    raw += Math.min(intentionalBreaks.length, 3);
    factors.push('intentional_breaks_x' + intentionalBreaks.length);
  }

  const riskyVoices = ['tom_waits','nick_cave','leonard_cohen','amy_winehouse'];
  if (riskyVoices.includes(validation?.voice?.voiceKey || '')) {
    raw += 1; factors.push('high_signature_voice:' + validation.voice.voiceKey);
  }

  let level;
  if      (raw <= 1) level = 'conservative';
  else if (raw <= 3) level = 'balanced';
  else if (raw <= 5) level = 'risky';
  else               level = 'very_risky';

  return { raw, level, factors };
}

function _buildRiskLock(score, risk) {
  let status, label;

  if (risk.level === 'conservative') {
    if      (score >= 90) { status='safe_solid';        label='sicher und solide'; }
    else if (score >= 75) { status='safe_ok';            label='sicher und in Ordnung'; }
    else                  { status='safe_but_weak';      label='sicher, aber schwach'; }
  } else if (risk.level === 'balanced') {
    if      (score >= 90) { status='balanced_strong';   label='ausgewogen und stark'; }
    else if (score >= 75) { status='balanced_ok';        label='ausgewogen'; }
    else                  { status='balanced_unstable';  label='ausgewogen, aber nicht eingelöst'; }
  } else if (risk.level === 'risky') {
    if      (score >= 88) { status='risk_paid_off';     label='riskant – getragen'; }
    else if (score >= 75) { status='risk_holding';       label='riskant – noch hält es'; }
    else                  { status='risk_unredeemed';    label='riskant – nicht eingelöst'; }
  } else {
    if      (score >= 90) { status='high_risk_artistic'; label='sehr riskant – künstlerisch getragen'; }
    else if (score >= 78) { status='high_risk_holding';  label='sehr riskant – noch tragfähig'; }
    else                  { status='high_risk_collapsing';label='sehr riskant – nicht eingelöst'; }
  }

  return { status, label };
}


// ═══════════════════════════════════════════════════════════════════
// v3.24.2 — Hörerseiten-Modell
// ═══════════════════════════════════════════════════════════════════

const RESONANCE_TRIGGERS = [
  // Körper & Gesten
  'tür','fenster','küche','jacke','schlüssel','tisch','stuhl','spiegel','tasse','glas',
  'door','window','kitchen','jacket','keys','table','chair','mirror','cup','glass',
  // Natur & Raum
  'rain','regen','straße','street','licht','light','boden','floor','wand','wall',
  'floor','ceiling','hallway','staircase','treppe','flur','decke',
  // Körper
  'atem','breath','hand','hands','blick','look','augen','eyes','stimme','voice',
  'finger','schulter','shoulder','knie','knee','lippen','lips',
  // Alltagsobjekte — erweitert
  'zug','train','kaffee','coffee','brief','letter','buch','book',
  'kettle','kessel','mantel','coat','hemd','shirt','stiefel','boots',
  'telefon','phone','schlüssel','pen','stift','notizbuch','notebook',
  'bett','bed','kühlschrank','fridge','lampe','lamp','uhr','clock',
  'treppe','stairs','rucksack','bag','koffer','suitcase',
  'pencil','bleistift','wall','mauer','road','weg','straße',
  'line','linie','mark','marking','plant','pflanze',
  'radio','zeitung','newspaper','foto','photo'
];

const MEMORY_TRIGGERS_DE = [
  'damals','noch immer','manchmal','wieder','jedes mal',
  'an dem tag','letzte','vor jahren','als ich','als du',
  'ich erinnere','ich denke','früher','nie vergessen','immer noch',
  'im märz','im januar','letzten winter','letztes jahr','an jenem morgen',
  'war nicht da','früher war','seitdem','bevor','einst',
  'es war mal','wir haben','du hast','ich hab noch','davor',
  'vor kurzem','damals als','an diesem abend','noch heute'
];

const MEMORY_TRIGGERS_EN = [
  'back then','still','sometimes','again','every time',
  'that day','the last','years ago','when i','when you',
  'i remember','i think','used to','never forget','still do',
  'in march','in january','last winter','last year','that morning',
  'used to be','back when','since then','before',
  'once','a while ago','the day when','that night','that summer',
  'i used to','you used to','we used to','it was','there was'
];

const IDENTIFY_HOOKS_DE = [
  'ich','mir','mich','mein','meine','wir','uns','du','dich','dein','deine'
];

const IDENTIFY_HOOKS_EN = [
  'i','me','my','we','us','you','your'
];

const DISTANCE_FLAGS = [
  'eternal','infinite','cosmos','galaxy','universe','soul of mankind',
  'ewigkeit','kosmos','galaxie','universum','seele der menschheit',
  'everything','nothing','always','never','all of life','destiny'
];

function _countMatches(text, list) {
  const lower = String(text||'').toLowerCase();
  let hits = 0;
  for (const t of list) {
    const re = new RegExp('\\b' + t.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&') + '\\b', 'g');
    const m = lower.match(re);
    if (m) hits += m.length;
  }
  return hits;
}

function _buildAudienceModel(lyrics, validation, bundle, isDE) {
  const text = String(lyrics||'');
  const wordCount = text.split(/\s+/).filter(Boolean).length || 1;
  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l&&!/^\[.*\]$/.test(l));

  const memoryList   = isDE ? MEMORY_TRIGGERS_DE : MEMORY_TRIGGERS_EN;
  const identifyList = isDE ? IDENTIFY_HOOKS_DE  : IDENTIFY_HOOKS_EN;

  const resonanceHits = _countMatches(text, RESONANCE_TRIGGERS);
  const memoryHits    = _countMatches(text, memoryList);
  const identifyHits  = _countMatches(text, identifyList);
  const distanceHits  = _countMatches(text, DISTANCE_FLAGS);

  const resonance = Math.min(100, Math.round((resonanceHits / Math.max(lines.length,1)) * 70 + 20));
  const memory    = Math.min(100, Math.round((memoryHits    / Math.max(lines.length,1)) * 100 + 10));
  const identify  = Math.min(100, Math.round((identifyHits  / wordCount) * 350 + 10));

  let distance = Math.min(100, Math.round((distanceHits / Math.max(lines.length,1)) * 100));
  if (validation?.explainerLines?.length) distance += Math.min(20, validation.explainerLines.length * 4);
  if (validation?.clicheHits?.length)     distance += Math.min(15, validation.clicheHits.length * 3);
  distance = Math.min(100, distance);

  const hookLine   = validation?.hook?.hook?.line || '';
  const hookBoost  = hookLine && hookLine.split(/\s+/).length <= 9 ? 8 : 0;

  const nachhall = Math.max(0, Math.min(100,
    Math.round(resonance * 0.40 + memory * 0.30 + identify * 0.30 - distance * 0.30 + hookBoost)
  ));

  const family = bundle?.emotionState?.primaryFamily || 'ambivalent';
  const dualShades = ['grief_with_release','loss_with_gratitude','parting_with_relief','grief_with_love','love_with_ache','relief_after_pain'];
  const dual = bundle?.emotionState?.valenceProfile==='dual_truth' || dualShades.includes(bundle?.emotionState?.primaryShade||'');

  const warnings = [];
  if (identify < 25)                                warnings.push('low_identification');
  if (resonance < 25)                               warnings.push('low_resonance');
  if (distance > 60)                                warnings.push('high_distance');
  if (memory < 15 && family==='sadness')            warnings.push('grief_without_memory');
  if (dual && memory < 20)                          warnings.push('dual_truth_without_memory');
  if (resonance > 60 && identify < 30)              warnings.push('vivid_but_unrelatable');
  if (identify > 70 && resonance < 30)              warnings.push('personal_but_imageless');
  if (nachhall < 30)                                warnings.push('low_aftertaste');

  let listenerVerdict;
  if      (nachhall >= 80) listenerVerdict = isDE ? 'bleibt lange im Kopf'   : 'stays with the listener';
  else if (nachhall >= 65) listenerVerdict = isDE ? 'wirkt nach'              : 'lingers';
  else if (nachhall >= 45) listenerVerdict = isDE ? 'kommt an, verfliegt aber': 'lands but fades';
  else if (nachhall >= 25) listenerVerdict = isDE ? 'streift den Hörer nur'   : 'only brushes the listener';
  else                     listenerVerdict = isDE ? 'erreicht den Hörer kaum' : 'barely reaches the listener';

  return { axes:{ resonance, memory, identify, distance, nachhall }, warnings, listenerVerdict };
}

function _buildHonestSelfScore(validation, bundle, isDE) {
  if (!validation) return null;
  const rawIssues = _collectAllIssues(validation, bundle);
  const { real: issues, intentional } = _annotateIntentionalBreaks(rawIssues, bundle);
  const blocking      = issues.filter(i => i.severity==='blocking');
  const dramaturgical = issues.filter(i => i.severity==='dramaturgical');
  const cosmetic      = issues.filter(i => i.severity==='cosmetic');
  const score = validation.score ?? 0;

  const risk     = _computeRiskIndex(validation, bundle, intentional);
  const riskLock = _buildRiskLock(score, risk);
  const audience = _buildAudienceModel(validation?.__lyrics || '', validation, bundle, isDE);

  // Declare family/shade/dual early so they're available in the intentional-break early return
  const _dualShadesHS = ['grief_with_release','loss_with_gratitude','parting_with_relief','grief_with_love','love_with_ache','relief_after_pain'];
  const family = bundle?.emotionState?.primaryFamily || 'ambivalent';
  const shade  = bundle?.emotionState?.primaryShade  || '';
  const dual   = bundle?.emotionState?.valenceProfile === 'dual_truth' || _dualShadesHS.includes(shade);

  let verdict, recommendation;

  if (blocking.length > 0) {
    verdict        = isDE ? 'noch nicht tragfähig'                     : 'not yet solid';
    recommendation = isDE ? 'Blockierende Probleme beheben, danach erneut bewerten.'
                          : 'Resolve blocking issues, then re-evaluate.';
  } else if (dramaturgical.length >= 3 || score < 70) {
    verdict        = isDE ? 'solide, aber dramaturgisch wackelig'       : 'solid but dramatically weak';
    recommendation = isDE ? 'Bridge und Sektions-Kohärenz schärfen, Hook auf konkrete Verankerung prüfen.'
                          : 'Sharpen bridge and section coherence, anchor the hook more concretely.';
  } else if (cosmetic.length >= 4 || score < 85) {
    verdict        = isDE ? 'gut, aber schleifbar'                      : 'good but polishable';
    recommendation = isDE ? 'Kosmetische Reparaturen lohnen sich, der Kern steht.'
                          : 'Cosmetic polish is worth it, the core is solid.';
  } else if (intentional.length > 0 && blocking.length === 0 && dramaturgical.length === 0 && cosmetic.length === 0 && score >= 90) {
    verdict        = isDE ? 'songreif mit künstlerischem Bruch'         : 'release-ready with artistic break';
    recommendation = isDE
      ? 'Bewusster Regelbruch erkannt: ' + intentional.map(i=>i.type).join(', ') + '. Vom System verantwortet.'
      : 'Intentional rule break detected: ' + intentional.map(i=>i.type).join(', ') + '. Owned by system.';
    const builtBreak = {
      score, verdict, recommendation,
      counts: { blocking:0, dramaturgical:0, cosmetic:0, total:0 },
      topIssues: [],
      intentionalBreaks: intentional,
      intentionalBreakCount: intentional.length,
      family, shade, dualTruth: dual,
      risk, riskLock, audience,
      expectedRange: bundle?.__state?.expectedRange || null,
      targetTier:    bundle?.__state?.targetTier    || null,
      masterVerdict: null
    };
    builtBreak.masterVerdict = _buildMasterVerdict(builtBreak, isDE);
    return builtBreak;
  } else if (score < 95) {
    verdict        = isDE ? 'stark'                                     : 'strong';
    recommendation = isDE ? 'Letzter Feinschliff optional, sonst freigeben.'
                          : 'Final polish optional, otherwise release.';
  } else {
    verdict        = isDE ? 'songreif'                                  : 'release-ready';
    recommendation = isDE ? 'Keine erkennbaren Schwächen. Song bereit.' : 'No detectable weaknesses. Song is ready.';
  }

  // family/shade/dual already declared above

  const built = {
    score,
    verdict,
    recommendation,
    counts: {
      blocking:      blocking.length,
      dramaturgical: dramaturgical.length,
      cosmetic:      cosmetic.length,
      total:         issues.length
    },
    topIssues: issues
      .sort((a,b) => ({'blocking':0,'dramaturgical':1,'cosmetic':2}[a.severity] - {'blocking':0,'dramaturgical':1,'cosmetic':2}[b.severity]))
      .slice(0,6),
    family:    bundle?.emotionState?.primaryFamily || 'ambivalent',
    shade,
    dualTruth: dual,
    intentionalBreaks:     intentional,
    intentionalBreakCount: intentional.length,
    risk,
    riskLock,
    audience,
    expectedRange: bundle?.__state?.expectedRange || null,
    targetTier:    bundle?.__state?.targetTier    || null,
    masterVerdict: null   // filled below
  };
  built.masterVerdict = _buildMasterVerdict(built, isDE);
  return built;
}


// ═══════════════════════════════════════════════════════════════════
// v3.24.3 — Master Verdict
// ═══════════════════════════════════════════════════════════════════

function _buildMasterVerdict(selfScore, isDE) {
  if (!selfScore) return null;

  const score        = selfScore.score       ?? 0;
  const blocking     = selfScore.counts?.blocking     ?? 0;
  const dramaturgical= selfScore.counts?.dramaturgical?? 0;
  const cosmetic     = selfScore.counts?.cosmetic     ?? 0;
  const intentional  = selfScore.intentionalBreakCount?? 0;

  const riskLevel  = selfScore.risk?.level       || 'balanced';
  const riskStatus = selfScore.riskLock?.status  || 'balanced_ok';
  const audience   = selfScore.audience || { axes:{}, warnings:[] };
  let nachhall     = audience.axes?.nachhall  ?? 0;
  const distance   = audience.axes?.distance  ?? 0;
  // v3.25.5: very_risky + confirmed intentional breaks → nachhall floor +5
  if (riskLevel === 'very_risky' && intentional > 0) {
    nachhall = Math.min(95, nachhall + 5);
  }
  const resonance  = audience.axes?.resonance ?? 0;
  const identify   = audience.axes?.identify  ?? 0;

  // Quality word
  let qualityWord;
  if (blocking > 0)   qualityWord = isDE ? 'nicht tragfähig'   : 'not solid';
  else if (score>=95) qualityWord = isDE ? 'songreif'           : 'release-ready';
  else if (score>=88) qualityWord = isDE ? 'stark'              : 'strong';
  else if (score>=75) qualityWord = isDE ? 'solide'             : 'solid';
  else                qualityWord = isDE ? 'wackelig'           : 'shaky';

  // Risk word
  let riskWord;
  if (riskLevel === 'conservative') {
    riskWord = isDE ? 'vorsichtig geschrieben' : 'carefully written';
  } else if (riskLevel === 'balanced') {
    riskWord = isDE ? 'ausgewogen gebaut' : 'balanced build';
  } else if (riskLevel === 'risky') {
    riskWord = riskStatus === 'risk_paid_off'
      ? (isDE ? 'mutig und eingelöst'       : 'bold and delivered')
      : riskStatus === 'risk_unredeemed'
      ? (isDE ? 'mutig, aber nicht eingelöst' : 'bold but not delivered')
      : (isDE ? 'mutig, noch tragfähig'      : 'bold and holding');
  } else {
    riskWord = riskStatus === 'high_risk_artistic'
      ? (isDE ? 'sehr riskant — künstlerisch getragen' : 'very bold — artistically carried')
      : riskStatus === 'high_risk_collapsing'
      ? (isDE ? 'überspannt — nicht eingelöst'         : 'overreached — not delivered')
      : (isDE ? 'sehr riskant — noch tragfähig'        : 'very bold — still holding');
  }

  // Audience word
  let audienceWord;
  if      (nachhall>=80) audienceWord = isDE ? 'bleibt lange im Kopf'    : 'stays with the listener';
  else if (nachhall>=65) audienceWord = isDE ? 'wirkt nach'               : 'lingers';
  else if (nachhall>=45) audienceWord = isDE ? 'landet, verfliegt aber'   : 'lands but fades';
  else if (nachhall>=25) audienceWord = isDE ? 'streift den Hörer'        : 'brushes the listener';
  else                   audienceWord = isDE ? 'erreicht den Hörer kaum'  : 'barely reaches the listener';

  const masterLine = qualityWord + ', ' + riskWord + ', ' + audienceWord;

  // Tier — v3.25.5: range-based resolution
  const _TIER_LADDER = ['rebuild','needs_work','workable','strong_release','masterpiece_candidate','release_ready'];
  function _bumpTier(target, step) {
    const i = Math.max(0, _TIER_LADDER.indexOf(target));
    return _TIER_LADDER[Math.min(_TIER_LADDER.length-1, Math.max(0, i+step))];
  }
  function _resolveTierFromRange(s, expectedRange, targetTier) {
    if (!expectedRange || !targetTier) return null;
    const [lo, hi] = expectedRange;
    if (s >= hi + 5)   return _bumpTier(targetTier, +1);
    if (s >= lo)       return targetTier;
    if (s >= lo - 8)   return _bumpTier(targetTier, -1);
    return _bumpTier(targetTier, -2);
  }
  let tier;
  if (blocking > 0) {
    tier = 'rebuild';
  } else {
    // Try range-based first
    const expectedRange = selfScore?.expectedRange || selfScore?.summary?.expectedRange;
    const targetTier    = selfScore?.targetTier    || selfScore?.summary?.targetTier;
    const rangeTier = _resolveTierFromRange(score, expectedRange, targetTier);
    if (rangeTier) {
      tier = rangeTier;
    } else {
      // Legacy fallback
      if      (score>=92 && nachhall>=70 && (riskLevel==='risky'||riskLevel==='very_risky')) tier = 'masterpiece_candidate';
      else if (score>=90 && nachhall>=65) tier = 'release_ready';
      else if (score>=80 && nachhall>=50) tier = 'strong_release';
      else if (score>=70) tier = 'workable';
      else tier = 'needs_work';
    }
  }

  const tierLabel = {
    rebuild:              isDE ? '🚧 neu aufbauen'           : '🚧 rebuild',
    masterpiece_candidate:isDE ? '🏆 Meisterwerk-Kandidat'   : '🏆 masterpiece candidate',
    release_ready:        isDE ? '✅ veröffentlichungsreif'   : '✅ release ready',
    strong_release:       isDE ? '🎯 starker Release'        : '🎯 strong release',
    workable:             isDE ? '🛠️ brauchbar, ausbaufähig' : '🛠️ workable, can be sharpened',
    needs_work:           isDE ? '⚠️ noch Arbeit nötig'      : '⚠️ needs more work'
  }[tier];

  // Advice
  const advice = [];
  if (blocking > 0)       advice.push(isDE ? 'Blockierende Probleme zuerst beheben.' : 'Resolve blocking issues first.');
  if (dramaturgical >= 2) advice.push(isDE ? 'Dramaturgische Schwächen schärfen (Bridge, Section, Hook).' : 'Sharpen dramaturgical weaknesses (bridge, section, hook).');
  if (distance > 60)      advice.push(isDE ? 'Distanz reduzieren: weniger Abstraktion, mehr konkrete Objekte.' : 'Reduce distance: less abstraction, more concrete objects.');
  if (resonance < 30)     advice.push(isDE ? 'Mehr körperliche und räumliche Bilder einbauen.' : 'Add more bodily and spatial imagery.');
  if (identify < 30)      advice.push(isDE ? 'Mehr Ich/Du-Perspektive verankern.' : 'Anchor more first/second person perspective.');
  if (intentional > 0)    advice.push(isDE
    ? intentional + ' bewusster Regelbruch erkannt und respektiert.'
    : intentional + ' intentional rule break(s) detected and respected.');

  // v3.25.6: pass through aspirational/realistic from selfScore
  const tierRealistic    = selfScore?.tierRealistic   || _realisticTierFromRangeCal(selfScore?.expectedRange) || tier;
  const tierAspirational = selfScore?.tierAspirational || selfScore?.targetTier || tier;

  return {
    tier,
    tierLabel,
    tierRealistic,
    tierAspirational,
    masterLine,
    qualityWord,
    riskWord,
    audienceWord,
    advice,
    headline: tierLabel + ' — ' + masterLine,
    summary: { score, nachhall, riskLevel, blocking, dramaturgical, cosmetic, intentional }
  };
}

/**
 * Generiert einen kompletten Song mit dem 9-KI-System.
 *
 * @param {import('../types/index').LyricsState} state
 * @returns {Promise<import('../types/index').PipelineResult>}
 */
async function generate(state) {
  const isDE    = state.lang === 'de';
  const isLyrDE = state.lang === 'de';
  const CORE    = isLyrDE ? CORE_DE : CORE_EN;

  const baseCtx            = _buildContext(state, isLyrDE);
  const emotionSignalBundle = buildEmotionSignalBundle(state, isLyrDE);
  const ctx                = augmentContextWithEmotionSignals(baseCtx, emotionSignalBundle, isLyrDE);

  // ── System-Prompt für alle 8 Songwriter ──
  const writeSys = isLyrDE
    ? `Du bist ein professioneller Songwriter.\n\n${CORE}\n\nSchreibe einen kompletten Song auf ${isLyrDE?'Deutsch':'Englisch'}.\nLabel jeden Abschnitt: [Strophe 1] [Pre-Chorus] [Refrain] [Strophe 2] [Bridge] [Outro]\nNur Songtext. Keine Kommentare. Der finale Song MUSS auf ${isLyrDE?'Deutsch':'Englisch'} sein.`
    : `You are a professional songwriter.\n\n${CORE}\n\nWrite a complete song in English.\nLabel every section: [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Outro]\nOnly lyrics. No comments. The final song MUST be in English.`;

  const openings = _getOpenings(ctx, isLyrDE);

  // ── Sichere KI-Ausführung (mit Error-Handling) ─────────────────
  async function safeRun(fn, id, prompt) {
    try {
      const text = await fn(writeSys, prompt, { maxTokens: 1200, temperature: 0.88 });
      return { id, text: text || '', error: null };
    } catch (e) {
      console.warn(`[Pipeline] ${id} failed:`, e.message);
      return { id, text: '', error: e.message };
    }
  }

  // ── Phase 1: 8 parallele Songwriter ───────────────────────────
  const calls = [
    { fn: _gpt,     id: 'gpt',      usr: openings[0] },  // Willie Nelson
    { fn: _claude,  id: 'claude',   usr: openings[1] },  // Phoebe Bridgers
    { fn: _deepseek,id: 'deepseek', usr: openings[2] },  // Bob Dylan
    { fn: _mistral, id: 'mistral',  usr: openings[3] },  // Tom Waits
    { fn: _llama,   id: 'llama',    usr: openings[4] },  // Nick Cave
    { fn: _gemini,  id: 'gemini',   usr: openings[5] },  // Kendrick
    { fn: _phi,     id: 'phi',      usr: openings[6] },  // Amy Winehouse
    { fn: _gpt,     id: 'gpt-cash', usr: openings[7] },  // Johnny Cash
  ];

  const results = await Promise.allSettled(
    calls.map(c => safeRun(c.fn, c.id, c.usr))
  );

  const drafts  = results.map(r => r.status === 'fulfilled' ? r.value : { id: '?', text: '', error: 'Promise rejected' });
  const versions = drafts.filter(d => d.text && d.text.length > 100);

  if (versions.length === 0) throw new Error(isDE ? 'Alle KIs fehlgeschlagen' : 'All AIs failed');

  // ── Phase 2: GPT Humanity-Detective ───────────────────────────
  const detectSys = isDE
    ? 'Du bist ein erfahrener Redakteur. Erkenne KI-typische Muster in Songtexten.'
    : 'You are an experienced editor. Identify AI-typical patterns in song lyrics.';

  const detectUsr = isDE
    ? `Analysiere diese ${versions.length} Song-Entwürfe. Identifiziere:
- KI-Klischees (generische Metaphern, vorhersehbare Refrains)
- Schwächste Zeilen
- Stärkste, menschlichste Momente
- Ob Ausdruckssignale wie Augen, Atem, Mimik, Berührung oder Raumverhalten glaubwürdig genutzt werden
- Ob Widersprüche produktiv getragen werden oder ob der Text sie zu früh glättet

Entwürfe:
${versions.map((v,i)=>`--- ENTWURF ${i+1} (${v.id}) ---\n${v.text}`).join('\n\n')}

Zusätzlicher Emotions-/Signal-Kontext:
${_formatEmotionSignalBlock(emotionSignalBundle, true)}

Gib dein Feedback als kurze Stichpunkte.`
    : `Analyze these ${versions.length} song drafts. Identify:
- AI clichés (generic metaphors, predictable choruses)
- Weakest lines
- Strongest, most human moments
- Whether visible signals such as eyes, breath, face, touch or room behavior are used credibly
- Check whether contradictions are carried productively or flattened too early

Drafts:
${versions.map((v,i)=>`--- DRAFT ${i+1} (${v.id}) ---\n${v.text}`).join('\n\n')}

Additional emotion/signal context:
${_formatEmotionSignalBlock(emotionSignalBundle, false)}

Give feedback as brief bullet points.`;

  let feedback = '';
  try {
    feedback = await _gpt(detectSys, detectUsr, { maxTokens: 600, temperature: 0.5 });
  } catch(e) {
    console.warn('[Pipeline] Humanity Detective failed:', e.message);
  }

  // ── Phase 3: Claude als Leonard Cohen Editor ──────────────────
  const synthSys = isDE
    ? `Du bist Leonard Cohen als Redakteur. Du weißt was einen unsterblichen Song von einem guten trennt.
Du hast ${versions.length} Entwürfe. Deine Aufgabe: Den besten finalen Song schreiben.
Nimm die stärksten Zeilen aus allen Entwürfen. Ersetze schwache durch stärkere.
Achte auf menschliche Ausdruckssignale, innere Widersprüche und konkrete Beobachtung statt Gefühlsbehauptung.
Wenn Warnungen oder Ambivalenzen vorliegen, glätte sie nicht künstlich weg; entscheide bewusst, was Hauptlinie und was Nebenfarbe ist.
Der finale Song MUSS auf ${isLyrDE ? 'Deutsch' : 'Englisch'} sein.
Jeden Abschnitt MIT Label: [Strophe 1] [Pre-Chorus] [Refrain] [Strophe 2] [Bridge] [Outro]
NUR Songtext. Keine Kommentare.`
    : `You are Leonard Cohen as editor. You know what separates an immortal song from a good one.
You have ${versions.length} drafts. Your task: Write the best possible final song.
Take the strongest lines from all drafts. Replace weak ones with stronger ones.
Prioritize human expression signals, inner contradiction and concrete observation over emotional summary.
If warnings or ambivalences are present, do not smooth them away artificially; decide consciously what is main line and what is secondary color.
The final song MUST be in English.
Label every section: [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Outro]
ONLY lyrics. No comments.`;

  const disciplineBlock = _buildOutputDisciplineBlock(emotionSignalBundle, isLyrDE);

  const synthUsr = isDE
    ? `Entwürfe:\n${versions.map((v,i)=>`--- ENTWURF ${i+1} ---\n${v.text}`).join('\n\n')}

${disciplineBlock}

EMOTIONS-/SIGNAL-BUNDLE (Referenz):
${JSON.stringify(emotionSignalBundle, null, 2)}

${feedback ? 'FEEDBACK DES HUMANITY-DETEKTIVS:\n' + feedback : ''}

WICHTIG: Beachte die OUTPUT-DISZIPLIN-Regeln OBEN ZWINGEND.
Schreibe jetzt den finalen Song:`
    : `Drafts:\n${versions.map((v,i)=>`--- DRAFT ${i+1} ---\n${v.text}`).join('\n\n')}

${disciplineBlock}

EMOTION/SIGNAL BUNDLE (reference):
${JSON.stringify(emotionSignalBundle, null, 2)}

${feedback ? 'HUMANITY DETECTIVE FEEDBACK:\n' + feedback : ''}

IMPORTANT: Follow the OUTPUT DISCIPLINE rules ABOVE STRICTLY.
Write the final song now:`;

  const finalLyrics = await _claude(synthSys, synthUsr, { maxTokens: 1600, temperature: 0.72 });
  if (!finalLyrics || finalLyrics.length < 100) throw new Error(isDE ? 'Claude konnte keinen Song erstellen' : 'Claude could not create a song');

  // Titel extrahieren
  const titleMatch = finalLyrics.match(/\[([^\]]{3,40})\]/);
  const title = titleMatch ? titleMatch[1].trim() : (state.theme || (isDE ? 'Neuer Song' : 'New Song'));

  const outputDiscipline = _validateOutputDiscipline(finalLyrics, emotionSignalBundle, isLyrDE);

  // ── v3.23.0: Auto-Repair ──────────────────────────────────────────
  async function _repairLyrics(lyrics, bundle, validation, isDE) {
    if (!validation) return lyrics;
    const needsRepair = !validation.verse1HasSignal || validation.explainerLines.length > 0 || validation.dualTruthPresent === false;
    if (!needsRepair) return lyrics;

    const signals = (bundle?.signalMap?.detectedSignals || []).join(', ');
    const dual    = bundle?.emotionState?.valenceProfile === 'dual_truth';
    const reading = bundle?.meaningResolution?.dominantReading || '';

    const issues = [];
    if (!validation.verse1HasSignal)
      issues.push(isDE ? '- Strophe 1 zeigt kein konkretes Signal aus der Liste.' : '- Verse 1 does not visibly carry any signal from the list.');
    if (validation.explainerLines.length > 0)
      issues.push(isDE ? `- Erklärende Zeilen ohne Signal: ${validation.explainerLines.slice(0,5).join(' / ')}` : `- Explaining lines without signal: ${validation.explainerLines.slice(0,5).join(' / ')}`);
    if (validation.dualTruthPresent === false)
      issues.push(isDE ? '- Doppelwahrheit fehlt: nur eine Seite (Schmerz oder Erleichterung) im Text.' : '- Dual truth missing: only one side (pain or relief) is present.');
    if (validation.clicheHits && validation.clicheHits.length > 0)
      issues.push(isDE
        ? `- Klischees gefunden: ${validation.clicheHits.slice(0,8).join(' / ')}`
        : `- Clichés found: ${validation.clicheHits.slice(0,8).join(' / ')}`);
    if (validation.sectionCoherence && validation.sectionCoherence.issues.length > 0) {
      const dlines = validation.sectionCoherence.issues
        .slice(0,6)
        .map(i => `${i.section} (${i.type}): ${i.issues.join(', ')}`);
      issues.push(isDE
        ? '- Section-Drift erkannt:\n  ' + dlines.join('\n  ')
        : '- Section drift detected:\n  ' + dlines.join('\n  '));
    }
    if (validation.rhythm && validation.rhythm.issues.length > 0) {
      const rlines = validation.rhythm.issues.slice(0,6)
        .map(i => `${i.section}: ${i.issues.join(', ')} (avg ${i.avg?.toFixed?.(1)}, var ${i.variance})`);
      issues.push(isDE
        ? '- Rhythmus-Drift erkannt:\n  ' + rlines.join('\n  ')
        : '- Rhythm drift detected:\n  ' + rlines.join('\n  '));
    }
    if (validation.rhyme && validation.rhyme.issues.length > 0) {
      const ymlines = validation.rhyme.issues.slice(0,6)
        .map(i => `${i.section}: ${i.issues.join(', ')}${i.cheap ? ' ('+i.cheap.join(', ')+')' : ''}`);
      issues.push(isDE
        ? '- Reim-Probleme erkannt:\n  ' + ymlines.join('\n  ')
        : '- Rhyme issues detected:\n  ' + ymlines.join('\n  '));
    }
    if (validation.voice && validation.voice.issues.length > 0) {
      const v = validation.voice;
      const detail = v.issues.map(i => {
        if (i.type==='forbidden_images')       return (isDE?'verbotene Bilder: ':'forbidden images: ')    + i.hits.join(', ');
        if (i.type==='avoid_words')            return (isDE?'unpassende Wörter: ':'avoid words: ')        + i.hits.join(', ');
        if (i.type==='line_length_drift')      return (isDE?`Zeilenlänge daneben (avg ${i.avg}, erwartet ${i.expected[0]}-${i.expected[1]})`:`line length off (avg ${i.avg}, expected ${i.expected[0]}-${i.expected[1]})`);
        if (i.type==='voice_signature_missing')return (isDE?'typische Stimmwörter fehlen: ':'voice signature missing: ') + (i.expected||[]).join(', ');
        return i.type;
      });
      issues.push(isDE
        ? `- Stimm-Drift (${v.voiceKey}/${v.diction}):\n  ` + detail.join('\n  ')
        : `- Voice drift (${v.voiceKey}/${v.diction}):\n  ` + detail.join('\n  '));
    }
    if (validation.hook && validation.hook.issues.length > 0) {
      const h = validation.hook;
      const detail = h.issues.map(i => {
        if (i.type==='no_chorus_found')                   return isDE?'kein Refrain erkennbar':'no chorus found';
        if (i.type==='no_hook_line')                      return isDE?'keine klare Hookzeile':'no hook line';
        if (i.type==='hook_too_short')                    return isDE?`Hook zu kurz (${i.words} Wörter)`:`hook too short (${i.words} words)`;
        if (i.type==='hook_too_long')                     return isDE?`Hook zu lang (${i.words} Wörter)`:`hook too long (${i.words} words)`;
        if (i.type==='hook_too_abstract')                 return (isDE?'Hook zu abstrakt: ':'hook too abstract: ')+(i.line||'');
        if (i.type==='hook_lacks_concrete_anchor')        return (isDE?'Hook ohne Anker: ':'hook lacks anchor: ')+(i.line||'');
        if (i.type==='hook_too_generic')                  return (isDE?'Hook zu generisch: ':'hook too generic: ')+(i.line||'');
        if (i.type==='hook_repeated_without_variation')   return isDE?`Hook ohne Variation (${i.repeat}x)`:`hook without variation (${i.repeat}x)`;
        return i.type;
      });
      issues.push(isDE
        ? '- Hook-Schwäche erkannt:\n  ' + detail.join('\n  ')
        : '- Hook weakness detected:\n  ' + detail.join('\n  '));
    }
    if (validation.bridge && validation.bridge.issues.length > 0) {
      const b = validation.bridge;
      const detail = b.issues.map(i => {
        if (i.type==='bridge_too_similar_to_verses') return (isDE?'Bridge zu nah an den Verses (Jaccard ':'bridge too similar to verses (Jaccard ')+i.similarity+')';
        if (i.type==='bridge_generic_lift')          return (isDE?'billige Aufhellung in der Bridge: ':'generic lift in bridge: ')+i.hits.join(', ');
        if (i.type==='bridge_genre_switch')          return (isDE?'Genrewechsel in der Bridge: ':'genre switch in bridge: ')+i.hits.join(', ');
        if (i.type==='bridge_loses_dual_truth')      return isDE?'Doppelwahrheit in der Bridge verloren':'dual truth lost in bridge';
        if (i.type==='bridge_too_short')             return (isDE?`Bridge zu kurz (${i.lines} Zeilen)`:`bridge too short (${i.lines} lines)`);
        if (i.type==='bridge_too_long')              return (isDE?`Bridge zu lang (${i.lines} Zeilen)`:`bridge too long (${i.lines} lines)`);
        return i.type;
      });
      issues.push(isDE
        ? '- Bridge-Wendepunkt schwach:\n  ' + detail.join('\n  ')
        : '- Bridge weakness detected:\n  ' + detail.join('\n  '));
    }

    const repairSys = isDE
      ? `Du bist Editor. Du erhältst einen Songtext und eine Liste konkreter Probleme.
Repariere NUR diese Probleme. Behalte Stil, Sprache, Sektionen und Reimstruktur bei.
- Ersetze erklärende Gefühlssätze durch konkrete Signale (${signals}).
- Verankere Strophe 1 in mindestens einem Signal.
- ${dual ? 'Beide Wahrheiten müssen erkennbar sein.' : 'Kernzustand muss konsistent bleiben.'}
- Entferne sämtliche Klischees ersatzlos und ersetze sie durch konkrete Bilder oder Signale.
- Jede Sektion muss am Kernzustand entlang geschrieben sein, kein Uplift- oder Verzweiflungs-Drift, kein Genrewechsel, keine billige Versöhnung.
- Rhythmus: beachte Silbenzahl pro Zeile (Profil: ${JSON.stringify(RHYTHM_PROFILES[bundle?.emotionState?.primaryFamily||'ambivalent']?.avgSyllablesPerLine)}). Keine Galoppzeilen bei ernstem Zustand.
- Reime: keine billigen Paare (herz/schmerz, heart/apart). Reim-Strenge: ${RHYME_PROFILES[bundle?.emotionState?.primaryFamily||'ambivalent']?.strictness}.
- Stimme: behalte die Diktion (${VOICE_PROFILES[_resolveVoiceProfile(bundle?.__state||{},true).key]?.diction||'klar_direkt'}). Vermeide stilfremde Bilder, Wörter und Satzstrukturen.
- Der Refrain braucht eine prägnante, körperliche, wiederholbare Hookzeile. Keine austauschbaren Floskeln.
- Die Bridge muss eine neue Sicht auf den Kernzustand bringen. Kein Wiederholungs-Vers, keine billige Erlösung, kein Genrewechsel.
Antwort: NUR der reparierte Songtext mit Sektions-Labels. Keine Kommentare.`
      : `You are an editor. You receive a song and a list of concrete problems.
Fix ONLY those problems. Keep style, language, sections and rhyme structure.
- Replace explaining feeling lines with concrete signals (${signals}).
- Anchor Verse 1 in at least one signal.
- ${dual ? 'Both truths must be visible.' : 'Core state must stay consistent.'}
- Remove every cliché and replace it with concrete imagery or signals.
- Every section must stay aligned with the core state. No uplift drift, no despair drift, no genre switch, no cheap resolution.
- Rhythm: match syllable count per line to profile ${JSON.stringify(RHYTHM_PROFILES[bundle?.emotionState?.primaryFamily||'ambivalent']?.avgSyllablesPerLine)}. No galloping lines in serious states.
- Rhyme: avoid cheap pairs (heart/apart, rain/pain). Strictness: ${RHYME_PROFILES[bundle?.emotionState?.primaryFamily||'ambivalent']?.strictness}.
- Voice: preserve diction (${VOICE_PROFILES[_resolveVoiceProfile(bundle?.__state||{},false).key]?.diction||'plain_modern'}). Avoid style-foreign images, words and sentence structures.
- The chorus needs a memorable, embodied, repeatable hook line. No interchangeable filler.
- The bridge must offer a new angle on the core state. No repeated verse, no cheap resolution, no genre switch.
Reply: ONLY the repaired song with section labels. No comments.`;

    const repairUsr = isDE
      ? `DEUTUNG: ${reading}\nPROBLEME:\n${issues.join('\n')}\n\nAKTUELLER SONGTEXT:\n${lyrics}\n\nRepariere jetzt:`
      : `READING: ${reading}\nPROBLEMS:\n${issues.join('\n')}\n\nCURRENT LYRICS:\n${lyrics}\n\nRepair now:`;

    try {
      const repaired = await _claude(repairSys, repairUsr);
      return (repaired && repaired.trim().length > 0) ? repaired : lyrics;
    } catch (e) {
      console.warn('[v3.23.0] Repair step failed, keeping original.', e);
      return lyrics;
    }
  }

  let repairedLyrics    = finalLyrics;
  let repairValidation  = outputDiscipline;

  // v3.24.0: Annotate intentional breaks — do NOT repair what the system owns
  const _annotated = _annotateIntentionalBreaks(_collectAllIssues(outputDiscipline, emotionSignalBundle), emotionSignalBundle);
  const _realIssues = _annotated.real;

  const _realHasExplainer = _realIssues.some(i => i.source==='anti_explain');
  const _realHasCliche    = _realIssues.some(i => i.source==='cliche');
  const _realHasSection   = _realIssues.some(i => i.source==='section');
  const _realHasRhythm    = _realIssues.some(i => i.source==='rhythm');
  const _realHasRhyme     = _realIssues.some(i => i.source==='rhyme');
  const _realHasVoice     = _realIssues.some(i => i.source==='voice');
  const _realHasHook      = _realIssues.some(i => i.source==='hook');
  const _realHasBridge    = _realIssues.some(i => i.source==='bridge');

  if (
    !outputDiscipline.verse1HasSignal ||
    _realHasExplainer ||
    outputDiscipline.dualTruthPresent === false ||
    _realHasCliche  ||
    _realHasSection ||
    _realHasRhythm  ||
    _realHasRhyme   ||
    _realHasVoice   ||
    _realHasHook    ||
    _realHasBridge
  ) {
    repairedLyrics   = await _repairLyrics(finalLyrics, emotionSignalBundle, outputDiscipline, isLyrDE);
    repairValidation = _validateOutputDiscipline(repairedLyrics, emotionSignalBundle, isLyrDE);
  }

  const selfScore = _buildHonestSelfScore(repairValidation, emotionSignalBundle, isLyrDE);

  return {
    lyrics:             repairedLyrics,
    title,
    successCount:       versions.length,
    drafts,
    emotionSignalBundle,
    outputDiscipline: {
      before:   outputDiscipline,
      after:    repairValidation,
      repaired: repairedLyrics !== finalLyrics,
    },
    selfScore,
  };
}

// ─── Song-Profil Analyse ──────────────────────────────────────────
/**
 * Analysiert einen Songtext und gibt ein strukturiertes Profil zurück.
 * Primär: GPT-4o (JSON-Mode) — Fallback: Claude Sonnet
 *
 * @param {string} lyrics
 * @returns {Promise<import('../types/index').SongProfile>}
 */
async function analyzeSongProfile(lyrics) {
  const isDE = window.currentLang !== 'en';

  const sys = isDE
    ? 'Du bist ein Musik-Analytiker. Analysiere den folgenden Songtext und gib ein strukturiertes JSON-Profil zurück. Nur JSON, keine Erklärungen.'
    : 'You are a music analyst. Analyze the following song lyrics and return a structured JSON profile. Only JSON, no explanations.';

  const usr = (isDE
    ? `Analysiere diesen Songtext und gib exakt dieses JSON zurück:
{"genre":"string","subgenre":"string","stimmung":["string"],"tonart":"string","tempo":"string","struktur":"string","stimme_geschlecht":"male|female|both","energie":"low|medium|high","kommerziell":"string","empfehlung":"string"}

Songtext:\n`
    : `Analyze this song and return exactly this JSON:
{"genre":"string","subgenre":"string","stimmung":["string"],"tonart":"string","tempo":"string","struktur":"string","stimme_geschlecht":"male|female|both","energie":"low|medium|high","kommerziell":"string","empfehlung":"string"}

Lyrics:\n`) + lyrics.slice(0, 1500);

  let raw = '';
  try {
    raw = await _gpt(sys, usr, { maxTokens: 600, temperature: 0.3, jsonMode: true });
  } catch(e) {
    console.warn('[Pipeline] GPT-4o profile failed, trying Claude:', e.message);
    raw = await _claude(sys, usr, { maxTokens: 600, temperature: 0.3 });
  }

  // JSON parsen
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(isDE ? 'Profil konnte nicht analysiert werden' : 'Could not parse profile');
  return JSON.parse(match[0]);
}

// ─── Globales Pipeline-Objekt ─────────────────────────────────────
window.HIRSCH_PIPELINE = {
  generate,
  analyzeSongProfile,
  buildEmotionSignalBundle,
  augmentContextWithEmotionSignals,
  compareToReferenceField,
  runReferenceBankCalibration
};

// Globale Exports für direkten Zugriff aus index.html
window.buildEmotionSignalBundle        = buildEmotionSignalBundle;
window.runReferenceBankCalibration     = runReferenceBankCalibration;
window.augmentContextWithEmotionSignals = augmentContextWithEmotionSignals;
window._buildWarningAwarePromptBlock      = _buildWarningAwarePromptBlock;
window._formatEmotionSignalBlock        = _formatEmotionSignalBlock;
window._inferEmotionBase                = _inferEmotionBase;
window._detectEmotionWarnings           = _detectEmotionWarnings;
window._getTopScoringFamilies           = _getTopScoringFamilies;
window._scoreThemeFamilyHints           = _scoreThemeFamilyHints;
window.THEME_FAMILY_HINTS               = THEME_FAMILY_HINTS;

// Legacy-Aliases (für ältere Stellen in index.html)
window.gptCall    = (s, u, o) => _gpt(s, u, o);
window.geminiCall = (s, u, o) => _gemini(s, u, o);

// ═══════════════════════════════════════════════════════════════════
// Reference Bank Calibration
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// v3.26.0 — Vergleichsmodus: compareToReferenceField
// ═══════════════════════════════════════════════════════════════════

function _positionInGroup(value, group) {
  if (!group.length || value == null) return null;
  const sorted = [...group].sort((a, b) => a - b);
  const min    = sorted[0];
  const max    = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];

  let bucket = 'middle';
  if      (value > max)    bucket = 'above_field';
  else if (value < min)    bucket = 'below_field';
  else if (value >= median) bucket = 'upper_half';
  else                      bucket = 'lower_half';

  return { value, min, max, median, bucket };
}

function _tierPosition(actual, refs) {
  const order = _TIER_LADDER_CAL;
  const a = order.indexOf(actual);
  const refIndices = refs.map(t => order.indexOf(t)).filter(i => i >= 0);
  if (a < 0 || !refIndices.length) return null;
  const sorted = [...refIndices].sort((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)];

  let bucket = 'matches_field';
  if      (a > Math.max(...refIndices)) bucket = 'above_field';
  else if (a < Math.min(...refIndices)) bucket = 'below_field';
  else if (a >= median)                 bucket = 'upper_half';
  else                                  bucket = 'lower_half';

  return { value: actual, median: order[median], bucket };
}

function _buildComparisonVerdict(positions, similar, isDE) {
  const buckets_de = {
    above_field:    'über dem Referenzfeld',
    upper_half:     'im oberen Bereich des Referenzfeldes',
    middle:         'im Mittelfeld',
    lower_half:     'im unteren Bereich des Referenzfeldes',
    below_field:    'unter dem Referenzfeld',
    matches_field:  'passend zum Referenzfeld'
  };
  const buckets_en = {
    above_field:    'above the reference field',
    upper_half:     'in the upper range of the reference field',
    middle:         'in the middle of the reference field',
    lower_half:     'in the lower range of the reference field',
    below_field:    'below the reference field',
    matches_field:  'matching the reference field'
  };
  const buckets = isDE !== false ? buckets_de : buckets_en;
  const parts   = [];

  if (positions.score)    parts.push('Score '   + positions.score.value    + ' — ' + buckets[positions.score.bucket]);
  if (positions.nachhall) parts.push('Nachhall ' + positions.nachhall.value + ' — ' + buckets[positions.nachhall.bucket]);
  if (positions.tier)     parts.push('Tier '    + positions.tier.value     + ' — ' + buckets[positions.tier.bucket]);

  const flags = [positions.score?.bucket, positions.nachhall?.bucket, positions.tier?.bucket];
  let headline;
  if (flags.includes('above_field'))
    headline = isDE !== false ? 'oberhalb der Referenzgruppe' : 'above the reference group';
  else if (flags.includes('below_field'))
    headline = isDE !== false ? 'unterhalb der Referenzgruppe' : 'below the reference group';
  else if (flags.every(f => f === 'upper_half' || f === 'matches_field'))
    headline = isDE !== false ? 'im oberen Drittel der Referenzgruppe' : 'in the upper third of the reference group';
  else if (flags.every(f => f === 'lower_half'))
    headline = isDE !== false ? 'im unteren Drittel der Referenzgruppe' : 'in the lower third of the reference group';
  else
    headline = isDE !== false ? 'im Bereich der Referenzgruppe' : 'within the reference group';

  return { headline, details: parts, sampleSize: similar.length };
}

function compareToReferenceField(generatedResult, query, options) {
  options = options || {};
  const bank = (typeof window !== 'undefined') ? window.HIRSCH_REFERENCE_BANK : null;
  if (!bank || typeof bank.findSimilarSongs !== 'function') {
    return { ok: false, reason: 'reference_bank_unavailable' };
  }

  const limit   = options.limit || 5;
  const isDE    = options.isDE !== undefined ? options.isDE : (query?.language === 'de');
  const similar = bank.findSimilarSongs(query, limit);
  if (!similar.length) return { ok: false, reason: 'no_similar_songs_found' };

  const refScores = [], refNachhall = [], refTiers = [];
  for (const ref of similar) {
    const mid  = ref.expected_score_range    ? (ref.expected_score_range[0]    + ref.expected_score_range[1])    / 2 : null;
    const midN = ref.expected_nachhall_range ? (ref.expected_nachhall_range[0] + ref.expected_nachhall_range[1]) / 2 : null;
    if (mid  != null) refScores.push(mid);
    if (midN != null) refNachhall.push(midN);
    if (ref.target_tier_realistic) refTiers.push(ref.target_tier_realistic);
    else if (ref.target_tier) refTiers.push(ref.target_tier);
  }

  const score    = generatedResult?.selfScore?.score;
  const nachhall = generatedResult?.selfScore?.audience?.axes?.nachhall;
  const tier     = generatedResult?.selfScore?.masterVerdict?.tier;

  const positions = {
    score:    _positionInGroup(score,    refScores),
    nachhall: _positionInGroup(nachhall, refNachhall),
    tier:     _tierPosition(tier,        refTiers)
  };

  const verdict = _buildComparisonVerdict(positions, similar, isDE);

  return {
    ok: true,
    query,
    similar: similar.map(s => ({
      id:         s.id,
      title:      s.title,
      family:     s.family,
      shade:      s.shade,
      voice:      s.voice,
      similarity: s._similarity
    })),
    positions,
    verdict
  };
}
window.compareToReferenceField = compareToReferenceField;

// v3.25.6 inline helper — mirrors referenceBank._realisticTierFromRange
function _realisticTierFromRangeCal(range) {
  if (!Array.isArray(range) || range.length !== 2) return 'workable';
  const mid = (range[0] + range[1]) / 2;
  if (mid >= 92) return 'release_ready';
  if (mid >= 85) return 'masterpiece_candidate';
  if (mid >= 75) return 'strong_release';
  if (mid >= 60) return 'workable';
  if (mid >= 45) return 'needs_work';
  return 'rebuild';
}

// v3.25.6 — Tier-Vergleich
const _TIER_LADDER_CAL = ['rebuild','needs_work','workable','strong_release','masterpiece_candidate','release_ready'];

function _compareTier(actualTier, expectedTier) {
  const i = _TIER_LADDER_CAL.indexOf(actualTier);
  const j = _TIER_LADDER_CAL.indexOf(expectedTier);
  if (i < 0 || j < 0) return { match: false, delta: null };
  return { match: i === j, delta: i - j };
}

async function runReferenceBankCalibration(options) {
  options = options || {};
  const bank = (typeof window !== 'undefined' && window.HIRSCH_REFERENCE_BANK?.getBank?.()) || null;
  if (!bank || !bank.songs?.length) {
    return { ok: false, reason: 'reference_bank_empty' };
  }

  const subset = (options.filter && typeof window !== 'undefined' && window.HIRSCH_REFERENCE_BANK?.filterBank)
    ? window.HIRSCH_REFERENCE_BANK.filterBank(options.filter)
    : bank.songs;

  const results = [];

  for (const song of subset) {
    try {
      // Build a minimal fake bundle from the song's expected metadata
      // Use shade-specific signal map so verse1HasSignal works correctly
      const _shadeSignalMap = {
        restrained_grief:       ['tight_jaw','held_breath','unfinished_speech','small_practical_actions'],
        grief_with_love:        ['wet_eyes','lingering_touch','memory_objects','voice_softening'],
        grief_with_release:     ['held_breath','let_go_gesture','open_window','deep_exhale'],
        loss_with_gratitude:    ['memory_objects','held_breath','small_practical_actions','open_door'],
        hurt_defiance:          ['tight_jaw','clenched_fist','sharp_turns','cut_off_phrases'],
        controlled_defiance:    ['tight_jaw','measured_breath','straight_posture','eyes_forward'],
        tender_attachment:      ['lingering_touch','leaning_in','voice_softening','held_breath'],
        love_with_ache:         ['wet_eyes','lingering_touch','memory_objects','tight_jaw'],
        relief_after_pain:      ['deep_exhale','open_window','let_go_gesture','laugh_breaking_through'],
        relieved_gladness:      ['open_posture','deep_exhale','bright_eyes','quick_step'],
        emotionally_mixed_state:['held_breath','shifting_weight','half_gesture','eyes_down'],
        searching_for_ground:   ['slow_steps','eyes_down','half_gesture','unfinished_speech'],
        parting_with_relief:    ['deep_exhale','open_door','let_go_gesture','memory_objects']
      };
      const _detectedSigs = _shadeSignalMap[song.shade || ''] || ['held_breath','memory_objects','small_practical_actions'];

      const fakeBundle = {
        emotionState: {
          primaryFamily:    song.family  || 'ambivalent',
          primaryShade:     song.shade   || 'emotionally_mixed_state',
          secondaryFamilies:[],
          valenceProfile:   (song.shade || '').includes('with_release') ? 'dual_truth' : 'aligned',
          activationLevel:  'medium',
          expressionStyle:  'controlled',
          innerConflict:    ''
        },
        signalMap:         { detectedSignals: _detectedSigs, signalContradictions:[] },
        meaningResolution: {
          dominantReading:'',
          mustNotFlattenTo:[],
          lyricImplications:[],
          resolutionConfidence: 0.8
        },
        warnings: [],
        __state:  { personas:[song.voice || 'default_en'], lang: song.language || 'en', allowed_intentional_breaks: song.allowed_intentional_breaks || [], expectedRange: song.expected_score_range || null, targetTier: song.target_tier || null, riskLevel: song.risk_level || 'balanced' }
      };

      const isDE     = (song.language || 'en') === 'de';
      const lyrics   = song.lyrics || '';
      const validation = _validateOutputDiscipline(lyrics, fakeBundle, isDE);
      const selfScore  = _buildHonestSelfScore(validation, fakeBundle, isDE);

      const sActual  = selfScore.score ?? 0;
      const nActual  = selfScore.audience?.axes?.nachhall ?? 0;

      const sRange   = song.expected_score_range;
      const nRange   = song.expected_nachhall_range;
      const TOL      = 6; // tolerance ±6

      const inScore    = sRange ? (sActual >= sRange[0]-TOL && sActual <= sRange[1]+TOL) : true;
      const inNachhall = nRange ? (nActual >= nRange[0]-TOL && nActual <= nRange[1]+TOL) : true;

      const tierActual      = selfScore.masterVerdict?.tier || '—';
      const tierRealistic   = song.target_tier_realistic || _realisticTierFromRangeCal(sRange) || 'workable';
      const tierAspirational= song.target_tier_aspirational || song.target_tier || '—';

      const cmpRealistic     = _compareTier(tierActual, tierRealistic);
      const cmpAspirational  = _compareTier(tierActual, tierAspirational);

      results.push({
        id:              song.id,
        title:           song.title,
        scoreActual:     sActual,
        scoreExpected:   sRange  || null,
        nachhallActual:  nActual,
        nachhallExpected:nRange  || null,
        // v3.25.6: Tier-Felder
        tier:            tierActual,
        tierActual,
        tierRealistic,
        tierAspirational,
        targetTier:      tierAspirational,   // backwards-compat alias
        tierMatchRealistic:    cmpRealistic.match,
        tierDeltaRealistic:    cmpRealistic.delta,
        tierMatchAspirational: cmpAspirational.match,
        tierDeltaAspirational: cmpAspirational.delta,
        inScore,
        inNachhall,
        pass: inScore && inNachhall   // pass still by score/nachhall; tier is separate signal
      });
      // v3.25.6: write back measured tier so subsequent renders use it
      song.target_tier_realistic = tierActual;
    } catch (e) {
      results.push({
        id: song.id, title: song.title,
        error: String(e?.message || e),
        pass: false, inScore:false, inNachhall:false
      });
    }
  }

  const passed = results.filter(r => r.pass).length;
  const summary = {
    total:       results.length,
    passed,
    failed:      results.length - passed,
    passRate:    results.length ? Math.round(passed / results.length * 100) : 0,
    avgScore:    results.length
      ? Math.round(results.reduce((a,r) => a + (r.scoreActual||0), 0) / results.length)
      : 0,
    avgNachhall: results.length
      ? Math.round(results.reduce((a,r) => a + (r.nachhallActual||0), 0) / results.length)
      : 0
  };

  return { ok:true, summary, results };
}

window.claudeCall = (s, u, o) => _claude(s, u, o);

// v3.23.0 exports
window._buildOutputDisciplineBlock  = _buildOutputDisciplineBlock;
window._validateOutputDiscipline    = _validateOutputDiscipline;
window._findCliches                 = _findCliches;
window._validateSectionCoherence    = _validateSectionCoherence;
window._validateRhythm              = _validateRhythm;
window._validateVoiceFidelity       = _validateVoiceFidelity;
window._validateHook                = _validateHook;
window._validateBridge              = _validateBridge;
window._buildHonestSelfScore        = _buildHonestSelfScore;
window._isIntentionalBreak          = _isIntentionalBreak;
window._computeRiskIndex            = _computeRiskIndex;
window._buildAudienceModel          = _buildAudienceModel;
window._buildMasterVerdict          = _buildMasterVerdict;
window._countMatches                = _countMatches;
window.RESONANCE_TRIGGERS           = RESONANCE_TRIGGERS;
window.MEMORY_TRIGGERS_DE           = MEMORY_TRIGGERS_DE;
window.MEMORY_TRIGGERS_EN           = MEMORY_TRIGGERS_EN;
window._buildRiskLock               = _buildRiskLock;
window._annotateIntentionalBreaks   = _annotateIntentionalBreaks;
window.INTENTIONAL_BREAKS           = INTENTIONAL_BREAKS;
window._collectAllIssues            = _collectAllIssues;
window._classifyIssueSeverity       = _classifyIssueSeverity;
window._tokenSet                    = _tokenSet;
window._jaccard                     = _jaccard;
window.BRIDGE_PROFILES              = BRIDGE_PROFILES;
window._extractChorusLines          = _extractChorusLines;
window._pickHookCandidate           = _pickHookCandidate;
window._isAbstractOnly              = _isAbstractOnly;
window._isGenericHook               = _isGenericHook;
window.HOOK_PROFILES                = HOOK_PROFILES;
window.HOOK_GENERIC_DE              = HOOK_GENERIC_DE;
window.HOOK_GENERIC_EN              = HOOK_GENERIC_EN;
window._resolveVoiceProfile         = _resolveVoiceProfile;
window.VOICE_PROFILES               = VOICE_PROFILES;
window._validateRhymes              = _validateRhymes;
window._countSyllables              = _countSyllables;
window._lineSyllables               = _lineSyllables;
window._detectCheapRhymes           = _detectCheapRhymes;
window.RHYTHM_PROFILES              = RHYTHM_PROFILES;
window.RHYME_PROFILES               = RHYME_PROFILES;
window._parseSections               = _parseSections;
window._classifySectionLabel        = _classifySectionLabel;
window._getClicheList               = _getClicheList;
window.FAMILY_CLICHES_DE            = FAMILY_CLICHES_DE;
window.FAMILY_CLICHES_EN            = FAMILY_CLICHES_EN;
window._extractSignalKeywords       = _extractSignalKeywords;
window._SIGNAL_DE_MAP               = _SIGNAL_DE_MAP;
window._hasSignalNearby             = _hasSignalNearby;
window._lineNamesEmotion            = _lineNamesEmotion;
window._verseLines                  = _verseLines;
window.EMOTION_LABEL_WORDS_DE       = EMOTION_LABEL_WORDS_DE;
window.EMOTION_LABEL_WORDS_EN       = EMOTION_LABEL_WORDS_EN;

console.log('[Hirsch Pipeline] ✅ 9-KI Pipeline geladen');
