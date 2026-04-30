import type { AIRouteRequest, AIRouteResponse, ModelId } from '../shared/types';
import { settingsStore } from './settings-store';

// Multi-KI-Router via OpenRouter — eine HTTP-Schnittstelle für GPT-4o, Gemini, Claude.
// Doku: https://openrouter.ai/docs

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS: { id: ModelId; label: string; provider: string }[] = [
  { id: 'openai/gpt-4o',                label: 'GPT-4o',           provider: 'OpenAI' },
  { id: 'google/gemini-2.5-flash',      label: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'anthropic/claude-3.5-sonnet',  label: 'Claude 3.5 Sonnet', provider: 'Anthropic' }
];

export function listModels() {
  return MODELS;
}

// Per-Call-Timeout in ms — verhindert hängende Pipeline-Stufen.
const CALL_TIMEOUT_MS = 60_000;

export async function aiRoute(req: AIRouteRequest): Promise<AIRouteResponse> {
  const apiKey = settingsStore.get('openrouterApiKey') as string;

  if (!apiKey) {
    return {
      ok: false,
      model: req.model,
      text: '',
      error: 'Kein OpenRouter API-Key in den Einstellungen hinterlegt.'
    };
  }

  const messages = [];
  if (req.system) messages.push({ role: 'system', content: req.system });
  messages.push({ role: 'user', content: req.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  const startedAt = Date.now();
  console.log(`[ai] → ${req.model} (prompt ${req.prompt.length} chars)`);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://hirsch-music.local',
        'X-Title': 'Hirsch Music Hit Maker'
      },
      body: JSON.stringify({
        model: req.model,
        messages,
        temperature: req.temperature ?? 0.8,
        max_tokens: req.maxTokens ?? 2000
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[ai] HTTP ${res.status} — ${errText.slice(0, 200)}`);
      return {
        ok: false,
        model: req.model,
        text: '',
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}`
      };
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (data.error?.message) {
      console.warn(`[ai] API-Fehler: ${data.error.message}`);
      return { ok: false, model: req.model, text: '', error: data.error.message };
    }

    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) {
      return { ok: false, model: req.model, text: '', error: 'Leere Antwort vom Modell' };
    }

    console.log(`[ai] ← ${req.model} OK (${text.length} chars in ${Date.now() - startedAt}ms)`);
    return { ok: true, model: req.model, text };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const message = isAbort
      ? `Timeout nach ${CALL_TIMEOUT_MS / 1000}s — Modell antwortet nicht.`
      : err instanceof Error ? err.message : String(err);
    console.warn(`[ai] FAIL ${req.model}:`, message);
    return { ok: false, model: req.model, text: '', error: message };
  } finally {
    clearTimeout(timer);
  }
}
