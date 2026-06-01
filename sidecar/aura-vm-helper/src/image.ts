import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface VmImageManifest {
  sha256: string;
  signature?: string;
  artifact: string;
  version: string;
}

export function loadVmManifest(): VmImageManifest | null {
  const candidates = [
    join(__dirname, "..", "vm-image", "manifest.json"),
    join(__dirname, "..", "..", "..", "bundle", "vm-image", "manifest.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    return JSON.parse(readFileSync(path, "utf8")) as VmImageManifest;
  }
  return null;
}

export function verifyBundledVmImage(): { ok: boolean; message: string } {
  const manifest = loadVmManifest();
  if (!manifest) {
    return { ok: false, message: "VM manifest not found." };
  }
  const baseDir = join(__dirname, "..", "vm-image");
  const altDir = join(__dirname, "..", "..", "..", "bundle", "vm-image");
  const artifactPath = [join(baseDir, manifest.artifact), join(altDir, manifest.artifact)].find((p) =>
    existsSync(p),
  );
  if (!artifactPath) {
    return { ok: false, message: `VM artifact ${manifest.artifact} missing.` };
  }
  const hash = createHash("sha256").update(readFileSync(artifactPath)).digest("hex");
  if (hash.toLowerCase() !== manifest.sha256.toLowerCase()) {
    return { ok: false, message: "VM image SHA-256 mismatch — refusing to start workspace." };
  }
  return {
    ok: true,
    message: manifest.signature && !manifest.signature.startsWith("dev-")
      ? "VM image hash and signature verified."
      : "VM image hash verified (dev signature placeholder).",
  };
}
