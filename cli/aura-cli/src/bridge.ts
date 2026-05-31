import { homedir } from "node:os";
import { join } from "node:path";

export const BRIDGE_URL = process.env.AURA_BRIDGE_URL ?? "http://127.0.0.1:47826";
export const CONFIG_PATH =
  process.env.AURA_CLI_CONFIG ?? join(homedir(), ".aura", "config.json");

export interface CliConfig {
  bridgeUrl?: string;
  sessionToken?: string;
}

export interface BridgeHealth {
  status: string;
  phase: number;
  version: string;
  message?: string;
}

export class BridgeOfflineError extends Error {
  constructor() {
    super(
      "Aura desktop is not running or the local bridge is offline.\n" +
        "Open Aura OS and ensure the bridge is started (Extensions page).\n" +
        "CLI cannot bypass permissions and requires a running desktop session.",
    );
    this.name = "BridgeOfflineError";
  }
}

export async function bridgeFetch<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const url = `${process.env.AURA_BRIDGE_URL ?? BRIDGE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { "X-Aura-Session-Token": options.token } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new BridgeOfflineError();
  }
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (res.status === 503 || res.status === 502) {
    throw new BridgeOfflineError();
  }
  if (!res.ok) {
    const err = (data as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

export function usage(): string {
  return `Aura OS CLI — local bridge companion (Phase 11)

Usage:
  aura status
  aura projects
  aura pair --code <code> [--name <name>]
  aura task create --project <id> --prompt "<text>" [--no-start]
  aura task get <taskId>
  aura task logs <taskId>
  aura open task <taskId>

Environment:
  AURA_SESSION_TOKEN   Paired session token (overrides config file)
  AURA_BRIDGE_URL      Bridge base URL (default http://127.0.0.1:47826)
  AURA_CLI_CONFIG      Config path (default ~/.aura/config.json)

Notes:
  - CLI uses the local bridge; it cannot bypass permissions.
  - Fails if Aura desktop is not running.
  - Pair via Extensions → generate code, then: aura pair --code <code>
`;
}
