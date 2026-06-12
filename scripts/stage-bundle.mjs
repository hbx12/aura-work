#!/usr/bin/env node
/**
 * Stage self-contained Node sidecars and a Node runtime into bundle/ for Tauri.
 *
 * Development builds still use workspace sidecars. Installed builds use:
 *   resources/node/(node.exe|bin/node)
 *   resources/sidecars/<id>/dist/index.js
 */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildSync } = require("esbuild");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isProduction = process.env.AURA_RELEASE_BUILD === "1";
const releaseVersion = process.env.AURA_RELEASE_VERSION ?? "";
const allowAlphaVmPlaceholder =
  process.env.AURA_ALLOW_VM_PLACEHOLDER_RELEASE === "1" &&
  releaseVersion.includes("-alpha");

const sidecars = [
  { id: "aura-agent", src: "sidecar/aura-agent/dist" },
  { id: "aura-vm-helper", src: "sidecar/aura-vm-helper/dist" },
  { id: "aura-browser-helper", src: "sidecar/aura-browser-helper/dist" },
  { id: "aura-plugins-helper", src: "sidecar/aura-plugins-helper/dist" },
  { id: "aura-cloud-sync", src: "sidecar/aura-cloud-sync/dist" },
  { id: "aura-bridge", src: "sidecar/aura-bridge/dist" },
  { id: "aura-computer-use", src: "sidecar/aura-computer-use/dist" },
];

function stageNodeRuntime() {
  const nodeRoot = join(root, "bundle", "node");
  rmSync(nodeRoot, { recursive: true, force: true });

  const windows = process.platform === "win32";
  const destination = windows
    ? join(nodeRoot, "node.exe")
    : join(nodeRoot, "bin", "node");

  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(process.execPath, destination);

  if (!windows) chmodSync(destination, 0o755);

  console.log(`[stage-bundle] staged Node runtime: ${destination}`);
}

function bundleSidecar({ id, src }) {
  const srcPath = join(root, src);
  const entry = join(srcPath, "index.js");
  const destPath = join(root, "bundle", "sidecars", id);
  const outfile = join(destPath, "dist", "index.js");

  if (!existsSync(entry)) {
    throw new Error(
      `[stage-bundle] required sidecar missing: ${id} (${entry}). Run: npm run build:sidecars`,
    );
  }

  rmSync(destPath, { recursive: true, force: true });
  mkdirSync(dirname(outfile), { recursive: true });

  buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "bundle",
    sourcemap: false,
    logLevel: "warning",
    banner: {
      js: 'import { createRequire as __auraCreateRequire } from "node:module"; const require = __auraCreateRequire(import.meta.url);',
    },
  });

  console.log(`[stage-bundle] bundled ${id}`);
}

mkdirSync(join(root, "bundle", "sidecars"), { recursive: true });
stageNodeRuntime();

for (const sidecar of sidecars) {
  bundleSidecar(sidecar);
}

console.log(`[stage-bundle] done — ${sidecars.length}/${sidecars.length} sidecars bundled`);

if (isProduction) {
  const vmManifest = join(root, "bundle", "vm-image", "manifest.json");
  if (existsSync(vmManifest)) {
    const raw = readFileSync(vmManifest, "utf8");
    const manifest = JSON.parse(raw);
    const hasPlaceholder =
      String(manifest.signature ?? "").includes("dev-placeholder") ||
      String(manifest.artifact ?? "").includes("placeholder");

    if (hasPlaceholder && allowAlphaVmPlaceholder) {
      console.warn(
        `[stage-bundle] WARNING: VM placeholder artifact allowed for alpha release ${releaseVersion}. VM-backed isolation remains unavailable until a signed VM image is published.`,
      );
    } else if (hasPlaceholder) {
      console.error(
        "[stage-bundle] ERROR: VM placeholder artifact detected. Stable releases require a signed production VM image.",
      );
      process.exit(1);
    }
  }
}
