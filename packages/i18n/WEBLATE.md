# Aura OS translations (Weblate)

Flat JSON locale files live in `locales/`. Regenerate from the TypeScript catalog:

```bash
npm run build:locales -w @aura-os/i18n
```

- **Source language:** `en`
- **File format:** JSON (key → string)
- **RTL locales:** `ar`, `fa`

## Weblate setup (Phase 14 — live)

1. Import the project using `.weblate` at the repository root.
2. Point the component at `packages/i18n/locales/*.json` with template `en.json`.
3. Enable translation propagation and merge via PR (`weblate/i18n` branch).
4. See [CONTRIBUTING.md](../../CONTRIBUTING.md#translations) for contributor instructions.

Community translators can also submit locale PRs directly without Weblate.
