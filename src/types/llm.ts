export interface LLMConfig {
  provider: 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export type MessageContent = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
>;

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}

export interface StreamChunk {
  choices: {
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }[];
}

export const PROVIDERS: Record<string, Omit<LLMConfig, 'apiKey'>> = {
  deepseek: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4096,
  },
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
  },
};

