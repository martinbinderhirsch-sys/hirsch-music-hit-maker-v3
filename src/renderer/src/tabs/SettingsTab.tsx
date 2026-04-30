import { useEffect, useState } from 'react';
import type { AppSettings, ModelId } from '../../../shared/types';

interface ModelInfo { id: ModelId; label: string; provider: string }

interface KeyDiagnosis {
  hasStoredValue: boolean;
  format: 'none' | 'encrypted' | 'plain' | 'raw';
  decryptable: boolean;
  length: number;
  preview: string;
  encryptionAvailable: boolean;
  legacyImportedFrom?: string;
}

type TestResult =
  | { ok: true; label: string; usage: number; limit: number | null }
  | { ok: false; error: string }
  | null;

export function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saved, setSaved] = useState(false);
  const [diag, setDiag] = useState<KeyDiagnosis | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  async function loadAll() {
    const [s, m, d] = await Promise.all([
      window.hirsch.settings.getAll(),
      window.hirsch.ai.listModels(),
      window.hirsch.settings.diagnoseKey()
    ]);
    setSettings(s as AppSettings);
    setModels(m as ModelInfo[]);
    setDiag(d);
  }

  useEffect(() => { loadAll(); }, []);

  if (!settings) return <div className="loading">Lade Einstellungen…</div>;

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
    setTestResult(null);
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
    await loadAll();
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    const r = await window.hirsch.settings.testKey();
    setTestResult(r);
    setTesting(false);
  }

  async function resetKey() {
    if (!confirm('Gespeicherten API-Key wirklich löschen? Du musst ihn dann neu eingeben.')) return;
    await window.hirsch.settings.clearKey();
    setSettings(prev => prev ? { ...prev, openrouterApiKey: '' } : prev);
    setTestResult(null);
    await loadAll();
  }

  const diagLabel = (() => {
    if (!diag) return '';
    if (!diag.hasStoredValue) return 'Kein Key gespeichert';
    if (!diag.decryptable) return `Gespeichert (${diag.format}), aber NICHT entschlüsselbar`;
    return `Aktiv: ${diag.preview} (${diag.length} Zeichen, ${diag.format})`;
  })();

  const diagClass = !diag ? '' :
    !diag.hasStoredValue ? 'diag-warn' :
    !diag.decryptable ? 'diag-error' :
    'diag-ok';

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
        <p className={`hint ${diagClass}`}>{diagLabel}</p>
        {diag?.legacyImportedFrom && (
          <p className="hint">Importiert aus: <code>{diag.legacyImportedFrom}</code></p>
        )}
        {!diag?.encryptionAvailable && (
          <p className="hint diag-warn">⚠ DPAPI nicht verfügbar — Key wird im Klartext gespeichert.</p>
        )}

        <div className="key-actions">
          <button className="btn-secondary tiny" onClick={runTest} disabled={testing}>
            {testing ? 'Teste…' : 'Key testen'}
          </button>
          <button className="btn-secondary tiny" onClick={resetKey}>
            Key zurücksetzen
          </button>
        </div>

        {testResult && testResult.ok && (
          <div className="alert-ok">
            ✓ Key funktioniert. Konto: <code>{testResult.label}</code>
            {testResult.limit !== null && (
              <> — Verbrauch: ${testResult.usage.toFixed(2)} / ${testResult.limit.toFixed(2)}</>
            )}
          </div>
        )}
        {testResult && !testResult.ok && (
          <div className="alert-error">✗ Test fehlgeschlagen: {testResult.error}</div>
        )}

        <p className="hint">
          Hol dir einen Key auf <strong>openrouter.ai</strong>. Wird mit Windows DPAPI verschlüsselt gespeichert.
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
        <p className="hint">Tipp: Gemini 2.5 Flash ist am schnellsten und günstigsten.</p>
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
