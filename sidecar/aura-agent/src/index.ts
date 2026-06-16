/**
 * SPDX-License-Identifier: Apache-2.0
 * Aura OS Agent Sidecar — v1.0.0 open-source release — task engine + VM + browser + computer use + plugins/MCP + cloud sync + scheduled tasks + local bridge + i18n/packaging + providers + routing
 */
import { createServer, type ServerResponse } from "node:http";
import { getAdapter } from "./providers/index.js";
import { routeRequest } from "./routing/engine.js";
import { generatePlan, iterateTask } from "./task/coordinator.js";
import {
  cancelCodexAuth,
  pollCodexLoginOnce,
  startCodexLogin,
  startProviderLogin,
} from "./providers/codex-oauth.js";
import { isCodexAccount } from "./providers/codex.js";
import type {
  ChatRequestBody,
  RouteRequestBody,
  ValidateRequestBody,
} from "./types.js";
import type { ProviderId } from "@aura-os/shared";
import { loadSidecarToken, readJsonBody, requireSidecarAuth } from "@aura-os/shared";

const PORT = Number(process.env.AURA_AGENT_PORT ?? 47821);
const AUTH_TOKEN = loadSidecarToken();
const taskStreamBuffers = new Map<string, string>();

export function setTaskStreamChunk(taskId: string, text: string) {
  taskStreamBuffers.set(taskId, text);
}

export function clearTaskStream(taskId: string) {
  taskStreamBuffers.delete(taskId);
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function redactForLog(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const copy = { ...(obj as Record<string, unknown>) };
  if ("credentials" in copy) copy.credentials = { redacted: true };
  if ("apiKey" in copy) copy.apiKey = "[redacted]";
  return copy;
}

const server = createServer(async (req, res) => {
  if (!requireSidecarAuth(req, res, AUTH_TOKEN)) return;
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  try {
    if (method === "GET" && url === "/health") {
      return json(res, 200, {
        status: "ready",
        phase: 14,
        version: "1.0.0",
        message: "Task engine, VM shell, browser, computer use, plugins/MCP, E2EE cloud sync, scheduled tasks, local bridge, i18n/packaging, provider adapters, and routing active.",
      });
    }

    if (method === "POST" && url === "/providers/validate") {
      const body = await readJsonBody<ValidateRequestBody>(req);
      console.log("[aura-agent] validate", body.providerId);
      const adapter = getAdapter(body.providerId);
      const result = await adapter.validateCredentials(body.credentials);
      const updatedCredentials =
        "updatedCredentials" in result ? result.updatedCredentials : undefined;
      return json(res, 200, {
        valid: result.valid,
        message: result.message,
        updatedCredentials,
      });
    }

    if (method === "POST" && url === "/providers/models") {
      const body = await readJsonBody<ValidateRequestBody>(req);
      const adapter = getAdapter(body.providerId);
      if (body.providerId === "openai" && isCodexAccount(body.credentials)) {
        const { codexListModelsWithSession } = await import("./providers/codex.js");
        const result = await codexListModelsWithSession(body.credentials);
        return json(res, 200, result);
      }
      const models = await adapter.listModels(body.credentials);
      return json(res, 200, { models });
    }

    if (method === "POST" && url === "/route") {
      const body = await readJsonBody<RouteRequestBody>(req);
      console.log("[aura-agent] route", body.policy, body.context.allowedProviders);
      const decision = routeRequest(body);
      return json(res, 200, decision);
    }

    if (method === "POST" && url === "/chat") {
      const body = await readJsonBody<ChatRequestBody>(req);
      console.log("[aura-agent] chat", body.providerId, body.modelId, redactForLog(body));
      const adapter = getAdapter(body.providerId as ProviderId);
      const result = await adapter.chat(
        { model: body.modelId, messages: body.messages },
        body.credentials,
      );
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/codex/login/start") {
      const session = await startCodexLogin();
      return json(res, 200, session);
    }

    if (method === "POST" && url === "/codex/login/poll") {
      const result = await pollCodexLoginOnce();
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/google/login/start") {
      const session = await startProviderLogin("gemini");
      return json(res, 200, session);
    }

    if (method === "POST" && url === "/google/login/poll") {
      const result = await pollCodexLoginOnce();
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/claude/login/start") {
      const session = await startProviderLogin("anthropic");
      return json(res, 200, session);
    }

    if (method === "POST" && url === "/claude/login/poll") {
      const result = await pollCodexLoginOnce();
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/codex/login/cancel") {
      cancelCodexAuth();
      return json(res, 200, { ok: true });
    }

    if (method === "POST" && url === "/codex/device/start") {
      const session = await startCodexLogin();
      return json(res, 200, session);
    }

    if (method === "POST" && url === "/codex/device/poll") {
      const result = await pollCodexLoginOnce();
      return json(res, 200, result);
    }

    if (method === "POST" && url === "/task/plan") {
      const body = await readJsonBody<Parameters<typeof generatePlan>[0]>(req);
      console.log("[aura-agent] task/plan", body.projectId);
      const plan = await generatePlan(body);
      return json(res, 200, plan);
    }

    if (method === "GET" && url.startsWith("/task/stream")) {
      const q = new URL(url, "http://local");
      const taskId = q.searchParams.get("taskId") ?? "";
      return json(res, 200, { text: taskStreamBuffers.get(taskId) ?? "" });
    }

    if (method === "POST" && url === "/task/iterate") {
      const body = await readJsonBody<Parameters<typeof iterateTask>[0]>(req);
      const streamKey = body.taskId ?? body.projectId;
      console.log("[aura-agent] task/iterate", body.projectId, "iter", body.iteration);
      taskStreamBuffers.set(streamKey, "");
      try {
        const result = await iterateTask({
          ...body,
          onChunk: (text) => taskStreamBuffers.set(streamKey, text),
        });
        return json(res, 200, result);
      } finally {
        clearTaskStream(streamKey);
      }
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error("[aura-agent] error", e);
    json(res, 500, { error: String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[aura-agent] listening on http://127.0.0.1:${PORT}`);
  console.log("[aura-agent] v1.0.0 — open-source release; all subsystems ready.");
});
