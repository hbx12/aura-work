import { readFile, writeFile } from "node:fs/promises";
import { describe, it, expect, afterEach } from "vitest";
import { fetchJson, spawnNodeServer, tempDataPath } from "../helpers/http.js";

const FAKE_KEY = "qa-test-public-key-base64";

async function registerAccount(baseUrl: string) {
  const register = await fetchJson<{ token: string }>(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `qa-${Date.now()}@test.local`,
      password: "testpass123",
      displayName: "QA",
    }),
  });
  expect(register.status).toBe(201);
  return register.body.token;
}

async function registerDevice(
  baseUrl: string,
  token: string,
  name: string,
  deviceType: string,
) {
  const res = await fetchJson<{ device: { id: string } }>(`${baseUrl}/devices/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      deviceType,
      publicKey: FAKE_KEY,
    }),
  });
  expect(res.status).toBe(201);
  return res.body.device.id;
}

async function markDesktopOffline(storePath: string, deviceId: string) {
  const raw = await readFile(storePath, "utf8");
  const store = JSON.parse(raw) as {
    devices: { id: string; lastSeenAt: string }[];
  };
  const device = store.devices.find((d) => d.id === deviceId);
  if (!device) throw new Error("Device not found in store");
  device.lastSeenAt = new Date(Date.now() - 120_000).toISOString();
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

describe("5.4 & 5.5 — remote dispatch when desktop offline", () => {
  let server: Awaited<ReturnType<typeof spawnNodeServer>> | undefined;
  let cleanup: (() => Promise<void>) | undefined;
  let storePath = "";

  afterEach(async () => {
    await server?.stop();
    await cleanup?.();
  });

  it("returns 503 desktop_offline when target device is not online", async () => {
    const data = await tempDataPath();
    cleanup = data.cleanup;
    storePath = data.path;

    server = await spawnNodeServer("server/aura-cloud/dist/index.js", {
      AURA_CLOUD_DATA: storePath,
    });

    const token = await registerAccount(server.baseUrl);
    const sourceId = await registerDevice(server.baseUrl, token, "Remote Client", "remote");
    const targetId = await registerDevice(server.baseUrl, token, "Desktop (offline)", "desktop");

    await server.stop();
    await markDesktopOffline(storePath, targetId);
    server = await spawnNodeServer("server/aura-cloud/dist/index.js", {
      AURA_CLOUD_DATA: storePath,
    });

    const dispatch = await fetchJson<{ error?: string; message?: string }>(
      `${server.baseUrl}/dispatch/request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceDeviceId: sourceId,
          targetDeviceId: targetId,
          ciphertext: "deadbeefciphertext",
          nonce: "00112233445566778899aabb",
        }),
      },
    );

    expect(dispatch.status).toBe(503);
    expect(dispatch.body.error).toBe("desktop_offline");
    expect(dispatch.body.message).toMatch(/closed|offline|unreachable/i);
  });
});

describe("5.8 — E2EE cloud sync (server stores ciphertext only)", () => {
  let server: Awaited<ReturnType<typeof spawnNodeServer>> | undefined;
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await server?.stop();
    await cleanup?.();
  });

  it("sync pull exposes plaintextExposed=false and inspect has no ciphertext in sample", async () => {
    const data = await tempDataPath();
    cleanup = data.cleanup;
    server = await spawnNodeServer("server/aura-cloud/dist/index.js", {
      AURA_CLOUD_DATA: data.path,
    });

    const token = await registerAccount(server.baseUrl);
    const envelopeId = `env-${Date.now()}`;

    const push = await fetchJson<{ plaintextStored: boolean }>(`${server.baseUrl}/sync/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        envelopes: [
          {
            id: envelopeId,
            objectType: "task_history",
            ciphertext: "e2ee-ciphertext-not-plaintext",
            nonce: "aabbccddeeff001122334455",
            version: 1,
          },
        ],
      }),
    });
    expect(push.status).toBe(200);
    expect(push.body.plaintextStored).toBe(false);

    const pull = await fetchJson<{ plaintextExposed: boolean }>(`${server.baseUrl}/sync/pull`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(pull.status).toBe(200);
    expect(pull.body.plaintextExposed).toBe(false);

    const inspect = await fetchJson<{
      count: number;
      sample: Record<string, unknown>[];
      note?: string;
    }>(`${server.baseUrl}/sync/inspect`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(inspect.status).toBe(200);
    expect(inspect.body.count).toBeGreaterThanOrEqual(1);
    for (const row of inspect.body.sample) {
      expect(row).not.toHaveProperty("ciphertext");
      expect(row).not.toHaveProperty("nonce");
    }
    expect(inspect.body.note).toMatch(/ciphertext/i);
  });
});
