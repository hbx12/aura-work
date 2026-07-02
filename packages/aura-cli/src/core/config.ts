import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { getConfigPath } from "../utils/platform.js";
import type { ProviderId } from "@aura-os/shared";

export interface AuraConfig {
  /** Agent sidecar URL */
  agentUrl?: string;
  /** Default provider */
  defaultProvider?: ProviderId;
  /** Default model */
  defaultModel?: string;
  /** Default agent */
  defaultAgent?: string;
  /** Default mode */
  defaultMode?: "plan" | "build" | "review" | "safe";
  /** Daily budget in USD */
  dailyBudget?: number;
  /** Session budget in USD */
  sessionBudget?: number;
  /** Theme name */
  theme?: string;
  /** Language preference */
  lang?: "en" | "ar";
  /** Auto-approve low-risk actions */
  autoApprove?: boolean;
  /** Custom settings */
  [key: string]: unknown;
}

const DEFAULT_CONFIG: AuraConfig = {
  agentUrl: "http://127.0.0.1:47821",
  defaultAgent: "build",
  defaultMode: "build",
  theme: "aura-dark",
  lang: "en",
  autoApprove: false,
};

let _config: AuraConfig | null = null;

export function loadConfig(): AuraConfig {
  if (_config) return _config;
  const path = getConfigPath();
  try {
    const raw = readFileSync(path, "utf8");
    _config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    _config = { ...DEFAULT_CONFIG };
  }
  return _config!;
}

export function saveConfig(config: AuraConfig): void {
  const path = getConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  _config = config;
}

export function updateConfig(patch: Partial<AuraConfig>): AuraConfig {
  const config = loadConfig();
  const updated = { ...config, ...patch };
  saveConfig(updated);
  return updated;
}

export function getConfigValue<K extends keyof AuraConfig>(key: K): AuraConfig[K] {
  return loadConfig()[key];
}

export function setConfigValue<K extends keyof AuraConfig>(key: K, value: AuraConfig[K]): void {
  updateConfig({ [key]: value } as Partial<AuraConfig>);
}
