# Contributing to Aura OS

Thank you for helping make Aura OS better. This project is Apache-2.0 licensed and welcomes contributions via GitHub pull requests.

## Development setup

### Requirements

- **Node.js** 20+
- **Rust** stable (rustup) — for Tauri desktop shell
- **Platform tools:** WebView2 (Windows), Xcode CLT (macOS), libwebkit2gtk (Linux)

### Quick start

```bash
git clone https://github.com/hbx12/aura-work.git
cd aura-os
npm install
npm run build:sidecars
```

**Desktop (Tauri):**

```bash
npm run dev          # Terminal 1 — desktop UI
npm run sidecar      # Terminal 2 — agent sidecar
```

See [docs/development.md](./docs/development.md) and the root [README.md](./README.md) for all sidecars and helpers.

**Marketing website:**

```bash
npm run dev:website
```

### Quality checks before opening a PR

```bash
npm run build:sidecars
npm run test:rust
npm run test:acceptance
npm run build:website
npm run audit:licenses
```

## Coding standards

- Match existing style in each workspace (TypeScript/React, Rust, Astro).
- Use the [Aura OS Design System](./design-system/) for all UI surfaces.
- No API keys, tokens, or secrets in code or commits.
- Prefer focused PRs — one feature or fix per pull request.
- Run Prettier on changed files: `npx prettier --write <files>`.

## Commit messages

Use clear, imperative subjects:

```
feat(task): add retry for failed tool calls
fix(vault): handle empty provider list on first launch
docs(i18n): update Weblate contributor guide
```

## Pull request process

1. Fork the repository and create a feature branch from `main`.
2. Update docs in `docs/features/` if you change user-visible behavior.
3. Fill out the PR template completely.
4. Ensure CI passes on macOS, Windows, and Linux.
5. A maintainer will review; address feedback in follow-up commits.

## Translations

Aura OS ships **20 initial languages**. Locale files live in `packages/i18n/locales/`.

- **Source language:** English (`en`)
- **Format:** flat JSON key → string
- **RTL:** Arabic (`ar`) and Persian (`fa`)

### Via pull request

1. Copy `packages/i18n/locales/en.json` to a new locale file.
2. Translate values only — do not change keys.
3. Add the locale to `packages/i18n/src/catalog.ts` if it is a new language.
4. Run `npm run build:locales -w @aura-os/i18n`.

### Via Weblate

Community translation workflow is documented in [packages/i18n/WEBLATE.md](./packages/i18n/WEBLATE.md). Weblate projects sync via PR from `weblate/aura-os` branches.

## Security

Report vulnerabilities privately — see [SECURITY.md](./SECURITY.md). Do not open public issues for undisclosed security bugs.

## Code of Conduct

All contributors must follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Questions

- [GitHub Discussions](https://github.com/hbx12/aura-work/discussions)
- [SUPPORT.md](./SUPPORT.md)
