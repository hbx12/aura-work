import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

export function generateSidecarAuthToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: T = {} as T;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      body = { raw: text } as T;
    }
  }
  return { status: res.status, body };
}

export interface SpawnedServer {
  port: number;
  baseUrl: string;
  sidecarAuthToken?: string;
  stop: () => Promise<void>;
}

export async function spawnNodeServer(
  scriptRelative: string,
  env: Record<string, string> = {},
): Promise<SpawnedServer> {
  const port = await pickFreePort();
  const script = join(REPO_ROOT, scriptRelative);
  const sidecarAuthToken = env.AURA_SIDECAR_AUTH_TOKEN ?? generateSidecarAuthToken();
  let proc: ChildProcess | undefined;
  let stderr = "";

  await new Promise<void>((resolve, reject) => {
    proc = spawn(process.execPath, [script], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        ...env,
        AURA_SIDECAR_AUTH_TOKEN: sidecarAuthToken,
        AURA_CLOUD_PORT: String(port),
        AURA_BRIDGE_PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => reject(new Error(`Server timeout: ${scriptRelative}`)), 15_000);
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited ${code}: ${stderr}`));
      }
    });
    // Poll health as fallback
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, {
          headers: { Authorization: `Bearer ${sidecarAuthToken}` },
        });
        if (res.ok) {
          clearTimeout(timer);
          clearInterval(poll);
          resolve();
        }
      } catch {
        /* retry */
      }
    }, 200);
  });

  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    sidecarAuthToken,
    stop: async () => {
      if (proc && !proc.killed) {
        proc.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 300));
        if (!proc.killed) proc.kill("SIGKILL");
      }
    },
  };
}

async function pickFreePort(): Promise<number> {
  const { createServer } = await import("node:http");
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Could not bind port"));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

export async function tempDataPath(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "aura-qa-"));
  return {
    path: join(dir, "store.json"),
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
