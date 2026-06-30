# Architecture

[![English](https://img.shields.io/badge/lang-en-blue.svg)](architecture.md)
[![العربية](https://img.shields.io/badge/lang-ar-green.svg)](architecture.ar.md)

## Monorepo structure

```
Aura_os/
├── apps/desktop/          # Tauri 2 + React — main desktop app
│   ├── src/               # React UI
│   └── src-tauri/         # Rust: SQLite, Tauri commands
├── packages/ui/           # Aura Work Design System (React + CSS)
├── packages/shared/       # Shared types and constants
├── packages/aura-plugin/  # Plugin SDK
├── packages/i18n/         # Internationalization (20 languages)
├── office/                # Office document tooling (Excel, PowerPoint, Word)
├── sidecar/aura-agent/    # Node sidecar — task orchestration
├── sidecar/aura-vm-helper/       # VM execution backend
├── sidecar/aura-browser-helper/   # Browser automation
├── sidecar/aura-plugins-helper/   # Plugin & MCP management
├── sidecar/aura-cloud-sync/       # Cloud sync
├── sidecar/aura-bridge/          # Cross-process bridge
├── sidecar/aura-computer-use/     # Computer Use (experimental)
├── cli/aura-cli/          # CLI companion tool
├── server/aura-cloud/     # Aura Cloud server (self-hostable)
├── registry/              # Marketplace (skills, MCP, plugins)
├── qa/                    # Acceptance tests
├── docs/                  # Feature documentation
├── scripts/               # Build, bundle, release scripts
├── assets/                # Demo GIFs and media
└── examples/              # Sample plugins and MCP servers
```

## Processes (Phase 1)

| Process | Role |
|---|---|
| `aura-app` (Tauri) | Desktop UI + Rust backend |
| `aura-agent` (Node) | Task orchestration sidecar |
| `aura-vm-helper` (Node) | VM execution backend |
| `aura-browser-helper` (Node) | Browser automation |
| `aura-plugins-helper` (Node) | Plugin & MCP management |
| `aura-cloud-sync` (Node) | E2EE cloud sync |
| `aura-bridge` (Node) | Cross-sidecar bridge |
| `aura-computer-use` (Node) | Computer Use (experimental) |
| `aura-cli` (Node) | CLI companion |
| `aura-cloud` (Node) | Cloud server |

## Project creation flow

```
React (NewProjectDialog)
  → invoke("pick_folder")     [Rust + tauri-plugin-dialog]
  → invoke("create_project")  [Rust → SQLite INSERT]
  → invoke("list_projects")   [Rust → SQLite SELECT]
  → Sidebar renders the list
```

## Package dependencies

- `@aura-os/desktop` depends on `@aura-os/ui`, `@aura-os/shared`, `@aura-os/i18n`
- Vite alias: `@aura-os/ui` → `packages/ui/src`
- All sidecars depend on `@aura-os/shared` for types

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Design system tokens + CSS |
| Database | SQLite via rusqlite (bundled) |
| Encryption | ChaCha20Poly1305 + Argon2 |
| OS secrets | keyring (DPAPI / Keychain / Secret Service) |
| Sidecars | Node.js (bundled) |
| i18n | 20 languages with Weblate (RTL for Arabic, Persian) |
