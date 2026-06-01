# Changelog

All notable changes to **Aura Work** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2026-06-01

**Security hardening alpha** — not production-ready.

### Security

- Removed private PRD from tracked files; `PRD/` added to `.gitignore`
- Internal Bearer authentication for all local sidecars (per-session tokens from Tauri)
- Browser helper SSRF hardening: protocol allowlist, private IP blocking, DNS resolution checks, redirect validation, Chromium request interception
- Host shell fallback disabled by default (`AURA_ALLOW_UNSAFE_HOST_EXECUTION=1` for dev only)
- Computer use disabled by default (`AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE=1` for dev only)
- Agent coordinator no longer writes placeholder files on model failure
- Vault device key migration to OS secure storage (DPAPI / Keychain / Secret Service via `keyring`)
- Tauri production CSP and devtools disabled
- Release pipeline fails on missing installers, SBOM, checksums, or minisign key
- Stage-bundle fails when required sidecars or production VM placeholders are missing

### Changed

- Public product name unified to **Aura Work** (`0.1.0-alpha.1`)
- Documentation updated to reflect alpha status and current security boundaries

### Removed

- Marketing references to internal tooling in public docs

## [1.0.0] - 2026-05-31 (superseded)

Earlier release tag — **do not treat as stable**. Capabilities and security claims in this entry were overstated for the current alpha hardening branch.

[0.1.0-alpha.1]: https://github.com/hbx12/aura-work/compare/v1.0.0...hardening/remove-private-prd-and-security-fixes
