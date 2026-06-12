# Publishing Aura Work releases

Aura Work publishes optional signed desktop updates from GitHub Releases. Merging a pull request does not publish an application update.

## One-time repository setup

1. Create a GitHub Environment named `production`.
2. Add yourself as a required reviewer for the `production` environment.
3. Generate a Tauri updater signing key pair locally from the desktop workspace:

   `npm run tauri -w @aura-os/desktop -- signer generate -- -w ~/.tauri/aura-work.key`

4. Back up the private key outside the repository. Never commit it.
5. Inside the `production` environment, add the generated public key as the environment variable `TAURI_UPDATER_PUBLIC_KEY`.
6. Inside the `production` environment, add the private key contents as the environment secret `TAURI_SIGNING_PRIVATE_KEY`.
7. Inside the `production` environment, add the optional key password as the environment secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
8. Inside the `production` environment, keep `MINISIGN_PRIVATE_KEY` configured for release installer signatures.

The release build jobs and the final publish job both use the `production` environment. GitHub requires maintainer approval before the protected updater signing values become available.

## Preparing a release

1. Merge the selected changes into `main`.
2. Open GitHub Actions, select `Release`, and choose `Run workflow` from `main`.
3. Enter the SemVer version, such as `0.1.1-alpha.1`.
4. Approve the `production` deployment when GitHub requests approval.

The workflow applies the entered release version to the temporary build manifests automatically. The source manifests do not need a separate version-bump commit for each release.

## Result

The release workflow builds installers, generates signed updater artifacts, creates `latest.json`, publishes checksums and an SBOM, and uploads a GitHub Release. Installed copies of Aura Work check the latest release after startup and ask the user before downloading and installing an update.

## App preview image

The main README displays `docs/assets/aura-work-preview.svg`. Replace it with the final application screenshot before a public release while keeping the same path.
