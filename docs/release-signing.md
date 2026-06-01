# Release signing setup

Maintainers use this guide to configure signed GitHub Releases and in-app updates for Aura Work.

## Minisign (artifact checksums)

Generate a keypair on a secure machine:

```bash
minisign -G -p minisign.pub -s minisign.key
```

1. Add the **private key file contents** to GitHub repository secret `MINISIGN_PRIVATE_KEY`.
2. Commit `minisign.pub` to the repo (or publish on the release page).
3. Encode the public key for Tauri updater in `apps/desktop/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

The release workflow signs installers when `MINISIGN_PRIVATE_KEY` is set; otherwise signing is skipped.

## Tauri updater

1. Generate updater keys: `npm run tauri signer generate -w @aura-os/desktop`
2. Store the private key in `TAURI_SIGNING_PRIVATE_KEY` (GitHub secret).
3. Replace the placeholder `pubkey` in `tauri.conf.json` with the generated public key.
4. Ensure `createUpdaterArtifacts: true` remains enabled so `latest.json` is produced during `tauri build`.

## Platform codesign (optional, recommended for production)

| Platform | GitHub secrets / env |
|----------|----------------------|
| Windows | `TAURI_SIGNING_PRIVATE_KEY` (Authenticode) |
| macOS | `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, notarization API keys |

See [Tauri v2 signing docs](https://v2.tauri.app/distribute/sign/) for full setup.

## Release checklist

1. Bump version in `apps/desktop/src-tauri/tauri.conf.json` and `package.json`.
2. `npm run build:sidecars && npm run stage:bundle && npm run tauri build -w @aura-os/desktop`
3. Tag: `git tag v1.0.1 && git push origin v1.0.1`
4. CI builds matrix installers, publishes SBOM + checksums + installers + updater manifest to GitHub Releases.

## Verification (users)

See [release-verification.md](./release-verification.md) for checksum and minisign verification steps.
