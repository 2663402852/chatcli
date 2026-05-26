export interface ModelConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  modelName: string;
  maxTokens: number;
  temperature: number;
}

export interface Preset {
  id: string;
  name: string;
  content: string;
}

export interface Session {
  id: string;
  title: string;
  modelId?: string;
  presetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionWithSnippet extends Session {
  snippet: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export type SidebarView = 'sessions' | 'search' | 'presets' | 'models';

export interface Command {
  name: string;
  alias?: string[];
  description: string;
  usage?: string;
}

export const COMMANDS: Command[] = [
  { name: '/new', alias: ['/n'], description: 'Create new chat session' },
  { name: '/sessions', alias: ['/s', '/history'], description: 'Show chat history' },
  { name: '/models', alias: ['/m'], description: 'Manage models' },
  { name: '/presets', alias: ['/p'], description: 'Manage presets' },
  { name: '/config', alias: ['/c'], description: 'Configure model or preset', usage: '/config model | /config preset' },
  { name: '/search', description: 'Search history', usage: '/search <query>' },
  { name: '/use', description: 'Switch active model or preset', usage: '/use model <name> | /use preset <name>' },
  { name: '/rename', alias: ['/r'], description: 'Rename current session', usage: '/rename <title>' },
  { name: '/clear', description: 'Clear current session messages' },
  { name: '/export', description: 'Export current session to file' },
  { name: '/delete', alias: ['/d', '/del'], description: 'Delete current session' },
  { name: '/help', alias: ['/h', '/?'], description: 'Show available commands' },
  { name: '/quit', alias: ['/q', '/exit'], description: 'Exit application' },
];
