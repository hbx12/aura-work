/**
 * Aura OS Plugins Helper — Phase 6: Aura plugins, MCP servers, marketplace
 */

import { createServer, type ServerResponse } from "node:http";
import { loadSidecarToken, readJsonBody, requireSidecarAuth } from "@aura-os/shared";
import { reloadPlugins, listPluginTools, callPluginTool, pluginCount } from "./loader.js";
import {
  reloadMcp,
  listMcpTools,
  callMcpTool,
  mcpConnectedCount,
  shutdownMcp,
} from "./mcp-client.js";
import { fetchMarketplace } from "./marketplace.js";
import type {
  HelperConfig,
  HelperState,
  McpCallRequest,
  PluginCallRequest,
  PluginsHelperStatus,
} from "./types.js";

const PORT = Number(process.env.AURA_PLUGINS_PORT ?? 47824);
const AUTH_TOKEN = loadSidecarToken();

let helperState: HelperState = "stopped";
let startedAt: string | undefined;
let lastError: string | undefined;
let currentConfig: HelperConfig = {
  plugins: [],
  mcpServers: [],
  projectMcpSettings: [],
};

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function statusPayload(): PluginsHelperStatus {
  const pluginTools = listPluginTools();
  const mcpTools = listMcpTools();
  return {
    state: helperState,
    pluginCount: pluginCount(),
    mcpServerCount: currentConfig.mcpServers.filter((s) => s.enabled).length,
    mcpConnectedCount: mcpConnectedCount(),
    toolCount: pluginTools.length + mcpTools.length,
    startedAt,
    lastError,
    remediation:
      helperState === "unavailable"
        ? "Run: npm run plugins-helper"
        : undefined,
    running: helperState === "running",
  };
}

async function applyConfig(config: HelperConfig) {
  currentConfig = config;
  await reloadPlugins(config);
  await reloadMcp(config);
}

const server = createServer(async (req, res) => {
  if (!requireSidecarAuth(req, res, AUTH_TOKEN)) return;
  try {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (method === "GET" && url === "/health") {
      return json(res, 200, {
        status: helperState === "running" ? "ok" : "idle",
        phase: 6,
        version: "0.6.0",
        message: "Plugins helper — Aura plugins, MCP servers, marketplace active.",
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
      await shutdownMcp();
      helperState = "stopped";
      startedAt = undefined;
      return json(res, 200, statusPayload());
    }

    if (method === "POST" && url === "/config") {
      if (helperState !== "running") {
        return json(res, 409, { error: "Plugins helper is not running. POST /start first." });
      }
      const body = await readJsonBody<HelperConfig>(req);
      try {
        await applyConfig(body);
        return json(res, 200, statusPayload());
      } catch (e) {
        lastError = String(e);
        return json(res, 500, { error: lastError });
      }
    }

    if (method === "GET" && url.startsWith("/tools")) {
      const projectId = new URL(url, "http://local").searchParams.get("projectId") ?? undefined;
      return json(res, 200, {
        plugin: listPluginTools(),
        mcp: listMcpTools(projectId),
      });
    }

    if (method === "POST" && url === "/plugin/call") {
      if (helperState !== "running") {
        return json(res, 409, {
          error: "plugins unavailable: helper is not running",
          remediation: "Run: npm run plugins-helper",
        });
      }
      const body = await readJsonBody<PluginCallRequest>(req);
      const result = await callPluginTool(body);
      return json(res, result.ok ? 200 : 422, result);
    }

    if (method === "POST" && url === "/mcp/call") {
      if (helperState !== "running") {
        return json(res, 409, {
          error: "plugins unavailable: helper is not running",
          remediation: "Run: npm run plugins-helper",
        });
      }
      const body = await readJsonBody<McpCallRequest>(req);
      const result = await callMcpTool(body);
      return json(res, result.ok ? 200 : 422, result);
    }

    if (method === "POST" && url === "/marketplace/fetch") {
      const body = (await readJsonBody<{ registryUrl?: string }>(req, { allowEmpty: true }).catch(() => ({}))) as {
        registryUrl?: string;
      };
      try {
        const data = await fetchMarketplace(body.registryUrl);
        return json(res, 200, data);
      } catch (e) {
        return json(res, 502, { error: String(e) });
      }
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error("[aura-plugins-helper] error", e);
    json(res, 500, { error: String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[aura-plugins-helper] listening on http://127.0.0.1:${PORT}`);
  console.log("[aura-plugins-helper] Phase 6 — plugins, MCP, marketplace ready.");
});
