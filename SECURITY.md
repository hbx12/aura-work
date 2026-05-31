# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Please report issues privately:

1. **Email:** security@aura-os.dev
2. **GitHub:** [Private security advisory](https://github.com/hbx12/aura-work/security/advisories/new)

Include:

- Affected component (desktop, sidecar, cloud server, bridge, extension, website)
- Steps to reproduce
- Impact assessment (data exposure, privilege escalation, etc.)
- Suggested fix if available

We aim to acknowledge reports within **72 hours** and provide a remediation timeline within **14 days** for confirmed issues.

## Security posture

Aura OS is designed **local-first**:

- API keys are stored in an encrypted local vault and **never** synced to Aura Cloud.
- No telemetry is enabled by default.
- High-impact actions (permanent delete, computer use, remote dispatch) require explicit user approval.
- The bundled Linux VM isolates shell execution from the host filesystem except approved project mounts.

## Secret scanning

CI runs secret detection on every push and pull request. Commits containing API keys, tokens, or private keys will fail the pipeline.

If you accidentally commit a secret:

1. Rotate/revoke the credential immediately.
2. Contact security@aura-os.dev — do not force-push to shared branches without maintainer coordination.

## Signed releases

Production installers are published to GitHub Releases with:

- SHA-256 checksums (`SHA256SUMS`)
- minisign signatures (`*.minisig`)
- CycloneDX SBOM (`sbom.json`)

Verify downloads using the instructions in [docs/release-verification.md](./docs/release-verification.md).

## Bug bounty

There is no paid bug bounty program at v1.0.0. We credit researchers in release notes with permission.
