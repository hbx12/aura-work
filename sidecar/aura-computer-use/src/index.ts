/**
 * Aura OS Computer Use Helper — Phase 10: experimental screen/app automation
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { detectBackend } from "./backend.js";
import type { BackendInfo } from "./types.js";
import { captureScreenshot, clickAt, focusWindow, listWindows, typeText } from "./platform.js";
import type { ComputerUseState, ComputerUseStatus } from "./types.js";

const PORT = Number(process.env.AURA_COMPUTER_USE_PORT ?? 47828);
const VERSION = "0.10.0";

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

function statusPayload(): ComputerUseStatus {
  const b = backend!;
  return {
    state,
    backend: b.id,
    backendLabel: b.label,
    experimental: b.experimental,
    startedAt,
    lastError,
    remediation: b.remediation,
    running: state === "running",
  };
}

async function ensureBackend() {
  if (!backend) backend = await detectBackend();
}

const server = createServer(async (req, res) => {
  try {
    await ensureBackend();
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (method === "GET" && url === "/health") {
      return json(res, 200, {
        status: state === "running" ? "ok" : "idle",
        phase: 10,
        version: VERSION,
        backend: backend!.id,
        experimental: true,
        message: "Computer use helper — experimental screen capture and desktop automation.",
      });
    }

    if (method === "GET" && url === "/status") {
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/start") {
      state = "running";
      startedAt = new Date().toISOString();
      lastError = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/stop") {
      state = "stopped";
      return json(res, 200, statusPayload());
    }

    if (method === "GET" && url === "/windows") {
      if (state !== "running") {
        return json(res, 503, { error: "Computer use helper is not running. POST /start first." });
      }
      const windows = await listWindows();
      return json(res, 200, { windows, count: windows.length });
    }

    if (method === "POST" && url === "/screenshot") {
      if (state !== "running") {
        return json(res, 503, { error: "Computer use helper is not running." });
      }
      const body = await parseJson<{ windowId?: string }>(req);
      const shot = await captureScreenshot(body.windowId);
      return json(res, 200, shot);
    }

    if (method === "POST" && url === "/focus") {
      if (state !== "running") {
        return json(res, 503, { error: "Computer use helper is not running." });
      }
      const body = await parseJson<{ windowId: string }>(req);
      if (!body.windowId) return json(res, 400, { error: "windowId is required" });
      const result = await focusWindow(body.windowId);
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/click") {
      if (state !== "running") {
        return json(res, 503, { error: "Computer use helper is not running." });
      }
      const body = await parseJson<{ x: number; y: number; button?: "left" | "right" }>(req);
      if (typeof body.x !== "number" || typeof body.y !== "number") {
        return json(res, 400, { error: "x and y are required numbers" });
      }
      const result = await clickAt(body.x, body.y, body.button ?? "left");
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/type") {
      if (state !== "running") {
        return json(res, 503, { error: "Computer use helper is not running." });
      }
      const body = await parseJson<{ text: string }>(req);
      if (!body.text) return json(res, 400, { error: "text is required" });
      const result = await typeText(body.text);
      return json(res, 200, result);
    }

    json(res, 404, { error: "Not found" });
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: lastError, ...statusPayload() });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[aura-computer-use] listening on http://127.0.0.1:${PORT} (experimental)`);
});
