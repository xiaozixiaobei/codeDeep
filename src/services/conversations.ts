import { Conversation } from '../types/chat';

const STORAGE_KEY = 'codedeep_conversations';
const ACTIVE_KEY = 'codedeep_active_id';

export function loadConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function saveActiveId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}
