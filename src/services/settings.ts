import { AppSettings, defaultSettings } from '../types/settings';

const STORAGE_KEY = 'codedeep_settings';

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        general: { ...defaultSettings.general, ...parsed.general },
        appearance: { ...defaultSettings.appearance, ...parsed.appearance },
        personalization: { ...defaultSettings.personalization, ...parsed.personalization },
        environment: { ...defaultSettings.environment, ...parsed.environment },
      };
    }
  } catch {}
  return { ...defaultSettings };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
