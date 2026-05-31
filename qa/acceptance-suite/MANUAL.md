# Phase 12 — Manual Acceptance Checklist (PRD Section 5)

Run automated tests first: `npm run test:acceptance` and `npm run test:rust`.

These steps require a human operator on each target platform (macOS, Windows, Linux).

## Platform matrix

| Scenario | macOS | Windows | Linux |
|----------|:-----:|:-------:|:-----:|
| 5.1 Local coding flow | ☐ | ☐ | ☐ |
| 5.2 Ollama-only | ☐ | ☐ | ☐ |
| 5.3 Scheduled permissions | ☐ | ☐ | ☐ |
| 5.4 Remote dispatch (app closed) | ☐ | ☐ | ☐ |
| 5.5 Remote dispatch (sleeping) | ☐ | ☐ | ☐ |
| 5.6 Chrome extension | ☐ | ☐ | ☐ |
| 5.7 Office add-in | ☐ | ☐ | ☐ |
| 5.8 E2EE cloud sync | ☐ | ☐ | ☐ |
| 5.9 High-impact actions | ☐ | ☐ | ☐ |
| 5.10 Computer use safety | ☐ | ☐ | ☐ |

Mark each cell when verified on that OS. Phase 12 is approved when all cells are checked.

---

## 5.1 Local Project Coding Flow

1. Open an existing Git project in Aura.
2. Attach an external file.
3. Ask Aura to implement a small code change.
4. Review the plan; approve file reads/writes and shell execution.
5. Confirm edits land in project files; tests run **inside VM**.
6. Inspect Git diff; approve commit only after review.

**Pass:** VM-only shell; external writes need approval; diff before commit; commit needs approval; audit log records file, shell, approval, Git.

## 5.2 Local-Only Ollama Flow

1. Disable cloud providers in Settings.
2. Enable Ollama (local `11434`).
3. Run a simple analysis task.

**Pass:** Completes without cloud keys; no cloud AI calls; cost shows tokens or `cost unknown`.

## 5.3 Scheduled Task Permissions

1. Create a scheduled task with a **limited** permission profile.
2. Run manually; trigger an action outside the profile.

**Pass:** Task stops for permission; no silent expansion; permanent delete still needs approval.

## 5.4 Remote Dispatch — Desktop Closed

1. Close Aura desktop completely.
2. Send a remote task from a paired client.

**Pass:** Immediate failure; clear notification; no background daemon starts.

## 5.5 Remote Dispatch — Device Unreachable

1. Put desktop to sleep or disconnect network.
2. Trigger remote or scheduled dispatch from cloud.

**Pass:** Fails with notification; system does not claim execution.

## 5.6 Chrome Extension Approval

1. Open a page in Chrome with the Aura extension.
2. Request page read; **deny**, then repeat and **approve**.

**Pass:** Denied content not read; approved content scoped to task; audit entry present.

## 5.7 Office Add-in Delegation

1. Open Word/Excel/PowerPoint with Aura add-in.
2. Request edit or analysis.

**Pass:** Delegates to local Aura; no API keys in add-in; confirmations where required; task history updated.

## 5.8 E2EE Cloud Sync

1. Enable Aura Cloud sync with recovery key saved.
2. Create task history and audit entries.
3. Inspect server storage (`/sync/inspect` or server data dir).

**Pass:** Ciphertext only on server; no plaintext task content; API keys absent from sync; recovery key required.

## 5.9 High-Impact Actions

1. Ask Aura to send a message, publish, purchase-like action, or permanent delete.

**Pass:** Explicit approval required; remote approval restricted where required; denial audited.

## 5.10 Computer Use Safety

1. Request a **new** desktop app; request a **blocklisted** app.
2. Change screenshot retention in project settings.

**Pass:** New app needs approval; blocklisted app denied; retention follows project setting.

---

## Application Complete sign-off

When all automated tests pass and the platform matrix is fully checked:

- [ ] `npm run build:all` succeeds
- [ ] `npm run test:rust` succeeds  
- [ ] `npm run test:acceptance` succeeds
- [ ] Manual matrix complete on macOS, Windows, Linux
- [ ] No P0/P1 open bugs blocking release

**Approved by:** _______________ **Date:** _______________
