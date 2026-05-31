# Publishing Aura Work to GitHub

Repository: **https://github.com/hbx12/aura-work**

## What is included

- Desktop app (`apps/desktop`, `packages/`, `sidecar/`)
- Docs (`docs/`, `README.md`, `CONTRIBUTING.md`, …)
- CI (`.github/workflows/`)

## What stays local (`.gitignore`)

| Excluded | Reason |
|----------|--------|
| `design-system/`, `design-system-extract/`, `*.zip` | Design reference archives |
| `website/` | Marketing site (separate) |
| `img/` | Local logo source (icon in `apps/desktop/public/aura-logo.png`) |
| `node_modules/`, `target/`, `dist/`, `sidecar/*/dist/` | Build output |
| `.env`, `*.db`, `*.key`, `auth.json`, `credentials.json` | Secrets & local data |
| `.cursor/`, `.agents/` | IDE / internal tooling |

## Security check before push

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pre-push-check.ps1
```

Your API keys live in the **local vault** (`AppData` / OS keychain) — not in this folder. If you ever pasted a key into a file here, delete it and rotate the key.

**Safe to commit:** OAuth `CLIENT_ID` for ChatGPT/Codex (public, same as Codex CLI).  
**Placeholder:** `tauri.conf.json` updater `pubkey` — replace with real minisign key before signed releases.

## First push

```powershell
cd d:\Aura_os
git init
git remote add origin https://github.com/hbx12/aura-work.git
powershell -ExecutionPolicy Bypass -File scripts/pre-push-check.ps1
git add .
git status   # confirm: NO website/, design-system/, *.zip, .env, *.db
git commit -m "Initial release: Aura Work desktop app"
git branch -M main
git push -u origin main
```

If the GitHub repo already has a README, you may need `git pull origin main --rebase` first or push to an empty repo.
