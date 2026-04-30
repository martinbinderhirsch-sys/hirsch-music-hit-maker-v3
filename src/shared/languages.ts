// Sprachliste (ISO-639-1) + Locales (BCP-47).
// Tier-System: A = beste kreative Qualität, B = gut mit Polish-Pass, C = funktional.

export interface LanguageEntry {
  code: string;          // ISO-639-1
  name: string;          // Englischer Name
  nativeName: string;    // Eigener Name
  tier: 'A' | 'B' | 'C';
  locales: { code: string; label: string }[];
}

// Kuratierte Top-Liste (in v0.1 — ausbaubar bis 140).
// Genre-Schwerpunkt Country/Blues/Americana → en-US ist Default.
export const LANGUAGES: LanguageEntry[] = [
  {
    code: 'en', name: 'English', nativeName: 'English', tier: 'A',
    locales: [
      { code: 'en-US', label: 'American English' },
      { code: 'en-GB', label: 'British English' },
      { code: 'en-AU', label: 'Australian English' },
      { code: 'en-CA', label: 'Canadian English' }
    ]
  },
  {
    code: 'de', name: 'German', nativeName: 'Deutsch', tier: 'A',
    locales: [
      { code: 'de-DE', label: 'Deutsch (Deutschland)' },
      { code: 'de-AT', label: 'Deutsch (Österreich)' },
      { code: 'de-CH', label: 'Deutsch (Schweiz)' }
    ]
  },
  {
    code: 'es', name: 'Spanish', nativeName: 'Español', tier: 'A',
    locales: [
      { code: 'es-ES', label: 'Español (España)' },
      { code: 'es-MX', label: 'Español (México)' },
      { code: 'es-AR', label: 'Español (Argentina)' }
    ]
  },
  {
    code: 'fr', name: 'French', nativeName: 'Français', tier: 'A',
    locales: [
      { code: 'fr-FR', label: 'Français (France)' },
      { code: 'fr-CA', label: 'Français (Canada)' }
    ]
  },
  {
    code: 'pt', name: 'Portuguese', nativeName: 'Português', tier: 'A',
    locales: [
      { code: 'pt-BR', label: 'Português (Brasil)' },
      { code: 'pt-PT', label: 'Português (Portugal)' }
    ]
  },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', tier: 'A', locales: [{ code: 'it-IT', label: 'Italiano' }] },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', tier: 'A', locales: [{ code: 'nl-NL', label: 'Nederlands' }] },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', tier: 'B', locales: [{ code: 'sv-SE', label: 'Svenska' }] },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', tier: 'B', locales: [{ code: 'no-NO', label: 'Norsk' }] },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', tier: 'B', locales: [{ code: 'da-DK', label: 'Dansk' }] },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', tier: 'B', locales: [{ code: 'fi-FI', label: 'Suomi' }] },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', tier: 'B', locales: [{ code: 'pl-PL', label: 'Polski' }] },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', tier: 'B', locales: [{ code: 'cs-CZ', label: 'Čeština' }] },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', tier: 'A', locales: [{ code: 'ru-RU', label: 'Русский' }] },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', tier: 'B', locales: [{ code: 'uk-UA', label: 'Українська' }] },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', tier: 'B', locales: [{ code: 'tr-TR', label: 'Türkçe' }] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', tier: 'A', locales: [{ code: 'ar-SA', label: 'العربية (السعودية)' }, { code: 'ar-EG', label: 'العربية (مصر)' }] },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', tier: 'B', locales: [{ code: 'he-IL', label: 'עברית' }] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', tier: 'A', locales: [{ code: 'hi-IN', label: 'हिन्दी' }] },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', tier: 'B', locales: [{ code: 'bn-IN', label: 'বাংলা' }] },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', tier: 'A', locales: [{ code: 'ja-JP', label: '日本語' }] },
  { code: 'ko', name: 'Korean', nativeName: '한국어', tier: 'A', locales: [{ code: 'ko-KR', label: '한국어' }] },
  { code: 'zh', name: 'Chinese', nativeName: '中文', tier: 'A', locales: [{ code: 'zh-CN', label: '简体中文' }, { code: 'zh-TW', label: '繁體中文' }] },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', tier: 'B', locales: [{ code: 'th-TH', label: 'ไทย' }] },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', tier: 'B', locales: [{ code: 'vi-VN', label: 'Tiếng Việt' }] },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', tier: 'B', locales: [{ code: 'id-ID', label: 'Bahasa Indonesia' }] },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', tier: 'B', locales: [{ code: 'el-GR', label: 'Ελληνικά' }] },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', tier: 'B', locales: [{ code: 'hu-HU', label: 'Magyar' }] },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', tier: 'B', locales: [{ code: 'ro-RO', label: 'Română' }] },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', tier: 'C', locales: [{ code: 'sk-SK', label: 'Slovenčina' }] },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', tier: 'C', locales: [{ code: 'bg-BG', label: 'Български' }] }
  // → in v0.2 erweitern wir auf die vollen 140 Sprachen.
];

export function findLocale(localeCode: string) {
  for (const lang of LANGUAGES) {
    const loc = lang.locales.find(l => l.code === localeCode);
    if (loc) return { language: lang, locale: loc };
  }
  return null;
}
