# Release verification

Verify Aura OS installers published on GitHub Releases.

## Checksums

1. Download `SHA256SUMS.txt` from the release page.
2. Download the installer for your platform.
3. Verify:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

On Windows (PowerShell):

```powershell
Get-FileHash .\Aura-OS_1.0.0_x64-setup.exe -Algorithm SHA256
# Compare with SHA256SUMS.txt
```

## Signatures (minisign)

Each installer has a `.minisig` sidecar file. Public key is embedded in `apps/desktop/src-tauri/tauri.conf.json` (updater plugin).

```bash
minisign -V -p minisign.pub -m Aura-OS_1.0.0_amd64.AppImage -x Aura-OS_1.0.0_amd64.AppImage.minisig
```

## SBOM

`sbom.json` (CycloneDX) is attached to each release. Scan with your preferred SBOM tool for supply-chain review.

## In-app updates

The desktop app verifies update manifests (`latest.json`) with the bundled minisign public key before downloading.

## VM image

Bundled Linux workspace image integrity is checked at startup via `bundle/vm-image/manifest.json` SHA-256 and signature fields.

See [docs/features/packaging-cli.md](./features/packaging-cli.md) for build-from-source reproducibility notes.
