import { useEffect, useState } from 'react';
import { LyricsTab } from './tabs/LyricsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { AboutTab } from './tabs/AboutTab';

type TabId = 'lyrics' | 'settings' | 'about';

const TABS: { id: TabId; label: string }[] = [
  { id: 'lyrics',   label: 'Lyrics Generator' },
  { id: 'settings', label: 'Einstellungen' },
  { id: 'about',    label: 'Über' }
];

export function App() {
  const [active, setActive] = useState<TabId>('lyrics');
  const [version, setVersion] = useState<string>('0.1.0');

  useEffect(() => {
    window.hirsch.app.getVersion().then(setVersion).catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <span className="brand">Hirsch</span>
          <span className="brand-sub">Music Hit Maker</span>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab ${active === t.id ? 'tab-active' : ''}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="app-version">v{version}</div>
      </header>

      <main className="app-main">
        {active === 'lyrics'   && <LyricsTab />}
        {active === 'settings' && <SettingsTab />}
        {active === 'about'    && <AboutTab />}
      </main>
    </div>
  );
}
