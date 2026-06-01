import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { REPO_ROOT } from "./http.js";

export function assertRepoFile(relative: string): string {
  const full = join(REPO_ROOT, relative);
  if (!existsSync(full)) {
    throw new Error(`Missing required file: ${relative}`);
  }
  return full;
}

export function readJson<T>(relative: string): T {
  const raw = readFileSync(assertRepoFile(relative), "utf8");
  return JSON.parse(raw) as T;
}

export function listLocaleFiles(): string[] {
  const dir = join(REPO_ROOT, "packages", "i18n", "locales");
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

export function verifyVmBundleHash(): { ok: boolean; message: string } {
  const manifest = readJson<{ sha256: string; artifact: string }>("bundle/vm-image/manifest.json");
  const artifactPath = join(REPO_ROOT, "bundle", "vm-image", manifest.artifact);
  if (!existsSync(artifactPath)) {
    return { ok: false, message: `VM artifact missing: ${manifest.artifact}` };
  }
  const hash = createHash("sha256").update(readFileSync(artifactPath)).digest("hex");
  if (hash.toLowerCase() !== manifest.sha256.toLowerCase()) {
    return { ok: false, message: "VM image SHA-256 mismatch." };
  }
  return { ok: true, message: "VM image hash verified." };
}

export const PRD_SUITE = [
  { id: "5.1", title: "Local Project Coding Flow", automated: "partial", manual: true },
  { id: "5.2", title: "Local-Only Ollama Flow", automated: "partial", manual: true },
  { id: "5.3", title: "Scheduled Task Permissions", automated: "rust-unit", manual: true },
  { id: "5.4", title: "Remote Dispatch Closed App", automated: "full", manual: false },
  { id: "5.5", title: "Remote Dispatch Sleeping Device", automated: "full", manual: false },
  { id: "5.6", title: "Chrome Extension Approval", automated: "partial", manual: true },
  { id: "5.7", title: "Office Add-in Delegation", automated: "partial", manual: true },
  { id: "5.8", title: "E2EE Cloud Sync", automated: "full", manual: true },
  { id: "5.9", title: "High-Impact Actions", automated: "rust-unit", manual: true },
  { id: "5.10", title: "Computer Use Safety", automated: "rust-unit", manual: true },
] as const;

export const PLATFORMS = ["macOS", "Windows", "Linux"] as const;
