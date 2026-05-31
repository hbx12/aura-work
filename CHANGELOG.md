# Changelog

All notable changes to Aura OS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-31

First public open-source release — feature-complete v1 per PRD.

### Added

- **Desktop shell** — Tauri + React with Aura OS Design System
- **Vault & providers** — encrypted local API key storage; OpenAI, Anthropic, Gemini, DeepSeek, Ollama, OpenAI-compatible routing with cost display
- **Task engine** — agent loop, file tools, permission prompts, audit log, Monaco editor, Git diff/commit approval
- **VM execution** — Linux workspace, shell policy, project mounts, `run_shell` tool
- **Browser & web** — WebView, Chromium automation, `browse_url`, citations, injection checks
- **Plugins & MCP** — local plugins, MCP stdio servers, marketplace metadata
- **Aura Cloud** — self-hostable E2EE sync, device pairing, recovery key, remote dispatch
- **Scheduled tasks** — cadence execution with pre-approved permission profiles
- **Extensions** — Chrome extension, Office add-ins, local bridge
- **Computer use** (experimental) — desktop automation with per-app approval
- **Packaging** — signed installers, in-app updates, bundled Node + VM image verification
- **i18n** — 20 languages, Weblate-compatible locale files, RTL for Arabic/Persian
- **CLI** — `aura` companion via local bridge
- **Marketing website** — Astro static site, EN/AR, OS-aware downloads, no tracking
- **Community launch** — Apache-2.0, governance files, CI/CD, SBOM, translation workflow

### Security

- No telemetry by default
- API keys never leave the device unencrypted; never synced to cloud
- Secret scanning in CI

[1.0.0]: https://github.com/hbx12/aura-work/releases/tag/v1.0.0
