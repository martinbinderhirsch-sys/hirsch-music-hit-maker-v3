import { useEffect, useState } from 'react';
import type { AppSettings, ModelId } from '../../../shared/types';

interface ModelInfo { id: ModelId; label: string; provider: string }

export function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      window.hirsch.settings.getAll(),
      window.hirsch.ai.listModels()
    ]).then(([s, m]) => {
      setSettings(s as AppSettings);
      setModels(m as ModelInfo[]);
    });
  }, []);

  if (!settings) return <div className="loading">Lade Einstellungen…</div>;

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    await Promise.all([
      window.hirsch.settings.set('openrouterApiKey', settings.openrouterApiKey),
      window.hirsch.settings.set('defaultModel',     settings.defaultModel),
      window.hirsch.settings.set('outputLanguage',   settings.outputLanguage),
      window.hirsch.settings.set('outputLocale',     settings.outputLocale),
      window.hirsch.settings.set('theme',            settings.theme)
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-tab">
      <h2>Einstellungen</h2>

      <div className="setting-block">
        <label>OpenRouter API-Key</label>
        <input
          type="password"
          value={settings.openrouterApiKey}
          onChange={e => update('openrouterApiKey', e.target.value)}
          placeholder="sk-or-v1-…"
        />
        <p className="hint">
          Wird verschlüsselt mit Windows DPAPI (safeStorage) gespeichert.
          Hol dir einen Key auf openrouter.ai.
          {settings.openrouterApiKey && (
            <span className="hint-ok"> · Key vorhanden ✓</span>
          )}
        </p>
      </div>

      <div className="setting-block">
        <label>Standard-Modell</label>
        <select value={settings.defaultModel}
          onChange={e => update('defaultModel', e.target.value as ModelId)}>
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>
          ))}
        </select>
      </div>

      <div className="setting-block">
        <label>Theme</label>
        <select value={settings.theme}
          onChange={e => update('theme', e.target.value as 'dark' | 'light')}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div className="actions">
        <button className="btn-primary" onClick={save}>Speichern</button>
        {saved && <span className="saved-flash">Gespeichert ✓</span>}
      </div>
    </div>
  );
}
