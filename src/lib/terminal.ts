/** Get terminal width, fallback to 80 columns */
export function getTerminalWidth(): number {
  try {
    return process.stdout.columns || 80;
  } catch {
    return 80;
  }
}

/** Generate a unique ID (base36 timestamp + random suffix) */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}