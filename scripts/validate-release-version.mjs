import { readFile } from "node:fs/promises";

const requestedVersion = process.argv[2]?.replace(/^v/, "");

if (!requestedVersion) {
  throw new Error("Usage: node scripts/validate-release-version.mjs <version>");
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(requestedVersion)) {
  throw new Error(`Invalid SemVer release version: ${requestedVersion}`);
}

const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
const desktopPackage = JSON.parse(await readFile("apps/desktop/package.json", "utf8"));
const tauriConfig = JSON.parse(await readFile("apps/desktop/src-tauri/tauri.conf.json", "utf8"));
const cargoToml = await readFile("apps/desktop/src-tauri/Cargo.toml", "utf8");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

const versions = {
  "package.json": rootPackage.version,
  "apps/desktop/package.json": desktopPackage.version,
  "apps/desktop/src-tauri/tauri.conf.json": tauriConfig.version,
  "apps/desktop/src-tauri/Cargo.toml": cargoVersion,
};

for (const [file, version] of Object.entries(versions)) {
  if (version !== requestedVersion) {
    throw new Error(`${file} has version ${version ?? "<missing>"}, expected ${requestedVersion}`);
  }
}

console.log(`Release version ${requestedVersion} is consistent across Aura Work manifests.`);
