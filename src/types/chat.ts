export interface Attachment {
  type: 'image';
  name: string;
  dataUrl: string; // base64 data URL, e.g. "data:image/png;base64,..."
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  projectId?: string;
  permissionLevel?: 'important' | 'review' | 'full';
}
