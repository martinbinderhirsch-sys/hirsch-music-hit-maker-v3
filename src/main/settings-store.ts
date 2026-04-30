import Store from 'electron-store';
import { safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../shared/types';

// API-Keys werden mit safeStorage verschlüsselt (DPAPI auf Windows).
// Andere Settings liegen im Klartext im electron-store.

const SECRET_KEYS = new Set(['openrouterApiKey']);

const defaults: AppSettings = {
  openrouterApiKey: '',
  defaultModel: 'openai/gpt-4o',
  outputLanguage: 'en',
  outputLocale: 'en-US',
  theme: 'dark'
};

const store = new Store<Record<string, unknown>>({
  name: 'hirsch-settings',
  defaults: defaults as unknown as Record<string, unknown>
});

// ── Migration aus der alten App (apikey.enc) ─────────────────────────────────
// Die ältere Version speicherte den OpenRouter-Key in `<userData>/apikey.enc`,
// verschlüsselt mit safeStorage. Beim ersten Start importieren wir ihn,
// falls noch kein Key in den neuen Settings hinterlegt ist.

function tryImportLegacyKey(): void {
  const alreadyHasKey = !!store.get('openrouterApiKey');
  if (alreadyHasKey) return;

  // Mögliche Pfade — je nachdem, unter welchem productName die alte App lief.
  const userDataRoot = path.dirname(app.getPath('userData'));
  const candidates = [
    path.join(app.getPath('userData'), 'apikey.enc'),                  // gleicher productName
    path.join(userDataRoot, 'Hirsch Music Hit Maker', 'apikey.enc'),  // alte Variante
    path.join(userDataRoot, 'hirsch-music-hit-maker', 'apikey.enc')
  ];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const buf = fs.readFileSync(file);

      let plain: string | null = null;
      if (safeStorage.isEncryptionAvailable()) {
        try {
          plain = safeStorage.decryptString(buf);
        } catch {
          // Datei war Plaintext (Fallback der alten App, wenn safeStorage fehlte)
          plain = buf.toString('utf8').trim();
        }
      } else {
        plain = buf.toString('utf8').trim();
      }

      if (plain && plain.length > 10) {
        const reEncrypted = safeStorage.isEncryptionAvailable()
          ? 'enc:' + safeStorage.encryptString(plain).toString('base64')
          : `plain:${plain}`;
        store.set('openrouterApiKey', reEncrypted);
        store.set('legacyKeyImportedAt', new Date().toISOString());
        store.set('legacyKeyImportedFrom', file);
        console.log('[settings] Legacy API-Key importiert von:', file);
        return;
      }
    } catch (e) {
      console.warn('[settings] Legacy-Import fehlgeschlagen:', file, (e as Error).message);
    }
  }
}

// Direkt beim Modul-Laden ausführen (app ist hier schon ready, weil settings-store
// erst aus main.ts heraus aufgerufen wird, nachdem app.whenReady() aufgelöst hat).
try {
  if (app.isReady()) {
    tryImportLegacyKey();
  } else {
    app.whenReady().then(tryImportLegacyKey);
  }
} catch {
  /* test-Umgebung ohne app */
}

function encrypt(value: string): string {
  if (!value) return '';
  if (!safeStorage.isEncryptionAvailable()) return `plain:${value}`;
  return 'enc:' + safeStorage.encryptString(value).toString('base64');
}

function decrypt(value: string): string {
  if (!value) return '';
  if (value.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
    } catch {
      return '';
    }
  }
  if (value.startsWith('plain:')) return value.slice(6);
  return value;
}

export const settingsStore = {
  get(key: string): unknown {
    const raw = store.get(key);
    if (SECRET_KEYS.has(key) && typeof raw === 'string') return decrypt(raw);
    return raw;
  },
  set(key: string, value: unknown): void {
    if (SECRET_KEYS.has(key) && typeof value === 'string') {
      store.set(key, encrypt(value));
      return;
    }
    store.set(key, value as never);
  },
  getAll(): AppSettings {
    const all = store.store as unknown as AppSettings;
    return {
      ...all,
      openrouterApiKey: decrypt((all.openrouterApiKey as unknown as string) ?? '')
    };
  }
};
