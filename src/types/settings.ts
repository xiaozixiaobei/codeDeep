export interface GeneralSettings {
  language: 'zh-CN' | 'en-US';
  startupAction: 'home' | 'lastConversation';
}

export interface AppearanceSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
}

export interface PersonalizationSettings {
  systemPrompt: string;
}

export interface EnvVar {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvironmentSettings {
  vars: EnvVar[];
}

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  personalization: PersonalizationSettings;
  environment: EnvironmentSettings;
}

export const defaultSettings: AppSettings = {
  general: {
    language: 'zh-CN',
    startupAction: 'home',
  },
  appearance: {
    theme: 'light',
    fontSize: 'medium',
  },
  personalization: {
    systemPrompt: '你是 CodeDeep，一个专业的 AI 编程助手。请用中文回复。请根据用户的需求编写清晰、高效、可维护的代码。',
  },
  environment: {
    vars: [],
  },
};
