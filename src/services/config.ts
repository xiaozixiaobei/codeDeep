import { LLMConfig, PROVIDERS } from '../types/llm';

const STORAGE_KEY = 'codedeep_config';

const defaultConfig: LLMConfig = {
  ...PROVIDERS.deepseek,
  apiKey: '',
};

export function loadConfig(): LLMConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultConfig, ...JSON.parse(saved) };
  } catch {}
  return defaultConfig;
}

export function saveConfig(config: LLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isConfigValid(config: LLMConfig): boolean {
  return !!(config.apiKey && config.baseUrl && config.model);
}
