# Aura OS

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/hbx12/aura-work/actions/workflows/ci.yml/badge.svg)](https://github.com/hbx12/aura-work/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)

Open-source, multi-provider desktop AI agent platform — local-first, permission-gated, self-hostable.

**v1.0.0** — desktop app, Apache-2.0 license, signed installer pipeline, 20-language UI.

## Features

- Multi-provider AI (OpenAI/ChatGPT Codex, Anthropic, Gemini, DeepSeek, Ollama) with routing
- Encrypted local vault — keys stay on your device
- Task agent with file tools, Git, VM shell, browser, plugins/MCP
- 20 languages with RTL (Arabic, Persian)

## Quick start

```powershell
npm install
npm run build:sidecars
npm start
```

Or see [docs/development.md](./docs/development.md) for manual sidecar setup.

## Build from source

```powershell
npm run build:sidecars
npm run build
cd apps\desktop
npm run tauri build
```

Installers are produced under `apps/desktop/src-tauri/target/release/bundle/`.

## Privacy & security

- **No telemetry** by default
- API keys stored encrypted locally; **never** synced to Aura Cloud
- High-impact actions require explicit approval
- See [SECURITY.md](./SECURITY.md) for vulnerability reporting

## Documentation

- [docs/README.md](./docs/README.md) — feature index (Arabic)
- [docs/github-publish.md](./docs/github-publish.md) — what goes on GitHub
- [CONTRIBUTING.md](./CONTRIBUTING.md) — development and translations
- [CHANGELOG.md](./CHANGELOG.md) — release history
- [ROADMAP.md](./ROADMAP.md) — post-v1 direction

## Community

- [GitHub Discussions](https://github.com/hbx12/aura-work/discussions)
- Matrix: `#aura-os:matrix.org`
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## License

Apache-2.0 — see [LICENSE](./LICENSE), [NOTICE](./NOTICE), and [THIRD-PARTY-NOTICES](./THIRD-PARTY-NOTICES).
