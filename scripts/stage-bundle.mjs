#!/usr/bin/env node
/**
 * Stage compiled sidecar dist/ folders into bundle/sidecars/ for Tauri resource bundling.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
for (const { id, src } of sidecars) {
  const srcPath = join(root, src);
  const destPath = join(outRoot, id);
  if (!existsSync(srcPath)) {
    console.warn(`[stage-bundle] skip ${id}: ${srcPath} not found (run npm run build:sidecars first)`);
    continue;
  }
  rmSync(destPath, { recursive: true, force: true });
  cpSync(srcPath, join(destPath, "dist"), { recursive: true });
  staged++;
  console.log(`[stage-bundle] staged ${id}`);
}

console.log(`[stage-bundle] done — ${staged}/${sidecars.length} sidecars staged to bundle/sidecars/`);
