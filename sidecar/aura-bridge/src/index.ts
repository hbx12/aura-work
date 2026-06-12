/**
 * Aura OS Local Bridge — Phase 11: Chrome extension + Office add-ins + CLI companion
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isSidecarAuthorized, loadSidecarToken, rejectUnauthorized } from "@aura-os/shared";
import { BRIDGE_PORT, hashToken, internalFetch } from "./rust-client.js";
import type { BridgeClientConfig, BridgeConfig, BridgeStatus, HelperState } from "./types.js";
import { parseJsonBody, RequestBodyError } from "./request-body.js";
import {
  PairingRateLimitError,
  PairingRateLimiter,
} from "./pairing-rate-limit.js";

let helperState: HelperState = "stopped";
let config: BridgeConfig = { internalSecret: "", clients: [] };
let startedAt: string | undefined;
let lastError: string | undefined;
const AUTH_TOKEN = loadSidecarToken();
const connectedClientIds = new Set<string>();
const pairingRateLimiter = new PairingRateLimiter();

function bridgeRequiresSidecarAuth(method: string, url: string): boolean {
  if (method === "OPTIONS") return false;
  if (url.startsWith("/v1/")) return false;
  return true;
}

function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Aura-Session-Token",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function statusPayload(): BridgeStatus {
  return {
    state: helperState,
    clientCount: config.clients.length,
    connectedClients: connectedClientIds.size,
    startedAt,
    lastError,
    remediation: helperState === "unavailable" ? "Run: npm run bridge" : undefined,
    running: helperState === "running",
  };
}

function sessionToken(req: IncomingMessage): string | null {
  const header = req.headers["x-aura-session-token"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return null;
}

function findClient(token: string): BridgeClientConfig | undefined {
  const hashed = hashToken(token);
  return config.clients.find((c) => c.sessionToken === hashed);
}

function requireClient(req: IncomingMessage, res: ServerResponse): BridgeClientConfig | null {
  const token = sessionToken(req);
  if (!token) {
    json(res, 401, { error: "Missing X-Aura-Session-Token header." });
    return null;
  }
  const client = findClient(token);
  if (!client) {
    json(res, 401, { error: "Invalid or revoked session token." });
    return null;
  }
  connectedClientIds.add(client.id);
  return client;
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (bridgeRequiresSidecarAuth(method, url) && !isSidecarAuthorized(req, AUTH_TOKEN)) {
      return rejectUnauthorized(res);
    }

    if (method === "OPTIONS") {
      return json(res, 204, {});
    }

    if (method === "GET" && url === "/health") {
      return json(res, 200, {
        status: helperState === "running" ? "ok" : "idle",
        phase: 14,
        version: "1.0.0",
        message: "Local bridge for Chrome extension, Office add-ins, and CLI companion.",
      });
    }

    if (method === "GET" && url === "/status") {
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/start") {
      helperState = "running";
      startedAt = new Date().toISOString();
      lastError = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/stop") {
      helperState = "stopped";
      startedAt = undefined;
      connectedClientIds.clear();
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/config") {
      const body = await parseJsonBody<BridgeConfig>(req);
      config = {
        internalSecret: body.internalSecret ?? "",
        clients: body.clients ?? [],
      };
      if (helperState !== "running") helperState = "running";
      if (!startedAt) startedAt = new Date().toISOString();
      return json(res, 200, statusPayload());
    }

    if (helperState !== "running") {
      return json(res, 503, {
        error: "Bridge is not running. Aura desktop must be open.",
        remediation: "Open Aura OS and start the bridge from Extensions.",
      });
    }

    if (!config.internalSecret) {
      return json(res, 503, {
        error: "Bridge not configured. Pair a client from Aura desktop first.",
      });
    }

    if (method === "POST" && url === "/v1/pair/claim") {
      const rateLimitKey = req.socket.remoteAddress ?? "unknown";
      pairingRateLimiter.assertAllowed(rateLimitKey);

      const body = await parseJsonBody<{
        code: string;
        name: string;
        clientType: string;
        projectId?: string;
      }>(req);

      try {
        const result = await internalFetch<{
          clientId: string;
          sessionToken: string;
          projectId?: string;
        }>(config.internalSecret, "/internal/pair/claim", {
          method: "POST",
          body: JSON.stringify(body),
        });

        pairingRateLimiter.recordSuccess(rateLimitKey);
        return json(res, 200, result);
      } catch (error) {
        pairingRateLimiter.recordFailure(rateLimitKey);
        throw error;
      }
    }

    if (method === "GET" && url === "/v1/projects") {
      const client = requireClient(req, res);
      if (!client) return;
      const token = sessionToken(req)!;
      const projects = await internalFetch<unknown[]>(
        config.internalSecret,
        `/internal/projects?sessionToken=${encodeURIComponent(token)}`,
      );
      return json(res, 200, { projects });
    }

    if (method === "POST" && url === "/v1/chrome/page-read/request") {
      const client = requireClient(req, res);
      if (!client) return;
      const body = await parseJsonBody<Record<string, unknown>>(req);
      const token = sessionToken(req)!;
      const result = await internalFetch(config.internalSecret, "/internal/chrome/page-read/request", {
        method: "POST",
        body: JSON.stringify({ ...body, sessionToken: token }),
      });
      return json(res, 200, result);
    }

    if (method === "GET" && url.startsWith("/v1/chrome/page-read/status/")) {
      const client = requireClient(req, res);
      if (!client) return;
      const permissionId = url.split("/").pop() ?? "";
      const token = sessionToken(req)!;
      const result = await internalFetch(
        config.internalSecret,
        `/internal/chrome/page-read/status/${permissionId}?sessionToken=${encodeURIComponent(token)}`,
      );
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/v1/chrome/page-read/submit") {
      const client = requireClient(req, res);
      if (!client) return;
      const body = await parseJsonBody<Record<string, unknown>>(req);
      const token = sessionToken(req)!;
      const result = await internalFetch(config.internalSecret, "/internal/chrome/page-read/submit", {
        method: "POST",
        body: JSON.stringify({ ...body, sessionToken: token }),
      });
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/v1/task/create") {
      const client = requireClient(req, res);
      if (!client) return;
      const body = await parseJsonBody<Record<string, unknown>>(req);
      const token = sessionToken(req)!;
      const result = await internalFetch(config.internalSecret, "/internal/task/create", {
        method: "POST",
        body: JSON.stringify({ ...body, sessionToken: token }),
      });
      return json(res, 200, { task: result });
    }

    if (method === "GET" && url.startsWith("/v1/task/") && url.endsWith("/logs")) {
      const client = requireClient(req, res);
      if (!client) return;
      const parts = url.split("/");
      const taskId = parts[parts.length - 2] ?? "";
      const token = sessionToken(req)!;
      const result = await internalFetch(
        config.internalSecret,
        `/internal/task/${taskId}/logs?sessionToken=${encodeURIComponent(token)}`,
      );
      return json(res, 200, { logs: result });
    }

    if (method === "GET" && url.startsWith("/v1/task/")) {
      const client = requireClient(req, res);
      if (!client) return;
      const taskId = url.split("/").pop() ?? "";
      const token = sessionToken(req)!;
      const result = await internalFetch(
        config.internalSecret,
        `/internal/task/${taskId}?sessionToken=${encodeURIComponent(token)}`,
      );
      return json(res, 200, { task: result });
    }

    if (method === "POST" && url === "/v1/open/task") {
      const client = requireClient(req, res);
      if (!client) return;
      const body = await parseJsonBody<{ taskId: string }>(req);
      const token = sessionToken(req)!;
      await internalFetch(config.internalSecret, "/internal/open/task", {
        method: "POST",
        body: JSON.stringify({ sessionToken: token, taskId: body.taskId }),
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: "Not found" });
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);

    if (e instanceof PairingRateLimitError) {
      return json(
        res,
        e.statusCode,
        {
          error: e.message,
          retryAfterSeconds: e.retryAfterSeconds,
        },
        {
          "Retry-After": String(e.retryAfterSeconds),
        },
      );
    }

    if (e instanceof RequestBodyError) {
      return json(res, e.statusCode, { error: e.message });
    }

    return json(res, 500, { error: lastError });
  }
});

server.listen(BRIDGE_PORT, "127.0.0.1", () => {
  helperState = "running";
  startedAt = new Date().toISOString();
  console.log(`[aura-bridge] listening on http://127.0.0.1:${BRIDGE_PORT}`);
});
