import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

export function getAuraHome(): string {
  const envHome = process.env.AURA_HOME;
  if (envHome) return resolve(envHome);
  return join(homedir(), ".aura");
}

export function ensureAuraHome(): string {
  const home = getAuraHome();
  if (!existsSync(home)) {
    mkdirSync(home, { recursive: true });
  }
  return home;
}

export function getDbPath(): string {
  return join(getAuraHome(), "aura.db");
}

export function getConfigPath(): string {
  return process.env.AURA_CLI_CONFIG ?? join(getAuraHome(), "config.json");
}

export function resolveProjectPath(input?: string): string {
  if (!input || input === ".") return process.cwd();
  return resolve(input);
}

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function isMacOS(): boolean {
  return process.platform === "darwin";
}

export function isLinux(): boolean {
  return process.platform === "linux";
}
