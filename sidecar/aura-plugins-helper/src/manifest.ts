import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PluginManifest } from "./types.js";

const MANIFEST_NAMES = ["aura.plugin.json", "plugin.json"];

export function readManifestFromDir(installPath: string): PluginManifest {
  for (const name of MANIFEST_NAMES) {
    const path = join(installPath, name);
    if (existsSync(path)) {
      const raw = readFileSync(path, "utf8");
      return validateManifest(JSON.parse(raw) as PluginManifest);
    }
  }
  throw new Error(`No plugin manifest found in ${installPath}`);
}

export function validateManifest(m: PluginManifest): PluginManifest {
  if (!m.schemaVersion) throw new Error("Manifest missing schemaVersion");
  if (!m.id || !/^[a-z0-9][a-z0-9.-]*$/i.test(m.id)) {
    throw new Error("Manifest missing or invalid id");
  }
  if (!m.name) throw new Error("Manifest missing name");
  if (!m.version) throw new Error("Manifest missing version");
  return m;
}

export function manifestTools(m: PluginManifest) {
  return m.tools ?? [];
}
