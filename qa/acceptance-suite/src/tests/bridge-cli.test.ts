import { describe, it, expect, afterEach } from "vitest";
import { fetchJson, spawnNodeServer } from "../helpers/http.js";

describe("5.6 — Chrome extension approval (bridge gates)", () => {
  let server: Awaited<ReturnType<typeof spawnNodeServer>> | undefined;

  afterEach(async () => {
    await server?.stop();
  });

  it("bridge /health responds; v1 routes require running desktop session", async () => {
    server = await spawnNodeServer("sidecar/aura-bridge/dist/index.js");
    const auth = { Authorization: `Bearer ${server.sidecarAuthToken}` };

    const denied = await fetchJson(`${server.baseUrl}/health`);
    expect(denied.status).toBe(401);

    const health = await fetchJson<{ phase: number; status: string }>(`${server.baseUrl}/health`, {
      headers: auth,
    });
    expect(health.status).toBe(200);
    expect(health.body.status).toMatch(/ok|idle/);

    const blocked = await fetchJson<{ error?: string }>(`${server.baseUrl}/v1/projects`, {
      headers: { "X-Aura-Session-Token": "invalid-token" },
    });
    expect(blocked.status).toBe(503);
    expect(blocked.body.error).toMatch(/not running|Aura desktop/i);
  });

  it("page-read route exists and requires session token when bridge is running", async () => {
    server = await spawnNodeServer("sidecar/aura-bridge/dist/index.js");
    const auth = { Authorization: `Bearer ${server.sidecarAuthToken}` };

    await fetchJson(`${server.baseUrl}/start`, { method: "POST", headers: auth });
    await fetchJson(`${server.baseUrl}/config`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ internalSecret: "qa-test-secret", clients: [] }),
    });

    const noToken = await fetchJson<{ error?: string }>(
      `${server.baseUrl}/v1/chrome/page-read/request`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    expect(noToken.status).toBe(401);
    expect(noToken.body.error).toMatch(/token/i);
  });
});

describe("5.7 — Office add-in delegation via bridge", () => {
  it("bridge source exposes Office client type", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { REPO_ROOT } = await import("../helpers/http.js");
    const types = readFileSync(join(REPO_ROOT, "sidecar/aura-bridge/src/types.ts"), "utf8");
    expect(types).toContain("office-word");
    expect(types).toContain("office-excel");
    expect(types).toContain("office-powerpoint");
  });
});

describe("CLI companion — fails when bridge offline (Phase 11/12)", () => {
  it("fetch to unreachable bridge port fails (desktop must be running)", async () => {
    const prev = process.env.AURA_BRIDGE_URL;
    process.env.AURA_BRIDGE_URL = "http://127.0.0.1:59999";
    try {
      await expect(fetch("http://127.0.0.1:59999/health")).rejects.toThrow();
    } finally {
      process.env.AURA_BRIDGE_URL = prev;
    }
  });
});
