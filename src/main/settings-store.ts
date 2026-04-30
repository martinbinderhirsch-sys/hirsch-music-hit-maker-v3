import Store from 'electron-store';
import { safeStorage } from 'electron';
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
