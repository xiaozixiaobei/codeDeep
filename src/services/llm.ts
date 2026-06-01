import { LLMConfig, ChatCompletionMessage, StreamChunk } from '../types/llm';

export async function* streamChat(
  config: LLMConfig,
  messages: ChatCompletionMessage[],
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const url = `${config.baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const chunk: StreamChunk = JSON.parse(data);
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export async function fetchModels(config: LLMConfig): Promise<string[]> {
  const url = `${config.baseUrl}/v1/models`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  const models: string[] = (data.data || []).map((m: any) => m.id);
  return models.sort();
}

export async function chatCompletion(
  config: LLMConfig,
  messages: ChatCompletionMessage[],
  signal?: AbortSignal
): Promise<string> {
  const url = `${config.baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}
