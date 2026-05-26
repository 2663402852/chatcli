import Database from 'better-sqlite3';
import { getDbPath, encryptValue, decryptValue } from './config.js';
import type { Session, SessionWithSnippet, Message, ModelConfig, Preset } from './types.js';
import { generateId } from './terminal.js';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    try {
      db = new Database(getDbPath());
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      initTables();
      seedDefaults();
    } catch (err) {
      console.error('Failed to initialize database:', err);
      throw new Error('Database initialization failed. Check if ~/.chatcli/ is writable.');
    }
  }
  return db;
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch (err) {
      console.error('Error closing database:', err);
    }
    db = null;
  }
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      model_id TEXT,
      preset_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      endpoint TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
      api_key TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT 'gpt-4',
      max_tokens INTEGER DEFAULT 4096,
      temperature REAL DEFAULT 0.7
    );
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedDefaults() {
  const presetCount = db.prepare('SELECT COUNT(*) as c FROM presets').get() as { c: number };
  if (presetCount.c === 0) {
    db.prepare('INSERT INTO presets (id, name, content) VALUES (?, ?, ?)').run(
      'default', 'Default', 'You are a helpful assistant.'
    );
    db.prepare('INSERT INTO presets (id, name, content) VALUES (?, ?, ?)').run(
      'coder', 'Code Assistant', 'You are an expert programmer. Provide clear, concise code examples with explanations.'
    );
    db.prepare('INSERT INTO presets (id, name, content) VALUES (?, ?, ?)').run(
      'translator', 'Translator', 'You are a professional translator. Translate accurately while maintaining natural tone.'
    );
  }

  // Migrate: Encrypt any existing plaintext API keys
  migrateEncryptApiKeys();
}

// One-time migration to encrypt existing plaintext API keys
function migrateEncryptApiKeys() {
  try {
    const models = db.prepare('SELECT id, api_key FROM models').all() as { id: string; api_key: string }[];
    for (const model of models) {
      if (model.api_key && !model.api_key.includes(':')) {
        // Plaintext key (no colon separator from encryption format)
        const encrypted = encryptValue(model.api_key);
        db.prepare('UPDATE models SET api_key = ? WHERE id = ?').run(encrypted, model.id);
      }
    }
  } catch (err) {
    // Migration is best-effort, don't crash
    console.warn('API key encryption migration skipped:', err);
  }
}

// Sessions
export function getSessions(): Session[] {
  const rows = getDb().prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as Record<string, string>[];
  return rows.map(r => ({
    id: r.id, title: r.title, modelId: r.model_id, presetId: r.preset_id,
    createdAt: r.created_at, updatedAt: r.updated_at
  }));
}

export function createSession(title?: string, modelId?: string, presetId?: string): Session {
  const id = generateId();
  const now = new Date().toISOString();
  getDb().prepare('INSERT INTO sessions (id, title, model_id, preset_id, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(
    id, title || 'New Chat', modelId || null, presetId || null, now, now
  );
  return { id, title: title || 'New Chat', modelId, presetId, createdAt: now, updatedAt: now };
}

export function updateSessionTitle(id: string, title: string) {
  getDb().prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, new Date().toISOString(), id);
}

export function deleteSession(id: string) {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

// Messages
export function getMessages(sessionId: string): Message[] {
  const rows = getDb().prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at').all(sessionId) as Record<string, string>[];
  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.role as Message['role'],
    content: r.content,
    createdAt: r.created_at
  }));
}

export function addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Message {
  const id = generateId();
  const now = new Date().toISOString();
  getDb().prepare('INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?,?,?,?,?)').run(id, sessionId, role, content, now);
  getDb().prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);
  return { id, sessionId, role, content, createdAt: now };
}

export function updateMessage(id: string, content: string) {
  getDb().prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
}

export function clearMessages(sessionId: string) {
  getDb().prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  getDb().prepare("UPDATE sessions SET title = 'New Chat', updated_at = ? WHERE id = ?").run(new Date().toISOString(), sessionId);
}

export function renameSession(id: string, title: string) {
  getDb().prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, new Date().toISOString(), id);
}

export function exportSession(sessionId: string): { session: Session; messages: Message[] } | null {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;
  const msgs = getMessages(sessionId);
  return { session, messages: msgs };
}

// Models (with API key encryption)
export function getModels(): ModelConfig[] {
  const rows = getDb().prepare('SELECT * FROM models').all() as Record<string, string | number>[];
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    endpoint: r.endpoint as string,
    apiKey: decryptValue(r.api_key as string), // Decrypt API key
    modelName: r.model_name as string,
    maxTokens: (r.max_tokens as number) || 4096,
    temperature: (r.temperature as number) ?? 0.7
  }));
}

export function upsertModel(m: ModelConfig) {
  getDb().prepare(`INSERT OR REPLACE INTO models (id, name, endpoint, api_key, model_name, max_tokens, temperature) VALUES (?,?,?,?,?,?,?)`).run(
    m.id,
    m.name,
    m.endpoint,
    encryptValue(m.apiKey), // Encrypt API key
    m.modelName,
    m.maxTokens,
    m.temperature
  );
}

export function deleteModel(id: string) {
  getDb().prepare('DELETE FROM models WHERE id = ?').run(id);
}

// Presets
export function getPresets(): Preset[] {
  const rows = getDb().prepare('SELECT * FROM presets').all() as Record<string, string>[];
  return rows.map(r => ({ id: r.id, name: r.name, content: r.content }));
}

export function upsertPreset(p: Preset) {
  getDb().prepare('INSERT OR REPLACE INTO presets (id, name, content) VALUES (?,?,?)').run(p.id, p.name, p.content);
}

export function deletePreset(id: string) {
  getDb().prepare('DELETE FROM presets WHERE id = ?').run(id);
}

// Search
export function searchSessions(query: string): SessionWithSnippet[] {
  const escaped = query.replace(/[%_]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const rows = getDb().prepare(`
    SELECT DISTINCT s.*, SUBSTR(m.content, 1, 100) as snippet
    FROM sessions s
    JOIN messages m ON m.session_id = s.id
    WHERE s.title LIKE ? ESCAPE '\\' OR m.content LIKE ? ESCAPE '\\'
    ORDER BY s.updated_at DESC
    LIMIT 20
  `).all(pattern, pattern) as Record<string, string>[];
  return rows.map(r => ({
    id: r.id, title: r.title, modelId: r.model_id, presetId: r.preset_id,
    createdAt: r.created_at, updatedAt: r.updated_at, snippet: r.snippet
  }));
}

// Config KV
export function getConfig(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || null;
}

export function setConfig(key: string, value: string) {
  getDb().prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?,?)').run(key, value);
}
