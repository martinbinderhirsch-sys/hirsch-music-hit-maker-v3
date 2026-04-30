export function AboutTab() {
  return (
    <div className="about-tab">
      <h2>Hirsch Music Hit Maker</h2>
      <p className="lead">
        AI-gestützte Songwriting-Desktop-App mit Multi-KI-Router und 4-Stufen-Lyrics-Pipeline.
      </p>
      <ul>
        <li>140 Sprachen + Locale-Varianten (en-US, en-GB, …)</li>
        <li>Genre-Schwerpunkt: Country · Blues · Americana</li>
        <li>Modelle via OpenRouter: GPT-4o · Gemini 2.5 Flash · Claude 3.5 Sonnet</li>
        <li>Sicher: contextIsolation, Preload-Bridge, verschlüsselte API-Keys</li>
        <li>Windows-Installer/Uninstaller via electron-builder + NSIS</li>
      </ul>
      <p className="muted">© 2026 Hirsch · Version 0.1.0 · Pre-Alpha</p>
    </div>
  );
}
