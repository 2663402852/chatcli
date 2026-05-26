# ChatCLI

[![npm version](https://img.shields.io/npm/v/@xiami_master/chatcli.svg)](https://www.npmjs.com/package/@xiami_master/chatcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/2663402852/chatcli/actions/workflows/ci.yml/badge.svg)](https://github.com/2663402852/chatcli/actions)

A beautiful terminal AI chat client built with Node.js + [Ink](https://github.com/vadimdemedes/ink) (React for CLI).

Supports any OpenAI-compatible API — OpenAI, Claude, DeepSeek, Ollama, and more.

![Demo](https://github.com/2663402852/chatcli/raw/main/screenshot.png)

## Features

- 💬 **Multi-session chat management** — organize conversations
- 🤖 **OpenAI-compatible API** — works with any provider (OpenAI, Anthropic, DeepSeek, Ollama, etc.)
- 📝 **Markdown rendering** with syntax highlighting
- 🔍 **Full-text history search** across all sessions
- 📋 **System prompt presets** — save and switch between prompt templates
- ⚙️ **Multiple model configurations** — manage models with a built-in wizard
- 💾 **SQLite local storage** — all data stays on your machine
- 🔐 **Encrypted API key storage** (AES-256-CBC)
- 📤 **Export chat history** to Markdown files
- 🗑️ **Session management** — rename, clear, delete sessions

## Install

```bash
npm install -g @xiami_master/chatcli
```

## Quick Start

```bash
# Launch ChatCLI
chatcli

# Configure your first model via the interactive wizard
/config model

# Start chatting!
```

## Commands

Type `/` followed by a command:

| Command | Alias | Description |
|---------|-------|-------------|
| `/new` | `/n` | Create new chat session |
| `/sessions` | `/s`, `/history` | Show chat history |
| `/models` | `/m` | Show model list |
| `/presets` | `/p` | Show preset list |
| `/config` | `/c` | Configure new model or preset |
| `/search` | | Full-text search across history |
| `/use` | | Switch active model or preset |
| `/rename` | `/r` | Rename current session |
| `/clear` | | Clear current session messages |
| `/export` | | Export current session to Markdown |
| `/delete` | `/d`, `/del` | Delete current session |
| `/help` | `/h`, `/?` | Show available commands |
| `/quit` | `/q`, `/exit` | Exit application |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message / Execute command |
| `Tab` | Toggle sidebar focus |
| `Escape` | Close sidebar / Cancel edit |
| `Ctrl+C` | Stop streaming / Exit |
| `Ctrl+D` | Immediate exit |
| `Ctrl+L` | New chat session |
| `↑/↓` | Input history navigation |

## Configuration

Default database: `~/.chatcli/data.db`

### Adding a New Model

```bash
# Interactive wizard
/config model
```

The wizard guides you through: **Name → Endpoint → API Key → Model ID**

### Common API Endpoints

| Provider | Endpoint |
|----------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| DeepSeek | `https://api.deepseek.com` |
| Local (Ollama) | `http://localhost:11434/v1` |

### Presets

```bash
# Add a system prompt preset
/config preset

# List and switch presets
/presets
```

## Security

API keys are encrypted with **AES-256-CBC** before storage:

- Encryption key stored in `~/.chatcli/.encryption_key` (auto-generated, `chmod 600`)
- Database directory restricted (`chmod 700`)
- Keys decrypted only for API calls
- Existing plaintext keys auto-encrypted on first run

## Tech Stack

- [Ink](https://github.com/vadimdemedes/ink) — React for CLI
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite storage
- [marked-terminal](https://github.com/mikaelbr/marked-terminal) — Markdown rendering
- [chalk](https://github.com/chalk/chalk) — Terminal colors
- Node.js crypto — AES-256-CBC encryption

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © [2663402852](https://github.com/2663402852)
