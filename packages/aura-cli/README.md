# Aura CLI

Standalone terminal interface for Aura Work — an AI-powered coding assistant.

## Features

- **Interactive TUI** — Beautiful terminal UI with Ink/React
- **Multi-model support** — OpenAI, Anthropic, Google, Ollama
- **Session management** — Create, resume, fork sessions
- **Slash commands** — 16 built-in commands for quick actions
- **Theme system** — 12 built-in themes (dark/light/high-contrast)
- **Cost tracking** — Monitor token usage and spending
- **Budget management** — Set limits and get alerts
- **Security** — Permission system with approval workflows
- **Checkpoints** — Session snapshots and rollback

## Installation

```bash
npm install -g aura-work
```

Or run directly with npx:

```bash
npx aura-work
```

## Quick Start

```bash
# Start in current directory
aura-work

# Run a one-shot task
aura-work run "explain this codebase"

# Launch interactive TUI
aura-work tui

# Continue last session
aura-work run "continue where we left off" --continue
```

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `aura-work` | Show project info and recent sessions |
| `aura-work run "<message>"` | Run a one-shot task |
| `aura-work tui` | Launch interactive TUI |
| `aura-work session list` | List sessions |
| `aura-work session open <id>` | Open a session |
| `aura-work models` | Show available models |
| `aura-work model set <model>` | Set default model |
| `aura-work providers` | Show supported providers |
| `aura-work config` | Show/edit configuration |
| `aura-work doctor` | Check system health |

### Run Options

```bash
aura-work run "task" --continue          # Continue last session
aura-work run "task" --session <id>      # Resume specific session
aura-work run "task" --model openai/gpt-4o  # Use specific model
aura-work run "task" --format json       # Output as JSON
aura-work run "task" --dir ./project     # Run in specific directory
```

### Slash Commands (in TUI)

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear chat history |
| `/model [name]` | Show or set model |
| `/session new` | Create new session |
| `/theme [name]` | Show or set theme |
| `/budget [amount]` | Show or set budget |
| `/checkpoint [name]` | Create checkpoint |
| `/undo` | Undo last action |
| `/compact` | Compact conversation |
| `/context` | Show context window usage |
| `/approve` | Approve pending action |
| `/deny` | Deny pending action |
| `/providers` | List providers |
| `/mcp status` | MCP server status |
| `/doctor` | Run diagnostics |
| `/exit` | Exit CLI |

## Themes

12 built-in themes:

**Dark:** aura-dark, midnight, dracula, monokai, nord, tokyo-night
**Light:** aura-light, github-light, solarized-light, one-light
**High Contrast:** high-contrast-dark, high-contrast-light

```bash
# Set theme in config
aura-work config set theme dracula

# Or in TUI
/theme dracula
```

## Configuration

Config file: `~/.aura/config.json`

```json
{
  "defaultModel": "openai/gpt-4o",
  "defaultProvider": "openai",
  "theme": "aura-dark",
  "agentPort": 47821,
  "logLevel": "info"
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AURA_HOME` | Aura home directory | `~/.aura` |
| `AURA_CLI_CONFIG` | Config file path | `~/.aura/config.json` |
| `AURA_AGENT_PORT` | Agent sidecar port | `47821` |
| `AURA_AGENT_AUTH` | Agent auth token | `aura` |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Aura CLI   │────▶│ Agent       │────▶│ AI Provider │
│  (TUI/CLI)  │     │ Sidecar     │     │ (OpenAI...) │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│   SQLite    │
│   Database  │
└─────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build:aura-cli

# Dev mode
cd packages/aura-cli
npm run dev

# Type check
npm run typecheck
```

## License

MIT
