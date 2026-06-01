#!/usr/bin/env node
/**
 * Stage compiled sidecar dist/ folders into bundle/sidecars/ for Tauri resource bundling.
 */
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isProduction = process.env.NODE_ENV === "production" || process.env.CI === "true";

const sidecars = [
  { id: "aura-agent", src: "sidecar/aura-agent/dist" },
  { id: "aura-vm-helper", src: "sidecar/aura-vm-helper/dist" },
  { id: "aura-browser-helper", src: "sidecar/aura-browser-helper/dist" },
  { id: "aura-plugins-helper", src: "sidecar/aura-plugins-helper/dist" },
  { id: "aura-cloud-sync", src: "sidecar/aura-cloud-sync/dist" },
  { id: "aura-bridge", src: "sidecar/aura-bridge/dist" },
  { id: "aura-computer-use", src: "sidecar/aura-computer-use/dist" },
];

const outRoot = join(root, "bundle", "sidecars");
mkdirSync(outRoot, { recursive: true });

let staged = 0;
let missing = 0;
for (const { id, src } of sidecars) {
  const srcPath = join(root, src);
  const destPath = join(outRoot, id);
  if (!existsSync(srcPath)) {
    console.error(`[stage-bundle] ERROR: required sidecar missing: ${id} (${srcPath})`);
    missing++;
    continue;
  }
  rmSync(destPath, { recursive: true, force: true });
  cpSync(srcPath, join(destPath, "dist"), { recursive: true });
  staged++;
  console.log(`[stage-bundle] staged ${id}`);
}

if (missing > 0) {
  console.error(`[stage-bundle] FAILED — ${missing} required sidecar(s) missing. Run: npm run build:sidecars`);
  process.exit(1);
}

console.log(`[stage-bundle] done — ${staged}/${sidecars.length} sidecars staged to bundle/sidecars/`);

if (isProduction) {
  const vmManifest = join(root, "bundle", "vm-image", "manifest.json");
  if (existsSync(vmManifest)) {
    const raw = readFileSync(vmManifest, "utf8");
    const manifest = JSON.parse(raw);
    if (
      String(manifest.signature ?? "").includes("dev-placeholder") ||
      String(manifest.artifact ?? "").includes("placeholder")
    ) {
      console.error("[stage-bundle] ERROR: VM placeholder artifact detected in production build.");
      process.exit(1);
    }
  }
}
