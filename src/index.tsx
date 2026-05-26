import React from 'react';
import { render } from 'ink';
import App from './App.js';
import { closeDb } from './lib/db.js';

const app = render(<App />, { exitOnCtrlC: false });

function cleanup() {
  app.unmount();
  closeDb();
  process.exit(0);
}

// SIGTERM: immediate exit (e.g. kill command)
process.on('SIGTERM', cleanup);

// SIGINT (Ctrl+C): handled by App.tsx with double-press logic.
// Do NOT register a SIGINT handler here — it would bypass the
// double-press-to-exit behavior in the Ink useInput hook.

// Ensure DB is closed on any exit path
process.on('exit', () => { try { closeDb(); } catch {} });
