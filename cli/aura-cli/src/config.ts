import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CliConfig } from "./bridge.js";
import { CONFIG_PATH } from "./bridge.js";

export function loadConfig(): CliConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function resolveToken(config: CliConfig): string | undefined {
  return process.env.AURA_SESSION_TOKEN?.trim() || config.sessionToken?.trim() || undefined;
}
