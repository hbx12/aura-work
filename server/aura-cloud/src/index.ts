/**
 * Aura Cloud — self-hostable sync relay + remote dispatch (Phase 7)
 * Stores encrypted blobs only; cannot decrypt task content.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  ciphertextFingerprint,
  FileCloudStore,
  newId,
  pairingCode,
  verifyPassword,
} from "./store.js";
import type { Device, DispatchRequest, EncryptedSyncEnvelope, SyncObjectType } from "./types.js";

const PORT = Number(process.env.AURA_CLOUD_PORT ?? 47830);
const store = new FileCloudStore();

async function parseJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function authToken(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return undefined;
  return h.slice(7);
}

async function requireAuth(req: IncomingMessage): Promise<{ accountId: string; token: string }> {
  const token = authToken(req);
  if (!token) throw new Error("Unauthorized");
  const session = store.resolveSession(token);
  if (!session) throw new Error("Invalid or expired session");
  return { accountId: session.accountId, token };
}

function deviceType(v: unknown): Device["deviceType"] {
  if (v === "mobile" || v === "remote") return v;
  return "desktop";
}

const server = createServer(async (req, res) => {
  try {
    await store.load();
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    if (method === "GET" && path === "/health") {
      return json(res, 200, {
        status: "ok",
        phase: 7,
        version: "0.7.0",
        message: "Aura Cloud — encrypted sync relay and remote dispatch. No plaintext access.",
        storage: "file",
      });
    }

    // --- Auth (dev email/password; OAuth/Passkeys planned) ---
    if (method === "POST" && path === "/auth/register") {
      const body = await parseJson<{ email?: string; displayName?: string; password?: string }>(req);
      if (!body.email || !body.password || body.password.length < 8) {
        return json(res, 400, { error: "email and password (min 8) required" });
      }
      const account = store.createAccount(
        body.email,
        body.displayName ?? body.email.split("@")[0] ?? "User",
        body.password,
      );
      const session = store.createSession(account.id);
      await store.save();
      return json(res, 201, {
        accountId: account.id,
        email: account.email,
        displayName: account.displayName,
        token: session.token,
        authMethods: ["password"],
        passkeysSupported: false,
        oauthSupported: false,
      });
    }

    if (method === "POST" && path === "/auth/login") {
      const body = await parseJson<{ email?: string; password?: string }>(req);
      const account = body.email ? store.findAccountByEmail(body.email) : undefined;
      if (!account || !body.password || !verifyPassword(body.password, account.passwordHash)) {
        return json(res, 401, { error: "Invalid credentials" });
      }
      const session = store.createSession(account.id);
      await store.save();
      return json(res, 200, {
        accountId: account.id,
        email: account.email,
        displayName: account.displayName,
        token: session.token,
      });
    }

    if (method === "GET" && path === "/auth/me") {
      const auth = await requireAuth(req);
      const account = store.findAccount(auth.accountId);
      if (!account) return json(res, 404, { error: "Account not found" });
      return json(res, 200, {
        accountId: account.id,
        email: account.email,
        displayName: account.displayName,
      });
    }

    // --- Devices ---
    if (method === "GET" && path === "/devices") {
      const auth = await requireAuth(req);
      const devices = store.listDevices(auth.accountId).map((d) => ({
        id: d.id,
        name: d.name,
        deviceType: d.deviceType,
        publicKey: d.publicKey,
        pairedAt: d.pairedAt,
        lastSeenAt: d.lastSeenAt,
        online: store.isDeviceOnline(d.id),
      }));
      return json(res, 200, { devices });
    }

    if (method === "POST" && path === "/devices/register") {
      const auth = await requireAuth(req);
      const body = await parseJson<{
        name?: string;
        deviceType?: string;
        publicKey?: string;
      }>(req);
      if (!body.name || !body.publicKey) {
        return json(res, 400, { error: "name and publicKey required" });
      }
      const now = new Date().toISOString();
      const device: Device = {
        id: newId(),
        accountId: auth.accountId,
        name: body.name,
        deviceType: deviceType(body.deviceType),
        publicKey: body.publicKey,
        pairedAt: now,
        lastSeenAt: now,
        revoked: false,
      };
      store.addDevice(device);
      await store.save();
      return json(res, 201, { device: { id: device.id, name: device.name, deviceType: device.deviceType } });
    }

    if (method === "POST" && path === "/devices/heartbeat") {
      const auth = await requireAuth(req);
      const body = await parseJson<{ deviceId?: string }>(req);
      if (!body.deviceId) return json(res, 400, { error: "deviceId required" });
      const device = store.findDevice(body.deviceId);
      if (!device || device.accountId !== auth.accountId) {
        return json(res, 404, { error: "Device not found" });
      }
      store.touchDevice(body.deviceId);
      await store.save();
      return json(res, 200, { ok: true, online: true });
    }

    if (method === "DELETE" && path.startsWith("/devices/")) {
      const auth = await requireAuth(req);
      const deviceId = path.slice("/devices/".length);
      if (!store.revokeDevice(auth.accountId, deviceId)) {
        return json(res, 404, { error: "Device not found" });
      }
      await store.save();
      return json(res, 200, { revoked: true });
    }

    // --- Pairing ---
    if (method === "POST" && path === "/pairing/create") {
      const auth = await requireAuth(req);
      const body = await parseJson<{ deviceId?: string; publicKey?: string }>(req);
      if (!body.deviceId || !body.publicKey) {
        return json(res, 400, { error: "deviceId and publicKey required" });
      }
      const code = pairingCode();
      const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
      store.createPairing({
        code,
        accountId: auth.accountId,
        initiatorDeviceId: body.deviceId,
        initiatorPublicKey: body.publicKey,
        expiresAt,
      });
      await store.save();
      return json(res, 201, {
        code,
        expiresAt,
        qrPayload: JSON.stringify({ type: "aura-pair", code, server: `http://127.0.0.1:${PORT}` }),
      });
    }

    if (method === "POST" && path === "/pairing/wrap-key") {
      const auth = await requireAuth(req);
      const body = await parseJson<{ code?: string; wrappedSyncKey?: string }>(req);
      if (!body.code || !body.wrappedSyncKey) {
        return json(res, 400, { error: "code and wrappedSyncKey required" });
      }
      const pairing = store.findPairing(body.code);
      if (!pairing || pairing.accountId !== auth.accountId) {
        return json(res, 404, { error: "Pairing session not found" });
      }
      store.setPairingWrappedKey(body.code, body.wrappedSyncKey);
      await store.save();
      return json(res, 200, { ok: true });
    }

    if (method === "POST" && path === "/pairing/claim") {
      const auth = await requireAuth(req);
      const body = await parseJson<{
        code?: string;
        name?: string;
        deviceType?: string;
        publicKey?: string;
      }>(req);
      if (!body.code || !body.name || !body.publicKey) {
        return json(res, 400, { error: "code, name, and publicKey required" });
      }
      const pairing = store.findPairing(body.code);
      if (!pairing || pairing.accountId !== auth.accountId) {
        return json(res, 404, { error: "Invalid or expired pairing code" });
      }
      const now = new Date().toISOString();
      const device: Device = {
        id: newId(),
        accountId: auth.accountId,
        name: body.name,
        deviceType: deviceType(body.deviceType),
        publicKey: body.publicKey,
        pairedAt: now,
        lastSeenAt: now,
        revoked: false,
      };
      const claimed = store.claimPairing(body.code, device);
      if (!claimed) return json(res, 409, { error: "Pairing code already claimed" });
      await store.save();
      return json(res, 200, {
        device: { id: device.id, name: device.name },
        wrappedSyncKey: claimed.wrappedSyncKey ?? null,
        initiatorDeviceId: claimed.initiatorDeviceId,
      });
    }

    if (method === "GET" && path.startsWith("/pairing/status/")) {
      const auth = await requireAuth(req);
      const code = path.slice("/pairing/status/".length).toUpperCase();
      const pairing = store.findPairing(code);
      if (!pairing || pairing.accountId !== auth.accountId) {
        return json(res, 404, { error: "Not found" });
      }
      return json(res, 200, {
        code,
        claimed: Boolean(pairing.claimedByDeviceId),
        claimedByDeviceId: pairing.claimedByDeviceId ?? null,
        hasWrappedKey: Boolean(pairing.wrappedSyncKey),
        expiresAt: pairing.expiresAt,
      });
    }

    // --- E2EE Sync ---
    if (method === "POST" && path === "/sync/push") {
      const auth = await requireAuth(req);
      const body = await parseJson<{ envelopes?: EncryptedSyncEnvelope[] }>(req);
      if (!body.envelopes?.length) return json(res, 400, { error: "envelopes required" });
      const saved = [];
      for (const env of body.envelopes) {
        if (!env.id || !env.ciphertext || !env.nonce || !env.objectType) {
          return json(res, 400, { error: "Invalid envelope" });
        }
        const envelope: EncryptedSyncEnvelope = {
          id: env.id,
          ownerAccountId: auth.accountId,
          objectType: env.objectType as SyncObjectType,
          version: env.version ?? 1,
          ciphertext: env.ciphertext,
          nonce: env.nonce,
          keyVersion: env.keyVersion ?? 1,
          createdAt: env.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.upsertEnvelope(envelope);
        saved.push({ id: envelope.id, fingerprint: ciphertextFingerprint(envelope.ciphertext) });
      }
      await store.save();
      return json(res, 200, { saved, plaintextStored: false });
    }

    if (method === "GET" && path === "/sync/pull") {
      const auth = await requireAuth(req);
      const since = url.searchParams.get("since") ?? undefined;
      const envelopes = store.pullEnvelopes(auth.accountId, since);
      return json(res, 200, { envelopes, plaintextExposed: false });
    }

    if (method === "GET" && path === "/sync/inspect") {
      const auth = await requireAuth(req);
      const inspection = store.inspectSyncStore(auth.accountId);
      return json(res, 200, {
        ...inspection,
        note: "Server stores ciphertext only — no decryption keys on server.",
      });
    }

    // --- Remote dispatch ---
    if (method === "POST" && path === "/dispatch/request") {
      const auth = await requireAuth(req);
      const body = await parseJson<{
        sourceDeviceId?: string;
        targetDeviceId?: string;
        ciphertext?: string;
        nonce?: string;
      }>(req);
      if (!body.sourceDeviceId || !body.targetDeviceId || !body.ciphertext || !body.nonce) {
        return json(res, 400, { error: "sourceDeviceId, targetDeviceId, ciphertext, nonce required" });
      }
      const target = store.findDevice(body.targetDeviceId);
      if (!target || target.accountId !== auth.accountId) {
        return json(res, 404, { error: "Target device not found" });
      }
      if (!store.isDeviceOnline(body.targetDeviceId)) {
        return json(res, 503, {
          error: "desktop_offline",
          message: "Target desktop is closed, offline, or unreachable. Task not dispatched.",
        });
      }
      const now = new Date().toISOString();
      const dispatch: DispatchRequest = {
        id: newId(),
        accountId: auth.accountId,
        sourceDeviceId: body.sourceDeviceId,
        targetDeviceId: body.targetDeviceId,
        ciphertext: body.ciphertext,
        nonce: body.nonce,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
      store.createDispatch(dispatch);
      await store.save();
      return json(res, 201, {
        dispatchId: dispatch.id,
        status: dispatch.status,
        fingerprint: ciphertextFingerprint(dispatch.ciphertext),
      });
    }

    if (method === "GET" && path === "/dispatch/pending") {
      const auth = await requireAuth(req);
      const deviceId = url.searchParams.get("deviceId");
      if (!deviceId) return json(res, 400, { error: "deviceId query required" });
      const device = store.findDevice(deviceId);
      if (!device || device.accountId !== auth.accountId) {
        return json(res, 404, { error: "Device not found" });
      }
      const pending = store.listPendingDispatch(deviceId);
      return json(res, 200, { pending });
    }

    if (method === "POST" && path.startsWith("/dispatch/") && path.endsWith("/ack")) {
      const auth = await requireAuth(req);
      const dispatchId = path.slice("/dispatch/".length, -"/ack".length);
      const body = await parseJson<{
        status?: string;
        failureReason?: string;
        responseCiphertext?: string;
        responseNonce?: string;
      }>(req);
      const dispatch = store.findDispatch(dispatchId);
      if (!dispatch || dispatch.accountId !== auth.accountId) {
        return json(res, 404, { error: "Dispatch not found" });
      }
      const updated = store.updateDispatch(dispatchId, {
        status: (body.status as DispatchRequest["status"]) ?? "delivered",
        failureReason: body.failureReason,
        responseCiphertext: body.responseCiphertext,
        responseNonce: body.responseNonce,
      });
      await store.save();
      return json(res, 200, { dispatch: updated });
    }

    if (method === "GET" && path.startsWith("/dispatch/")) {
      const auth = await requireAuth(req);
      const dispatchId = path.slice("/dispatch/".length);
      const dispatch = store.findDispatch(dispatchId);
      if (!dispatch || dispatch.accountId !== auth.accountId) {
        return json(res, 404, { error: "Dispatch not found" });
      }
      return json(res, 200, {
        id: dispatch.id,
        status: dispatch.status,
        failureReason: dispatch.failureReason,
        responseCiphertext: dispatch.responseCiphertext,
        responseNonce: dispatch.responseNonce,
        createdAt: dispatch.createdAt,
        updatedAt: dispatch.updatedAt,
      });
    }

    return json(res, 404, { error: "Not found" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" || msg.startsWith("Invalid") ? 401 : 500;
    return json(res, status, { error: msg });
  }
});

await store.load();
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[aura-cloud] Phase 7 — listening on http://127.0.0.1:${PORT}`);
  console.log("[aura-cloud] E2EE sync relay — stores encrypted blobs only.");
});
