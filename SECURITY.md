# Security Policy

## Supported versions

| Version | Supported | Notes |
| ------- | --------- | ----- |
| 0.1.x-alpha | :warning: Best-effort | Active hardening; not for sensitive workloads |
| < 0.1.0-alpha.1 | :x: | Superseded pre-alpha releases |

**Aura Work is in alpha.** Experimental features (computer use, host shell fallback, VM placeholder artifacts) are disabled or incomplete by default.

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Please report issues privately:

1. **GitHub:** [Private security advisory](https://github.com/hbx12/aura-work/security/advisories/new)

Include:

- Affected component (desktop, sidecar, cloud server, bridge, extension)
- Steps to reproduce
- Impact assessment (data exposure, privilege escalation, etc.)
- Suggested fix if available

We aim to acknowledge reports within **72 hours** and provide a remediation timeline within **14 days** for confirmed issues.

## Security posture (alpha)

Aura Work is designed **local-first**:

- API keys are stored in an encrypted local vault. Device keys prefer OS secure storage (Windows DPAPI / macOS Keychain / Linux Secret Service).
- Keys are **never** synced to Aura Cloud.
- No telemetry is enabled by default.
- Local sidecars require per-session internal Bearer tokens — localhost binding alone is not sufficient.
- High-impact actions (permanent delete, computer use, remote dispatch) require explicit user approval or remain disabled.
- **Shell execution:** Host process fallback is **off by default**. Isolated backends (WSL2, verified VM image) are required for production intent.
- **Computer use:** **Off by default** until explicitly enabled for development.
- **VM isolation:** Not considered complete until the bundled artifact and minisign signature are verified in a production build. Development placeholders must not ship.

## Secret scanning

CI runs secret detection on every push and pull request. Commits containing API keys, tokens, or private keys will fail the pipeline.

If you accidentally commit a secret:

1. Rotate/revoke the credential immediately.
2. Open a private security advisory — do not force-push shared branches without maintainer coordination.

## Signed releases

Production releases **require**:

- SHA-256 checksums (`SHA256SUMS.txt`)
- minisign signatures (`*.minisig`)
- CycloneDX SBOM (`sbom.json`)
- Installer artifacts for each target platform

Signed installers are **not claimed available** until published on GitHub Releases with all artifacts present. Verify downloads using [docs/release-verification.md](./docs/release-verification.md) when available.

## Bug bounty

There is no paid bug bounty program during alpha. We credit researchers in release notes with permission.

## Planned hardening (post-alpha)

- Unix domain sockets / named pipes for sidecar IPC instead of static localhost ports
- Git history cleanup for removed private documents (requires explicit maintainer approval)
- Branch protection on `main` after history rewrite
