/**
 * Aura OS VM Helper — Phase 4: Linux workspace lifecycle + shell execution
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadSidecarToken, requireSidecarAuth } from "@aura-os/shared";
import { detectBackend, type BackendInfo } from "./backend.js";
import { execCommand } from "./exec.js";
import { clearMounts, listMounts, mountProject } from "./mounts.js";
import { verifyBundledVmImage } from "./image.js";
import type { ExecRequest, MountRequest, VmState, VmStatus } from "./types.js";

const PORT = Number(process.env.AURA_VM_PORT ?? 47822);
const AUTH_TOKEN = loadSidecarToken();
const IMAGE_VERSION = "1.0.0";

let backend: BackendInfo | null = null;
let vmState: VmState = "stopped";
let startedAt: string | undefined;
let lastError: string | undefined;

async function parseJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function statusPayload(): VmStatus {
  const b = backend!;
  return {
    state: vmState,
    backend: b.id,
    backendLabel: b.label,
    imageVersion: IMAGE_VERSION,
    mounts: listMounts(),
    startedAt,
    lastError,
    remediation: b.remediation,
    running: vmState === "running",
  };
}

async function ensureBackend() {
  if (!backend) backend = await detectBackend();
}

const server = createServer(async (req, res) => {
  if (!requireSidecarAuth(req, res, AUTH_TOKEN)) return;
  try {
    await ensureBackend();
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (method === "GET" && url === "/health") {
      return json(res, 200, {
        status: vmState === "running" ? "ok" : "idle",
        phase: 14,
        version: "1.0.0",
        backend: backend!.id,
        message: "VM helper — workspace lifecycle, shell execution, and image verification active.",
      });
    }

    if (method === "GET" && url === "/status") {
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/start") {
      const verification = verifyBundledVmImage();
      if (!verification.ok) {
        vmState = "unavailable";
        lastError = verification.message;
        return json(res, 503, { error: lastError, ...statusPayload() });
      }
      if (!backend!.available && backend!.id !== "process-sandbox") {
        vmState = "unavailable";
        lastError = backend!.remediation ?? "Hypervisor backend unavailable";
        return json(res, 503, { error: lastError, ...statusPayload() });
      }
      vmState = "running";
      startedAt = new Date().toISOString();
      lastError = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/stop") {
      clearMounts();
      vmState = "stopped";
      startedAt = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/mount") {
      if (vmState !== "running") {
        return json(res, 409, { error: "VM is not running. POST /start first." });
      }
      const body = await parseJson<MountRequest>(req);
      const mount = mountProject(body);
      return json(res, 200, mount);
    }

    if (method === "POST" && url === "/exec") {
      if (vmState !== "running") {
        return json(res, 409, {
          error: "workspace unavailable: VM is not running. Start VM helper first.",
          remediation: "Run: npm run vm-helper",
        });
      }
      const body = await parseJson<ExecRequest>(req);
      try {
        const result = await execCommand(backend!, body);
        return json(res, 200, result);
      } catch (e) {
        const msg = String(e);
        lastError = msg;
        return json(res, 503, {
          error: msg.startsWith("workspace unavailable") ? msg : `Execution failed: ${msg}`,
          remediation: backend!.remediation,
        });
      }
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error("[aura-vm-helper] error", e);
    json(res, 500, { error: String(e) });
  }
});

server.listen(PORT, "127.0.0.1", async () => {
  backend = await detectBackend();
  console.log(`[aura-vm-helper] listening on http://127.0.0.1:${PORT}`);
  console.log(`[aura-vm-helper] v1.0.0 — backend: ${backend.label}`);
});
