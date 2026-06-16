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
  statSync,
  writeFileSync,
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
  { id: "aura-agent", src: "sidecar/aura-agent/dist", port: 47821 },
  { id: "aura-vm-helper", src: "sidecar/aura-vm-helper/dist", port: 47822 },
  { id: "aura-browser-helper", src: "sidecar/aura-browser-helper/dist", port: 47823 },
  { id: "aura-plugins-helper", src: "sidecar/aura-plugins-helper/dist", port: 47824 },
  { id: "aura-cloud-sync", src: "sidecar/aura-cloud-sync/dist", port: 47825 },
  { id: "aura-bridge", src: "sidecar/aura-bridge/dist", port: 47826 },
  { id: "aura-computer-use", src: "sidecar/aura-computer-use/dist", port: 47828 },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function appVersion() {
  const pkg = readJson(join(root, "package.json"));
  return String(pkg.version ?? "0.0.0");
}

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
  return destination;
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

  if (!existsSync(outfile) || statSync(outfile).size === 0) {
    throw new Error(`[stage-bundle] bundled sidecar is empty: ${id}`);
  }
  if (existsSync(join(destPath, "node_modules"))) {
    throw new Error(`[stage-bundle] sidecar bundle must not include node_modules: ${id}`);
  }

  console.log(`[stage-bundle] bundled ${id}`);
  return outfile;
}

mkdirSync(join(root, "bundle", "sidecars"), { recursive: true });
const nodeRuntimePath = stageNodeRuntime();

for (const sidecar of sidecars) {
  bundleSidecar(sidecar);
}

console.log(`[stage-bundle] done — ${sidecars.length}/${sidecars.length} sidecars bundled`);

const manifest = {
  schemaVersion: "1.0",
  version: appVersion(),
  productName: "Aura Work",
  nodeRuntime: {
    bundled: true,
    minVersion: "20.0.0",
    resourcePath: "node",
    executable: process.platform === "win32" ? "node/node.exe" : "node/bin/node",
    note: "Installed builds use this bundled Node runtime; development builds may use workspace Node.",
  },
  vmImage: {
    imageId: "aura-linux-workspace",
    version: appVersion(),
    manifestPath: "vm-image/manifest.json",
    signatureRequired: true,
  },
  sidecars: sidecars.map((sidecar) => ({
    id: sidecar.id,
    port: sidecar.port,
    resourcePath: `sidecars/${sidecar.id}`,
    entry: `sidecars/${sidecar.id}/dist/index.js`,
  })),
  updates: {
    source: "github-releases",
    verification: "minisign",
    endpointTemplate: "https://github.com/hbx12/aura-work/releases/latest/download/latest.json",
  },
};

writeFileSync(join(root, "bundle", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

for (const sidecar of sidecars) {
  const entry = join(root, "bundle", "sidecars", sidecar.id, "dist", "index.js");
  if (!existsSync(entry)) {
    throw new Error(`[stage-bundle] manifest entry missing from bundle: ${sidecar.id}`);
  }
}
if (!existsSync(nodeRuntimePath)) {
  throw new Error("[stage-bundle] bundled Node runtime missing after staging");
}
console.log("[stage-bundle] manifest written and bundle layout verified");

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
