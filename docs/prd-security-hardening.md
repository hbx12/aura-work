# PRD: Aura Work Security Hardening and Alpha Readiness

## 1. Overview

Aura Work is an alpha-stage local-first desktop AI agent platform. The current codebase already includes several good security foundations, including sidecar Bearer authentication, an encrypted local vault, explicit alpha warnings, audit logging, and permission-gated actions.

This PRD defines the remaining high-priority product, security, packaging, and reliability work required before Aura Work can be treated as a serious public alpha/beta release.

This document intentionally excludes the licensing inconsistency issue because it has already been fixed separately.

## 2. Problem Statement

Aura Work exposes powerful agent capabilities: file access, shell execution, provider credentials, local sidecars, VM helper execution, browser/computer-use helpers, cloud sync, and scheduled tasks. These capabilities create high-risk failure modes if command execution, isolation, authorization, secrets handling, release signing, and OAuth flows are not hardened.

The main risks are:

- Shell commands can execute through host shells and may bypass simple text-based classification.
- VM/helper execution currently depends on WSL or unsafe host fallback rather than a fully enforced isolated environment.
- Read-only mount modes appear to be metadata rather than enforced read-only boundaries.
- Some OAuth provider flows appear incorrectly wired.
- Release signing/updater configuration is incomplete.
- Versioning and alpha readiness signals are inconsistent.
- Secret file exclusions are incomplete for an AI coding agent.
- Sidecar request body sizes and local attack surfaces need stronger limits.
- Frontend compromise would have high impact because many Tauri commands are exposed.

## 3. Goals

1. Reduce the risk of accidental or malicious host command execution.
2. Make workspace execution boundaries honest, enforceable, and testable.
3. Ensure sensitive files are not casually exposed to agents or search tools.
4. Make OAuth/provider login flows reliable and provider-specific.
5. Prepare the app for safer signed alpha releases.
6. Improve consistency of release/version metadata.
7. Add clear acceptance tests for security-sensitive behavior.
8. Preserve Aura Work's contributor-friendly workflow while protecting users.

## 4. Non-Goals

- This PRD does not require a full redesign of Aura Work.
- This PRD does not change the license.
- This PRD does not require production-grade enterprise sandboxing immediately, but it does require honest gating and clear security boundaries.
- This PRD does not add paid cloud features.
- This PRD does not remove local-first behavior.

## 5. Users and Stakeholders

### Primary Users

- Developers using Aura Work as a local AI coding/automation workspace.
- Contributors building and testing Aura Work.
- Maintainer account: hbx12 / NOVIR Studio.

### Stakeholders

- Project maintainer: hbx12.
- Open-source contributors.
- Security researchers.
- Future users downloading official installers.

## 6. Priority Levels

### P0: Must Fix Before Public Alpha Installer

These issues block safe public distribution.

1. Harden shell command execution policy.
2. Enforce real read-only/read-write execution boundaries.
3. Fix provider OAuth polling for Google/Gemini and Claude/Anthropic.
4. Replace updater public key placeholder and validate signed release flow.
5. Unify project versioning across README, package metadata, Tauri config, and sidecars.
6. Expand secret-file protection for agent file reads/searches.

### P1: Must Fix Before Beta

1. Add request body size limits to all sidecars.
2. Reduce impact of frontend compromise against exposed Tauri commands.
3. Document all network calls and privacy behavior.
4. Strengthen vault fallback-key handling on Windows/macOS.
5. Add security regression tests for command classification, shell execution, file path handling, and secret exclusions.

### P2: Should Fix During Stabilization

1. Improve file search performance and cancellation.
2. Replace naive wildcard matching with a safer glob implementation.
3. Improve diff generation for pending edits.
4. Improve product messaging around VM/helper limitations.

## 7. Requirements

## 7.1 Shell Command Execution Hardening

### Current Risk

Shell commands are categorized using string heuristics and then executed through `cmd /C` or `sh -c`. Commands that start with safe-looking binaries may still perform writes, deletes, network calls, command chaining, or command substitution.

### Functional Requirements

- FR-SHELL-001: Commands must be parsed into risk categories using explicit rules for shell metacharacters.
- FR-SHELL-002: Commands containing any of the following must not be treated as low-risk read-only commands:
  - `;`
  - `&&`
  - `||`
  - `|`
  - `>`
  - `>>`
  - `<`
  - `$()`
  - backticks
  - shell redirection
  - command substitution
- FR-SHELL-003: Build/test commands must require explicit user approval when running in untrusted projects.
- FR-SHELL-004: Package-manager scripts must be treated as high-risk unless the user explicitly approves them.
- FR-SHELL-005: Destructive denylist checks must remain, but must not be the only protection layer.
- FR-SHELL-006: The UI must show the exact command, working directory, risk category, and reason approval is required.
- FR-SHELL-007: Shell execution must be fully audited with category, risk, approval decision, backend, exit code, and truncated output metadata.

### Acceptance Criteria

- AC-SHELL-001: `echo hello && rm file.txt` is not classified as safe read.
- AC-SHELL-002: `cat package.json > out.txt` is not classified as safe read.
- AC-SHELL-003: `npm run build` requires approval in untrusted or ask-first project modes.
- AC-SHELL-004: `rm -rf /` and common destructive variants remain hard-denied.
- AC-SHELL-005: Unit tests cover safe, build, install, destructive, chained, redirected, and unknown commands.

## 7.2 Execution Isolation and VM Helper Accuracy

### Current Risk

The VM helper uses WSL when available on Windows, otherwise reports unavailable or allows unsafe host execution only with an environment override. WSL and process-based execution should not be described as full VM isolation.

### Functional Requirements

- FR-VM-001: The app must clearly distinguish between:
  - verified isolated VM backend
  - WSL workspace backend
  - unsafe host process execution
  - unavailable backend
- FR-VM-002: Unsafe host execution must remain disabled by default.
- FR-VM-003: If unsafe host execution is enabled, the UI must display a persistent warning.
- FR-VM-004: Production releases must not enable unsafe host execution by default.
- FR-VM-005: VM image verification must fail closed when artifacts/signatures are missing.
- FR-VM-006: Product copy must not imply complete VM isolation unless a verified backend is actually active.

### Acceptance Criteria

- AC-VM-001: On macOS without configured Apple virtualization, shell execution reports unavailable instead of silently using host execution.
- AC-VM-002: On Linux without configured KVM/QEMU image, shell execution reports unavailable unless explicit unsafe override is set.
- AC-VM-003: With `AURA_ALLOW_UNSAFE_HOST_EXECUTION=1`, UI and logs clearly state host execution is unsafe and development-only.
- AC-VM-004: Release builds fail if required signed VM image metadata is missing and the release claims VM isolation.

## 7.3 Enforced Read-Only Mounts

### Current Risk

Mount mode supports `read` and `read-write`, but the helper currently stores mode metadata without enforcing read-only behavior at the execution boundary.

### Functional Requirements

- FR-MOUNT-001: Read-only mounts must prevent writes at the filesystem level where possible.
- FR-MOUNT-002: If filesystem-level read-only enforcement is not available, commands requiring write access must not run under read-only mode.
- FR-MOUNT-003: `needs_mount_write` must be conservative and treat ambiguous commands as write-capable.
- FR-MOUNT-004: Mount status must expose whether read-only is actually enforced or only advisory.

### Acceptance Criteria

- AC-MOUNT-001: A command that writes a file fails under read-only mode.
- AC-MOUNT-002: A command with redirection requests read-write permission.
- AC-MOUNT-003: A command that runs package scripts requests read-write permission unless explicitly configured otherwise.
- AC-MOUNT-004: Tests prove read-only mode is enforced or the UI labels it as advisory only.

## 7.4 Provider OAuth Flow Fixes

### Current Risk

Google/Gemini and Claude/Anthropic login start endpoints are provider-specific, but their poll endpoints appear to call Codex polling logic.

### Functional Requirements

- FR-OAUTH-001: Each provider must have a distinct login session lifecycle.
- FR-OAUTH-002: Google/Gemini polling must poll the Gemini/Google login session.
- FR-OAUTH-003: Claude/Anthropic polling must poll the Anthropic login session.
- FR-OAUTH-004: Codex polling must only poll Codex/OpenAI account login sessions.
- FR-OAUTH-005: Login session state must not be overwritten across providers.
- FR-OAUTH-006: Errors must identify the provider without leaking tokens.

### Acceptance Criteria

- AC-OAUTH-001: Starting Google login then polling Google does not call Codex polling state.
- AC-OAUTH-002: Starting Claude login then polling Claude does not call Codex polling state.
- AC-OAUTH-003: Parallel provider login attempts do not corrupt each other.
- AC-OAUTH-004: Provider tokens are redacted from logs.

## 7.5 Signed Releases and Updater Readiness

### Current Risk

The Tauri updater public key is still a placeholder. SECURITY says signed releases require checksums, minisign signatures, SBOM, and installers.

### Functional Requirements

- FR-REL-001: Replace updater placeholder public key with the actual Tauri updater public key before release.
- FR-REL-002: CI must fail release builds if the updater public key is still placeholder text.
- FR-REL-003: Release artifacts must include SHA-256 checksums.
- FR-REL-004: Release artifacts must include minisign signatures where required.
- FR-REL-005: Release artifacts must include a CycloneDX SBOM.
- FR-REL-006: Documentation must explain how users verify release artifacts.
- FR-REL-007: Release pipeline must not claim signed updates are available until the required artifacts exist.

### Acceptance Criteria

- AC-REL-001: A release workflow fails if `REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY` exists anywhere in release config.
- AC-REL-002: Release output includes installers, checksums, signatures, and SBOM.
- AC-REL-003: README and SECURITY status match actual release readiness.

## 7.6 Version Consistency

### Current Risk

Project versions differ across README, root package, Tauri config, and sidecars.

### Functional Requirements

- FR-VER-001: Define one source of truth for the product version.
- FR-VER-002: Root package version, Tauri version, README current status, sidecar health versions, and package versions must be aligned or intentionally documented.
- FR-VER-003: CI must check for version drift.
- FR-VER-004: Sidecar health responses must report component version and product version separately.

### Acceptance Criteria

- AC-VER-001: README version equals the release version.
- AC-VER-002: Tauri app version equals the release version.
- AC-VER-003: Sidecar health returns both `componentVersion` and `productVersion`.
- AC-VER-004: CI fails when version drift is detected.

## 7.7 Secret File Protection

### Current Risk

The file reader excludes `.env` and common SSH private key names, but many common credential files are not blocked.

### Functional Requirements

- FR-SECRET-001: Secret excludes must cover common credential files and directories.
- FR-SECRET-002: Default file search must skip secret files.
- FR-SECRET-003: Reading a secret-like file must require explicit approval and show a high-risk warning.
- FR-SECRET-004: Agent memory, logs, and audit output must not store secret contents.
- FR-SECRET-005: Secret detection must include filename patterns and optional content pattern scanning.

### Suggested Default Excludes

- `.env*`
- `.npmrc`
- `.pypirc`
- `.netrc`
- `.aws/credentials`
- `.aws/config`
- `.docker/config.json`
- `credentials.json`
- `service-account.json`
- `service_account.json`
- `*.pem`
- `*.key`
- `*.p12`
- `*.pfx`
- `id_rsa`
- `id_ed25519`
- `known_hosts` should be low-risk but still reviewed carefully

### Acceptance Criteria

- AC-SECRET-001: File search does not return `.npmrc`, `.pypirc`, `.aws/credentials`, or `*.pem` by default.
- AC-SECRET-002: Direct read attempts on secret-like files require explicit approval.
- AC-SECRET-003: Approved secret reads are audited without storing raw secret content.

## 7.8 Sidecar Request Hardening

### Current Risk

Sidecar request parsing reads the full body into memory without a visible max-size limit.

### Functional Requirements

- FR-SIDECAR-001: All sidecars must enforce max request body size.
- FR-SIDECAR-002: Oversized requests must return HTTP 413.
- FR-SIDECAR-003: JSON parse failures must return HTTP 400 without stack traces.
- FR-SIDECAR-004: Sidecars must set consistent security headers where applicable.
- FR-SIDECAR-005: Sidecars must continue requiring Bearer auth for every endpoint except none, unless explicitly documented.

### Acceptance Criteria

- AC-SIDECAR-001: A request body above the configured limit returns 413.
- AC-SIDECAR-002: Malformed JSON returns 400.
- AC-SIDECAR-003: Unauthorized requests return 401.
- AC-SIDECAR-004: No endpoint accidentally bypasses sidecar auth.

## 7.9 Tauri Command Exposure and Frontend Compromise Impact

### Current Risk

Many powerful Tauri commands are exposed to the frontend. If the frontend is compromised through XSS or unsafe rendering, the attacker could call commands for file access, shell execution, vault actions, cloud sync, or computer use.

### Functional Requirements

- FR-TAURI-001: All high-impact commands must enforce backend-side permission checks, not only UI checks.
- FR-TAURI-002: Commands that can access files, shell, vault, cloud dispatch, computer use, or scheduled tasks must validate project/user context.
- FR-TAURI-003: Frontend must sanitize or safely render model output, markdown, HTML, tool results, and logs.
- FR-TAURI-004: CSP must remain strict and remote content must not be allowed unless explicitly needed.
- FR-TAURI-005: The app must maintain a threat model document for Tauri command exposure.

### Acceptance Criteria

- AC-TAURI-001: Calling high-impact commands directly from DevTools requires the same backend permission flow as normal UI usage.
- AC-TAURI-002: Model-generated HTML cannot execute script.
- AC-TAURI-003: Cloud remote dispatch and computer-use commands require explicit approval and are disabled by default.
- AC-TAURI-004: A security test suite covers direct command invocation attempts.

## 7.10 Privacy and Network Behavior Documentation

### Current Risk

README says no telemetry by default, but the app performs or can perform network calls for provider validation, pricing refresh, updates, cloud sync, OAuth, and GitHub releases.

### Functional Requirements

- FR-PRIV-001: Create documentation listing every automatic and user-triggered network call.
- FR-PRIV-002: Automatic network calls must be disabled or clearly disclosed.
- FR-PRIV-003: Pricing refresh behavior must be documented and optionally disableable.
- FR-PRIV-004: Provider validation must never log raw credentials.
- FR-PRIV-005: Cloud sync must never sync provider API keys unless explicitly designed and documented.

### Acceptance Criteria

- AC-PRIV-001: Privacy docs list endpoint purpose, trigger, payload type, and opt-out status.
- AC-PRIV-002: No telemetry claim remains accurate after reviewing startup behavior.
- AC-PRIV-003: Users can understand what traffic happens before entering API keys.

## 7.11 Vault Fallback Key Handling

### Current Risk

The vault uses encryption and OS-backed storage where available, but fallback file permissions are stronger on Unix than non-Unix platforms.

### Functional Requirements

- FR-VAULT-001: Windows fallback device key files must use restrictive ACLs when fallback is required.
- FR-VAULT-002: macOS should prefer Keychain and warn if fallback file storage is used.
- FR-VAULT-003: Vault status must clearly show whether OS keychain or fallback file storage is used.
- FR-VAULT-004: Export password requirements should be reviewed for strength.
- FR-VAULT-005: Corrupt vault quarantine must not silently destroy data.

### Acceptance Criteria

- AC-VAULT-001: On Windows fallback storage, file ACLs restrict access to the current user.
- AC-VAULT-002: UI shows a warning if fallback key storage is active.
- AC-VAULT-003: Vault export/import tests cover wrong password, corrupt file, and successful restore.

## 7.12 File Search and Glob Safety

### Current Risk

File search recursively scans text files and wildcard matching uses a simple recursive matcher that can become inefficient with certain patterns.

### Functional Requirements

- FR-FILE-001: File search must support cancellation or timeout for large repositories.
- FR-FILE-002: Search must use bounded concurrency or streaming results.
- FR-FILE-003: Wildcard/glob matching must use a safe library or bounded algorithm.
- FR-FILE-004: Search must respect secret excludes by default.

### Acceptance Criteria

- AC-FILE-001: Searching a large repository does not freeze the app.
- AC-FILE-002: Glob patterns with many `*` characters do not cause excessive CPU usage.
- AC-FILE-003: Search results never include default-excluded secret files.

## 7.13 Pending Edit Diff Quality

### Current Risk

The current diff is a simple line-by-line comparison. It may be misleading for insertions, deletions, or reordered blocks.

### Functional Requirements

- FR-DIFF-001: Replace simple diff with unified diff or a well-tested diff algorithm.
- FR-DIFF-002: Pending edits must show file path, changed hunks, additions, deletions, and context.
- FR-DIFF-003: Large diffs must be truncated safely with a clear marker.

### Acceptance Criteria

- AC-DIFF-001: Insertions and deletions produce readable hunks.
- AC-DIFF-002: Large file edits remain reviewable.
- AC-DIFF-003: Diff output does not include raw secrets from excluded files.

## 8. Security Test Plan

### Unit Tests

- Command categorization tests.
- Shell metacharacter tests.
- Secret exclude pattern tests.
- Path traversal and symlink edge-case tests.
- Sidecar auth tests.
- Request body size tests.
- OAuth provider session tests.
- Vault export/import tests.

### Integration Tests

- Start sidecars with valid token.
- Confirm unauthorized sidecar calls fail.
- Run safe read command.
- Attempt write under read-only mode.
- Attempt package-manager build script and verify approval required.
- Start provider login flows independently.
- Verify release config fails on placeholder updater public key.

### Manual Security Review

- Review all Tauri commands for backend-side authorization.
- Review frontend rendering of markdown/model output/tool output.
- Review startup network traffic.
- Review installer/update artifacts.
- Review cloud sync payloads.

## 9. Implementation Phases

### Phase 1: P0 Safety Fixes

- Harden shell command classification.
- Enforce or honestly label read-only mounts.
- Fix OAuth provider polling.
- Replace updater placeholder and add CI guard.
- Unify versions.
- Expand secret excludes.

### Phase 2: P1 Release Hardening

- Add sidecar body limits.
- Add Tauri command threat model and permission tests.
- Add privacy/network documentation.
- Harden vault fallback storage.
- Add security regression tests.

### Phase 3: P2 Stabilization

- Improve search performance.
- Replace recursive wildcard matching.
- Improve diff generation.
- Polish UX wording around alpha limitations.

## 10. Success Metrics

- 0 P0 issues remaining before public installer release.
- All sidecars reject unauthorized and oversized requests.
- Shell command test suite covers risky shell patterns.
- Read-only mode is either enforced or clearly labeled advisory.
- OAuth provider flows pass provider-specific tests.
- Release pipeline refuses unsigned/incomplete releases.
- Version drift check passes in CI.
- Secret files are excluded from default agent reads/searches.

## 11. Open Questions

1. Should Aura Work treat WSL as an acceptable default execution backend, or only as a development backend?
2. Should package-manager scripts always require approval, even in trusted projects?
3. Should secret-file reads be completely blocked or allowed with explicit approval?
4. Should pricing refresh run automatically on startup, or only after user opt-in?
5. What is the minimum acceptable signed release artifact set for the first public alpha?
6. Should computer-use remain fully disabled until a separate security review is completed?

## 12. Recommended Immediate Next Step

Create separate GitHub issues for each P0 item and handle them one by one. The highest-risk first issue should be:

**P0: Harden shell command execution and approval policy**

Reason: shell execution is the broadest local risk in an AI agent app and can affect user files, secrets, and system integrity.
