/**
 * Aura OS Cloud Sync Helper — Phase 7: E2EE sync client + dispatch relay
 */

import { createServer, type ServerResponse } from "node:http";
import { loadSidecarToken, readJsonBody, requireSidecarAuth } from "@aura-os/shared";
import {
  ackDispatch,
  checkCloudHealth,
  fetchPendingDispatch,
  pullEnvelopes,
  pushEnvelopes,
  sendHeartbeat,
} from "./cloud-client.js";
import type { CloudSyncConfig, CloudSyncStatus, EncryptedSyncEnvelope, HelperState } from "./types.js";

const PORT = Number(process.env.AURA_CLOUD_SYNC_PORT ?? 47825);
const AUTH_TOKEN = loadSidecarToken();

let helperState: HelperState = "stopped";
let config: CloudSyncConfig | null = null;
let lastSyncAt: string | undefined;
let lastSyncPushCount = 0;
let lastSyncPullCount = 0;
let lastError: string | undefined;
let pendingDispatch: { id: string; sourceDeviceId: string; ciphertext: string; nonce: string; createdAt: string }[] = [];
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let dispatchTimer: ReturnType<typeof setInterval> | undefined;
let lastPullSince: string | undefined;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function statusPayload(): CloudSyncStatus {
  return {
    state: helperState,
    serverUrl: config?.serverUrl,
    accountId: config?.accountId,
    deviceId: config?.deviceId,
    syncEnabled: config?.syncEnabled ?? false,
    lastSyncAt,
    lastSyncPushCount,
    lastSyncPullCount,
    lastError,
    dispatchPollActive: Boolean(dispatchTimer),
    pendingDispatchCount: pendingDispatch.length,
    running: helperState === "running",
    remediation:
      helperState === "unavailable" ? "Run: npm run cloud-sync" : undefined,
  };
}

function stopTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (dispatchTimer) clearInterval(dispatchTimer);
  heartbeatTimer = undefined;
  dispatchTimer = undefined;
}

async function runHeartbeat() {
  if (!config?.syncEnabled) return;
  try {
    await sendHeartbeat(config);
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }
}

async function pollDispatch() {
  if (!config?.syncEnabled) return;
  try {
    const result = await fetchPendingDispatch(config);
    pendingDispatch = result.pending;
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }
}

async function startHelper(newConfig: CloudSyncConfig) {
  helperState = "starting";
  config = newConfig;
  lastError = undefined;
  stopTimers();

  const healthy = await checkCloudHealth(config.serverUrl);
  if (!healthy) {
    helperState = "unavailable";
    lastError = `Cannot reach Aura Cloud at ${config.serverUrl}`;
    return statusPayload();
  }

  helperState = "running";
  if (config.syncEnabled) {
    await runHeartbeat();
    heartbeatTimer = setInterval(() => void runHeartbeat(), 30_000);
    dispatchTimer = setInterval(() => void pollDispatch(), 5_000);
    await pollDispatch();
  }
  return statusPayload();
}

async function stopHelper() {
  stopTimers();
  helperState = "stopped";
  pendingDispatch = [];
  return statusPayload();
}

const server = createServer(async (req, res) => {
  if (!requireSidecarAuth(req, res, AUTH_TOKEN)) return;
  try {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (method === "GET" && url === "/health") {
      return json(res, 200, {
        status: helperState === "running" ? "ok" : "idle",
        phase: 7,
        version: "0.7.0",
        message: "Cloud sync helper — E2EE sync client and dispatch relay.",
      });
    }

    if (method === "GET" && url === "/status") {
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/start") {
      const body = await readJsonBody<CloudSyncConfig>(req, { allowEmpty: true });
      if (!body.serverUrl || !body.accessToken || !body.accountId || !body.deviceId) {
        return json(res, 400, { error: "serverUrl, accessToken, accountId, deviceId required" });
      }
      const status = await startHelper(body);
      return json(res, 200, status);
    }

    if (method === "POST" && url === "/stop") {
      const status = await stopHelper();
      return json(res, 200, status);
    }

    if (method === "POST" && url === "/config") {
      const body = await readJsonBody<CloudSyncConfig>(req, { allowEmpty: true });
      if (!body.serverUrl || !body.accessToken || !body.accountId || !body.deviceId) {
        return json(res, 400, { error: "Invalid config" });
      }
      if (helperState === "running") {
        config = body;
        return json(res, 200, statusPayload());
      }
      const status = await startHelper(body);
      return json(res, 200, status);
    }

    if (method === "POST" && url === "/sync/push") {
      if (!config) return json(res, 503, { error: "Cloud sync not configured" });
      const body = await readJsonBody<{ envelopes: EncryptedSyncEnvelope[] }>(req);
      const result = await pushEnvelopes(config, body.envelopes ?? []);
      lastSyncPushCount = result.saved.length;
      lastSyncAt = new Date().toISOString();
      return json(res, 200, { ...result, lastSyncAt });
    }

    if (method === "POST" && url === "/sync/pull") {
      if (!config) return json(res, 503, { error: "Cloud sync not configured" });
      const body = await readJsonBody<{ since?: string }>(req, { allowEmpty: true });
      const since = body.since ?? lastPullSince;
      const result = await pullEnvelopes(config, since);
      lastSyncPullCount = result.envelopes.length;
      lastSyncAt = new Date().toISOString();
      if (result.envelopes.length > 0) {
        lastPullSince = result.envelopes[result.envelopes.length - 1]!.updatedAt;
      }
      return json(res, 200, { ...result, lastSyncAt });
    }

    if (method === "GET" && url === "/dispatch/pending") {
      return json(res, 200, { pending: pendingDispatch });
    }

    if (method === "POST" && url.startsWith("/dispatch/") && url.endsWith("/ack")) {
      if (!config) return json(res, 503, { error: "Cloud sync not configured" });
      const dispatchId = url.slice("/dispatch/".length, -"/ack".length);
      const body = await readJsonBody<{
        status: string;
        failureReason?: string;
        responseCiphertext?: string;
        responseNonce?: string;
      }>(req);
      await ackDispatch(config, dispatchId, body);
      pendingDispatch = pendingDispatch.filter((d) => d.id !== dispatchId);
      return json(res, 200, { ok: true });
    }

    if (method === "POST" && url === "/dispatch/request") {
      if (!config) return json(res, 503, { error: "Cloud sync not configured" });
      const body = await readJsonBody<{
        sourceDeviceId: string;
        targetDeviceId: string;
        ciphertext: string;
        nonce: string;
      }>(req);
      const resp = await fetch(`${config.serverUrl.replace(/\/$/, "")}/dispatch/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return json(res, resp.status, data);
      }
      return json(res, resp.status, data);
    }

    return json(res, 404, { error: "Not found" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastError = msg;
    return json(res, 500, { error: msg });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[aura-cloud-sync] Phase 7 — listening on http://127.0.0.1:${PORT}`);
});
