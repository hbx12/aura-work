/**
 * Aura Work Computer Use Helper — experimental screen/app automation.
 * Disabled by default until the internal sidecar authentication layer is enabled.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadSidecarToken, requireSidecarAuth } from "@aura-os/shared";
import { detectBackend } from "./backend.js";
import type { BackendInfo } from "./types.js";
import { captureScreenshot, clickAt, focusWindow, listWindows, typeText } from "./platform.js";
import type { ComputerUseState, ComputerUseStatus } from "./types.js";

const PORT = Number(process.env.AURA_COMPUTER_USE_PORT ?? 47828);
const VERSION = "0.1.0-alpha.1";
const AUTH_TOKEN = loadSidecarToken();
const ENABLED = process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE === "1";

let backend: BackendInfo | null = null;
let state: ComputerUseState = "stopped";
let startedAt: string | undefined;
let lastError: string | undefined;

async function parseJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {} as T;
  return JSON.parse(raw) as T;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function auditLog(action: string, detail: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      audit: true,
      component: "aura-computer-use",
      action,
      at: new Date().toISOString(),
      ...detail,
    }),
  );
}

function disabledMessage() {
  return "Computer use is disabled by default in this alpha build. Enable it only for local development with AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE=1 after reviewing the security implications.";
}

function ensureEnabled(res: ServerResponse): boolean {
  if (ENABLED) return true;
  json(res, 403, { error: disabledMessage(), experimental: true, enabled: false });
  return false;
}

function statusPayload(): ComputerUseStatus {
  const b = backend!;
  return {
    state,
    backend: b.id,
    backendLabel: b.label,
    experimental: true,
    startedAt,
    lastError: ENABLED ? lastError : disabledMessage(),
    remediation: ENABLED
      ? b.remediation
      : "Computer use remains disabled until internal sidecar authentication and a full local security review are completed.",
    running: ENABLED && state === "running",
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
        status: ENABLED && state === "running" ? "ok" : "disabled",
        phase: 10,
        version: VERSION,
        backend: backend!.id,
        experimental: true,
        enabled: ENABLED,
        message: ENABLED
          ? "Computer use helper — experimental screen capture and desktop automation."
          : disabledMessage(),
      });
    }

    if (method === "GET" && url === "/status") {
      return json(res, 200, statusPayload());
    }

    if (!ensureEnabled(res)) return;

    if (method === "POST" && url === "/start") {
      auditLog("start", {});
      state = "running";
      startedAt = new Date().toISOString();
      lastError = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/stop") {
      state = "stopped";
      startedAt = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "GET" && url === "/windows") {
      if (state !== "running") return json(res, 503, { error: "Computer use helper is not running. POST /start first." });
      const windows = await listWindows();
      return json(res, 200, { windows, count: windows.length });
    }

    if (method === "POST" && url === "/screenshot") {
      if (state !== "running") return json(res, 503, { error: "Computer use helper is not running." });
      const body = await parseJson<{ windowId?: string }>(req);
      auditLog("screenshot", { windowId: body.windowId ?? null, persisted: false });
      const shot = await captureScreenshot(body.windowId);
      return json(res, 200, shot);
    }

    if (method === "POST" && url === "/focus") {
      if (state !== "running") return json(res, 503, { error: "Computer use helper is not running." });
      const body = await parseJson<{ windowId: string }>(req);
      if (!body.windowId) return json(res, 400, { error: "windowId is required" });
      return json(res, 200, await focusWindow(body.windowId));
    }

    if (method === "POST" && url === "/click") {
      if (state !== "running") return json(res, 503, { error: "Computer use helper is not running." });
      const body = await parseJson<{ x: number; y: number; button?: "left" | "right" }>(req);
      if (typeof body.x !== "number" || typeof body.y !== "number") {
        return json(res, 400, { error: "x and y are required numbers" });
      }
      return json(res, 200, await clickAt(body.x, body.y, body.button ?? "left"));
    }

    if (method === "POST" && url === "/type") {
      if (state !== "running") return json(res, 503, { error: "Computer use helper is not running." });
      const body = await parseJson<{ text: string }>(req);
      if (!body.text) return json(res, 400, { error: "text is required" });
      return json(res, 200, await typeText(body.text));
    }

    return json(res, 404, { error: "Not found" });
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    return json(res, 500, { error: lastError, ...statusPayload() });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[aura-computer-use] listening on http://127.0.0.1:${PORT} (experimental, enabled=${ENABLED})`);
});
