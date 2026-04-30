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
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, model: req.model, text: '', error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    return { ok: true, model: req.model, text };
  } catch (err) {
    return {
      ok: false,
      model: req.model,
      text: '',
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
