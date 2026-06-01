# HARDENING_REPORT.md

**Branch:** `hardening/remove-private-prd-and-security-fixes`  
**Repository:** https://github.com/hbx12/aura-work  
**Product:** Aura Work  
**Report date:** 2026-06-01  
**Status:** Alpha hardening complete — **Git history rewrite NOT performed** (awaiting explicit approval)

---

## Executive summary

Security hardening for Aura Work alpha (`0.1.0-alpha.1`) was implemented on the dedicated branch. Local sidecars now require per-session Bearer tokens, browser SSRF protections were expanded, host shell fallback remains disabled by default, vault device keys migrate to OS secure storage, release/staging pipelines fail closed, and public documentation reflects alpha limitations.

**Pending your explicit approval:** Phases 17–18 (git filter-repo, force push, branch deletion, branch protection).

---

## Phase 1 — Private files & PRD

| Item | Result |
|------|--------|
| `PRD/PRD (1).md` in working tree | **Removed** (deleted in commit `ae48936`) |
| `PRD/` in `.gitignore` | **Added** |
| History rewrite | **Not done** — file may still exist in old commits |

**Files:** `.gitignore`, removed `PRD/PRD (1).md`

---

## Phase 2 — Cursor / IDE attribution

| Item | Result |
|------|--------|
| Product prompts referencing Cursor/Cowork | **Removed** (coordinator.ts) |
| `docs/github-publish.md` | Updated — `.cursor/` comment → "Local IDE metadata" |
| CSS `cursor: pointer`, `pull_cursor`, `SetCursorPos` | **Retained** (legitimate) |
| `cursoragent` contributor | **Still in Git history** — requires Phase 17 |

---

## Phase 3 — CI / build fixes

| Command | Result |
|---------|--------|
| `node scripts/audit-licenses.mjs` | **Pass** — `THIRD-PARTY-NOTICES` updated (958 entries) |
| `npm run build:sidecars` | **Pass** |
| `npm run build:cloud` | **Pass** |
| `npm run build:bridge` | **Pass** |
| `npm run test:rust` | **Pass** — 16 tests |
| `npm run test:acceptance` | **Pass** — 14 tests |
| `npm run stage:bundle` | **Pass** — fails if sidecar missing |
| `npm run tauri build` | **Partial** — MSI/NSIS bundles built; updater signing fails without `TAURI_SIGNING_PRIVATE_KEY` (expected) |
| `npm run qa` | **Pass** |

**Note:** Tauri bundle version uses `0.1.0-1` in `tauri.conf.json` because Windows MSI rejects `0.1.0-alpha.1` (non-numeric prerelease). Marketing/docs use `0.1.0-alpha.1`.

---

## Phase 4 — Browser SSRF hardening

**Files:** `sidecar/aura-browser-helper/src/url-guard.ts`, `browse.ts`, `url-guard.test.ts`

- HTTP/HTTPS only
- Blocks loopback, private, link-local, multicast ranges
- DNS resolution check before fetch
- Manual redirect following with re-validation
- Chromium request interception for subresources
- Removed `--no-sandbox` / `--disable-setuid-sandbox`

**Tests:** `url-guard.test.ts` (unit — run via vitest when configured)

---

## Phase 5 — Host shell isolation

**Files:** `sidecar/aura-vm-helper/src/backend.ts`, `exec.ts`, `apps/desktop/src-tauri/src/vm.rs`

- Host fallback disabled unless `AURA_ALLOW_UNSAFE_HOST_EXECUTION=1`
- Warning logged: `UNSAFE host process execution — development only`
- Limited env allowlist (no API keys / full `process.env` inheritance)
- Production path requires WSL2 or verified isolated backend

---

## Phase 6 — Sidecar internal authentication

**Files:** `packages/shared/src/sidecar-auth.ts`, `apps/desktop/src-tauri/src/sidecar_auth.rs`, all sidecar `index.ts`, Rust HTTP clients

- Per-sidecar random token generated at Tauri startup
- Passed via `AURA_SIDECAR_AUTH_TOKEN`
- All endpoints including `/health` and `/status` require `Authorization: Bearer <token>`
- Bridge: Bearer required for management routes; `/v1/*` retains extension session tokens (documented exception)
- Rust clients use `authorized_reqwest()`

**Tests:** `sidecar-auth.test.ts`, bridge acceptance tests (401 without token)

**Future plan:** Unix domain sockets (Linux/macOS), named pipes (Windows), random ports per session

---

## Phase 7 — Computer use default off

**Files:** `sidecar/aura-computer-use/src/index.ts`, `apps/desktop/src-tauri/src/computer_use.rs`

- Disabled unless `AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE=1`
- Requires sidecar Bearer token on all routes
- Audit JSON logs for start/screenshot (screenshots not persisted by default)
- Sensitive app blocklist unchanged in Rust

---

## Phase 8 — Agent coordinator fallback

**Files:** `sidecar/aura-agent/src/task/coordinator.ts` (prior branch commit)

- No placeholder file writes on model failure
- Returns `{ type: "blocked", ... }` with clear reason
- No Cowork/Cursor attribution in prompts

---

## Phase 9 — Vault OS keychain

**Files:** `apps/desktop/src-tauri/src/vault.rs`

- Uses `keyring` crate (DPAPI / Keychain / Secret Service)
- One-time migration from `device.key` → keychain → delete legacy file
- Fallback writes legacy file with warning if keychain unavailable

---

## Phase 10 — Tauri production settings

**Files:** `apps/desktop/src-tauri/tauri.conf.json`, `capabilities/default.json`

- `devtools: false`
- Strict CSP (`connect-src 'self' http://127.0.0.1:*` for local sidecars)
- Minimal capabilities: core, opener, dialog, updater

**CSP exceptions documented:** `'unsafe-inline'` for styles (Vite/React); `127.0.0.1:*` for local sidecars only

---

## Phase 11 — Packaging & release

**Files:** `scripts/stage-bundle.mjs`, `.github/workflows/release.yml`

- Missing sidecar → `process.exit(1)`
- Production CI: VM placeholder detection fails stage-bundle
- Release: `if-no-files-found: error`, minisign required, SBOM + checksums required

---

## Phase 12 — VM placeholder

**Files:** `bundle/vm-image/manifest.json`, `packaging.rs`, `stage-bundle.mjs`

- Dev placeholder artifact retained for alpha dev builds
- Production build rejects `dev-placeholder` signature / placeholder artifact
- Full minisign cryptographic verification against embedded public key: **partial** — hash check exists; full minisign verify not yet implemented in Rust

---

## Phase 13 — Naming & version

| File | Version / name |
|------|----------------|
| `package.json` | `0.1.0-alpha.1`, Aura Work |
| `apps/desktop/package.json` | `0.1.0-alpha.1` |
| `Cargo.toml` | `0.1.0-alpha.1` |
| `tauri.conf.json` | `0.1.0-1` (MSI constraint), productName Aura Work |
| `bundle/manifest.json` | `0.1.0-alpha.1` |
| `@aura-os/*` scope | **Unchanged** (migration deferred) |

---

## Phase 14 — README / CHANGELOG / SECURITY

Updated to state alpha status, security boundaries, and no false production-ready claims.

---

## Phase 15 — Final verification grep

| Pattern | Result |
|---------|--------|
| `cursor` (non-UI) | Clean — only CSS, DB fields, Windows API |
| `placeholder` | Dev VM artifact + UI placeholders + docs (expected) |
| `PRD/` | Only `.gitignore` and docs references — **not** tracked file |
| `Co-authored-by: Cursor` | **Still in Git history** |
| `dev-placeholder-signature` | In dev VM manifest only (blocked in production CI) |

---

## Phase 16 — Awaiting approval

### Commits on branch (including prior work)

```
ae48936 security: remove private PRD from hardening branch
768a7b9 security: harden Tauri production defaults
c365c5b docs: remove IDE attribution and document private PRD exclusion
d5ffa85 security: block SSRF targets in browser helper
9c9cae2 security: disable unsafe host shell fallback by default
6c49743 security: remove placeholder writes and external product attribution from task coordinator
0293f6c security: disable computer use unless explicitly enabled
(+ new commits from this session — see git log)
```

### Branches

```
* hardening/remove-private-prd-and-security-fixes
  main
  origin/dependabot/* (multiple)
```

### Planned history rewrite (Phase 17 — **NOT EXECUTED**)

1. Mirror backup: `git clone --mirror https://github.com/hbx12/aura-work.git aura-work-backup.git`
2. `git filter-repo --path 'PRD/PRD (1).md' --invert-paths --force`
3. Commit message callback to strip `Co-authored-by: Cursor <cursoragent@cursor.com>`
4. After approval only: `git push origin --force --all && git push origin --force --tags`

### Phase 18 — After history rewrite

- Propose deleting stale branches (with your approval)
- Enable branch protection on `main` with required checks

---

## Known gaps / follow-ups

1. **Git history** still contains PRD and Cursor co-author until Phase 17
2. **Full minisign VM signature verification** in Rust not yet implemented
3. **Random sidecar ports** not yet implemented (static ports retained)
4. **Tauri updater signing** requires `TAURI_SIGNING_PRIVATE_KEY` in release CI
5. **docs/** still reference PRD sections in Arabic phase docs (internal planning refs — consider sanitizing in follow-up)
6. **`url-guard.test.ts` redirect test** depends on external httpbin availability

---

## Approval required

Reply explicitly to authorize:

- [ ] Phase 17 — git filter-repo + force push
- [ ] Phase 18 — branch deletion + branch protection on `main`

**Do not proceed with force push without written approval.**
