import { useEffect, useState } from 'react';
import { LyricsTab } from './tabs/LyricsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { AboutTab } from './tabs/AboutTab';
import { UpdateBadge } from './components/UpdateBadge';
import { HistorySidebar } from './components/HistorySidebar';
import { SongsProvider } from './lib/songs-context';

type TabId = 'lyrics' | 'settings' | 'about';

const TABS: { id: TabId; label: string }[] = [
  { id: 'lyrics',   label: 'Lyrics Generator' },
  { id: 'settings', label: 'Einstellungen' },
  { id: 'about',    label: 'Über' }
];

export function App() {
  const [active, setActive] = useState<TabId>('lyrics');
  const [version, setVersion] = useState<string>('0.1.2');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    window.hirsch.app.getVersion().then(setVersion).catch(() => {});
  }, []);

  return (
    <SongsProvider>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-title">
            <span className="brand">Hirsch</span>
            <span className="brand-sub">Music Hit Maker</span>
          </div>
          <button
            className="icon-btn sidebar-toggle"
            title={sidebarOpen ? 'Sidebar ausblenden' : 'Sidebar einblenden'}
            onClick={() => setSidebarOpen(o => !o)}
          >
            ☰
          </button>
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
          <UpdateBadge />
          <div className="app-version">v{version}</div>
        </header>

        <div className="app-body">
          {sidebarOpen && active === 'lyrics' && (
            <HistorySidebar onPick={() => setActive('lyrics')} />
          )}
          <main className="app-main">
            {active === 'lyrics'   && <LyricsTab />}
            {active === 'settings' && <SettingsTab />}
            {active === 'about'    && <AboutTab />}
          </main>
        </div>
      </div>
    </SongsProvider>
  );
}
