import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { BrowserProfile } from "./types.js";

const PROFILES_ROOT = join(homedir(), ".aura-os", "browser-profiles");
const profiles = new Map<string, BrowserProfile>();

export function ensureProfilesRoot() {
  mkdirSync(PROFILES_ROOT, { recursive: true });
}

export function getOrCreateProfile(projectId: string): BrowserProfile {
  const existing = profiles.get(projectId);
  if (existing) {
    existing.lastUsedAt = new Date().toISOString();
    return existing;
  }
  ensureProfilesRoot();
  const profilePath = join(PROFILES_ROOT, projectId);
  mkdirSync(profilePath, { recursive: true });
  const profile: BrowserProfile = {
    projectId,
    profilePath,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };
  profiles.set(projectId, profile);
  return profile;
}

export function listProfiles(): BrowserProfile[] {
  return [...profiles.values()];
}

export function clearProfiles() {
  profiles.clear();
}
