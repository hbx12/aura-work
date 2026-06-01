/**
 * Aura OS Browser Helper — Phase 5: Chromium automation + per-project profiles
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadSidecarToken, requireSidecarAuth } from "@aura-os/shared";
import { detectBackend, type BackendInfo } from "./backend.js";
import { browsePage } from "./browse.js";
import { clearProfiles, listProfiles } from "./profiles.js";
import type { BrowseRequest, BrowserState, BrowserStatus, ProfileRequest } from "./types.js";

const PORT = Number(process.env.AURA_BROWSER_PORT ?? 47823);
const AUTH_TOKEN = loadSidecarToken();

let backend: BackendInfo | null = null;
let browserState: BrowserState = "stopped";
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

function statusPayload(): BrowserStatus {
  const b = backend!;
  return {
    state: browserState,
    backend: b.id,
    backendLabel: b.label,
    profiles: listProfiles(),
    startedAt,
    lastError,
    remediation: b.remediation,
    running: browserState === "running",
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
        status: browserState === "running" ? "ok" : "idle",
        phase: 5,
        version: "0.5.0",
        backend: backend!.id,
        message: "Browser helper — Chromium automation and per-project profiles active.",
      });
    }

    if (method === "GET" && url === "/status") {
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/start") {
      browserState = "running";
      startedAt = new Date().toISOString();
      lastError = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/stop") {
      clearProfiles();
      browserState = "stopped";
      startedAt = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/profile") {
      if (browserState !== "running") {
        return json(res, 409, { error: "Browser helper is not running. POST /start first." });
      }
      const body = await parseJson<ProfileRequest>(req);
      const { getOrCreateProfile } = await import("./profiles.js");
      const profile = getOrCreateProfile(body.projectId);
      return json(res, 200, profile);
    }

    if (method === "POST" && url === "/browse") {
      if (browserState !== "running") {
        return json(res, 409, {
          error: "browser unavailable: helper is not running. Start browser helper first.",
          remediation: "Run: npm run browser-helper",
        });
      }
      const body = await parseJson<BrowseRequest>(req);
      try {
        const result = await browsePage(backend!, body);
        return json(res, 200, result);
      } catch (e) {
        const msg = String(e);
        lastError = msg;
        return json(res, 503, {
          error: msg.startsWith("browser unavailable") ? msg : `Browse failed: ${msg}`,
          remediation: backend!.remediation ?? "Run: npm run browser-helper",
        });
      }
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error("[aura-browser-helper] error", e);
    json(res, 500, { error: String(e) });
  }
});

server.listen(PORT, "127.0.0.1", async () => {
  backend = await detectBackend();
  console.log(`[aura-browser-helper] listening on http://127.0.0.1:${PORT}`);
  console.log(`[aura-browser-helper] Phase 5 — backend: ${backend.label}`);
});
