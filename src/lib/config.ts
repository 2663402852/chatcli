import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const CONFIG_DIR = join(homedir(), '.chatcli');
const DB_PATH = join(CONFIG_DIR, 'data.db');
const KEY_FILE = join(CONFIG_DIR, '.encryption_key');

// Generate or load encryption key
function getEncryptionKey(): Buffer {
  if (existsSync(KEY_FILE)) {
    return readFileSync(KEY_FILE);
  }
  // Generate new 32-byte key
  const key = randomBytes(32);
  writeFileSync(KEY_FILE, key);
  // Restrict file permissions (owner only)
  try {
    chmodSync(KEY_FILE, 0o600);
  } catch {
    // Ignore on Windows
  }
  return key;
}

// Encrypt a string value
export function encryptValue(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return iv:encrypted format
  return `${iv.toString('hex')}:${encrypted}`;
}

// Decrypt a string value
export function decryptValue(encrypted: string): string {
  if (!encrypted) return '';
  try {
    const key = getEncryptionKey();
    const [ivHex, data] = encrypted.split(':');
    if (!ivHex || !data) return encrypted; // Not encrypted format
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encrypted; // Return as-is if decryption fails
  }
}

export function getConfigDir(): string {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    // Restrict directory permissions (owner only)
    try {
      chmodSync(CONFIG_DIR, 0o700);
    } catch {
      // Ignore on Windows
    }
  }
  return CONFIG_DIR;
}

export function getDbPath(): string {
  getConfigDir();
  return DB_PATH;
}
