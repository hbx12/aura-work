import { readFile, writeFile } from "node:fs/promises";

const configPath = "apps/desktop/src-tauri/tauri.conf.json";
const publicKey = process.env.TAURI_UPDATER_PUBLIC_KEY?.trim();

if (!publicKey) {
  throw new Error("TAURI_UPDATER_PUBLIC_KEY is required for official updater builds.");
}

if (publicKey === "REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY") {
  throw new Error("TAURI_UPDATER_PUBLIC_KEY still contains the placeholder value.");
}

const config = JSON.parse(await readFile(configPath, "utf8"));
config.bundle ??= {};
config.bundle.createUpdaterArtifacts = true;
config.plugins ??= {};
config.plugins.updater ??= {};
config.plugins.updater.pubkey = publicKey;

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log("Prepared Tauri updater configuration for an official signed release.");
