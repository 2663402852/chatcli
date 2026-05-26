import type { ModelConfig } from './types.js';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

// Validate model config before sending request
function validateModelConfig(model: ModelConfig): void {
  if (!model.endpoint || !model.endpoint.startsWith('http')) {
    throw new Error('Invalid API endpoint URL');
  }
  if (model.temperature < 0 || model.temperature > 2) {
    throw new Error('Temperature must be between 0 and 2');
  }
  if (model.maxTokens < 1 || model.maxTokens > 128000) {
    throw new Error('Max tokens must be between 1 and 128000');
  }
}

// Sanitize error messages to avoid leaking sensitive info
function sanitizeError(err: Error): Error {
  const message = err.message;
  // Remove potential API keys from error messages
  const sanitized = message.replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');
  return new Error(sanitized);
}

export async function streamChat(
  model: ModelConfig,
  messages: { role: string; content: string }[],
  signal: AbortSignal,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    validateModelConfig(model);
  } catch (err: any) {
    callbacks.onError(err);
    return;
  }

  const url = model.endpoint.replace(/\/$/, '') + '/chat/completions';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelName,
        messages,
        max_tokens: Math.min(model.maxTokens, 128000),
        temperature: Math.max(0, Math.min(model.temperature, 2)),
        stream: true,
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }

    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const { done: readerDone, value } = await reader.read();
      if (readerDone) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') { done = true; break; }
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) callbacks.onToken(delta);
        } catch {}
      }
    }
    callbacks.onDone();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      callbacks.onDone();
    } else {
      callbacks.onError(sanitizeError(err));
    }
  }
}
