# Publishing Aura Work releases

Aura Work publishes optional signed desktop updates from GitHub Releases. Merging a pull request does not publish an application update.

## One-time repository setup

1. Create a GitHub Environment named `production`.
2. Add yourself as a required reviewer for the `production` environment.
3. Generate a Tauri updater signing key pair locally from the desktop workspace:

   `npm run tauri -w @aura-os/desktop -- signer generate -- -w ~/.tauri/aura-work.key`

4. Back up the private key outside the repository. Never commit it.
5. Add the generated public key as the repository variable `TAURI_UPDATER_PUBLIC_KEY`.
6. Add the private key contents as the repository secret `TAURI_SIGNING_PRIVATE_KEY`.
7. Add the optional key password as the repository secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
8. Keep the existing `MINISIGN_PRIVATE_KEY` secret configured for release installer signatures.

## Preparing a release

1. Merge the selected changes into `main`.
2. Update the version consistently in:
   - `package.json`
   - `apps/desktop/package.json`
   - `apps/desktop/src-tauri/Cargo.toml`
   - `apps/desktop/src-tauri/tauri.conf.json`
3. Run CI and the installer smoke checklist.
4. Open GitHub Actions, select `Release`, and choose `Run workflow` from `main`.
5. Enter the new SemVer version, such as `0.1.1-alpha.1`.
6. Approve the `production` deployment when GitHub requests approval.

## Result

The release workflow builds installers, generates signed updater artifacts, creates `latest.json`, publishes checksums and an SBOM, and uploads a GitHub Release. Installed copies of Aura Work check the latest release after startup and ask the user before downloading and installing an update.

## App preview image

The main README displays `docs/assets/aura-work-preview.svg`. Replace it with the final application screenshot before a public release while keeping the same path.
