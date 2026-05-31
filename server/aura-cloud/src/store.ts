import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Account,
  CloudStore,
  Device,
  DispatchRequest,
  EncryptedSyncEnvelope,
  PairingSession,
  Session,
} from "./types.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = join(__dir, "..", "data", "store.json");

function emptyStore(): CloudStore {
  return {
    accounts: [],
    sessions: [],
    devices: [],
    pairingSessions: [],
    syncEnvelopes: [],
    dispatchRequests: [],
  };
}

export function hashPassword(password: string, salt?: string): string {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (attempt.length !== expected.length) return false;
  return timingSafeEqual(attempt, expected);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newId(): string {
  return randomBytes(16).toString("hex");
}

export function pairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes(1)[0]! % chars.length];
  }
  return code;
}

export class FileCloudStore {
  private path: string;
  private data: CloudStore = emptyStore();
  private loaded = false;

  constructor(path = process.env.AURA_CLOUD_DATA ?? DEFAULT_PATH) {
    this.path = path;
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.path, "utf8");
      this.data = { ...emptyStore(), ...JSON.parse(raw) };
    } catch {
      this.data = emptyStore();
    }
    this.loaded = true;
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.data, null, 2), "utf8");
  }

  // --- Accounts ---
  createAccount(email: string, displayName: string, password: string): Account {
    if (this.data.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Account already exists");
    }
    const account: Account = {
      id: newId(),
      email: email.toLowerCase(),
      displayName,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    this.data.accounts.push(account);
    return account;
  }

  findAccountByEmail(email: string): Account | undefined {
    return this.data.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  findAccount(id: string): Account | undefined {
    return this.data.accounts.find((a) => a.id === id);
  }

  // --- Sessions ---
  createSession(accountId: string, ttlHours = 720): Session {
    const session: Session = {
      token: newToken(),
      accountId,
      expiresAt: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    };
    this.data.sessions.push(session);
    return session;
  }

  resolveSession(token: string): Session | undefined {
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) return undefined;
    return session;
  }

  // --- Devices ---
  addDevice(device: Device): Device {
    this.data.devices.push(device);
    return device;
  }

  listDevices(accountId: string): Device[] {
    return this.data.devices.filter((d) => d.accountId === accountId && !d.revoked);
  }

  findDevice(id: string): Device | undefined {
    return this.data.devices.find((d) => d.id === id && !d.revoked);
  }

  touchDevice(id: string): void {
    const d = this.data.devices.find((x) => x.id === id);
    if (d) d.lastSeenAt = new Date().toISOString();
  }

  revokeDevice(accountId: string, deviceId: string): boolean {
    const d = this.data.devices.find((x) => x.id === deviceId && x.accountId === accountId);
    if (!d) return false;
    d.revoked = true;
    return true;
  }

  isDeviceOnline(deviceId: string, maxAgeMs = 90_000): boolean {
    const d = this.data.devices.find((x) => x.id === deviceId && !x.revoked);
    if (!d) return false;
    return Date.now() - new Date(d.lastSeenAt).getTime() < maxAgeMs;
  }

  // --- Pairing ---
  createPairing(session: PairingSession): PairingSession {
    this.data.pairingSessions = this.data.pairingSessions.filter(
      (p) => p.expiresAt > new Date().toISOString(),
    );
    this.data.pairingSessions.push(session);
    return session;
  }

  findPairing(code: string): PairingSession | undefined {
    const p = this.data.pairingSessions.find((x) => x.code === code.toUpperCase());
    if (!p || new Date(p.expiresAt) < new Date()) return undefined;
    return p;
  }

  setPairingWrappedKey(code: string, wrappedSyncKey: string): boolean {
    const p = this.findPairing(code);
    if (!p) return false;
    p.wrappedSyncKey = wrappedSyncKey;
    return true;
  }

  claimPairing(code: string, device: Device): PairingSession | undefined {
    const p = this.findPairing(code);
    if (!p || p.claimedByDeviceId) return undefined;
    p.claimedByDeviceId = device.id;
    this.addDevice(device);
    return p;
  }

  // --- Sync ---
  upsertEnvelope(envelope: EncryptedSyncEnvelope): EncryptedSyncEnvelope {
    const idx = this.data.syncEnvelopes.findIndex(
      (e) => e.id === envelope.id && e.ownerAccountId === envelope.ownerAccountId,
    );
    if (idx >= 0) {
      this.data.syncEnvelopes[idx] = envelope;
    } else {
      this.data.syncEnvelopes.push(envelope);
    }
    return envelope;
  }

  pullEnvelopes(accountId: string, since?: string): EncryptedSyncEnvelope[] {
    return this.data.syncEnvelopes
      .filter((e) => e.ownerAccountId === accountId)
      .filter((e) => !since || e.updatedAt > since)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  /** Server-side inspection — only metadata, no plaintext */
  inspectSyncStore(accountId: string): { count: number; sample: Partial<EncryptedSyncEnvelope>[] } {
    const items = this.data.syncEnvelopes.filter((e) => e.ownerAccountId === accountId);
    return {
      count: items.length,
      sample: items.slice(0, 5).map(({ ciphertext: _c, nonce: _n, ...rest }) => rest),
    };
  }

  // --- Dispatch ---
  createDispatch(req: DispatchRequest): DispatchRequest {
    this.data.dispatchRequests.push(req);
    return req;
  }

  listPendingDispatch(deviceId: string): DispatchRequest[] {
    return this.data.dispatchRequests.filter(
      (d) => d.targetDeviceId === deviceId && d.status === "pending",
    );
  }

  findDispatch(id: string): DispatchRequest | undefined {
    return this.data.dispatchRequests.find((d) => d.id === id);
  }

  updateDispatch(id: string, patch: Partial<DispatchRequest>): DispatchRequest | undefined {
    const d = this.findDispatch(id);
    if (!d) return undefined;
    Object.assign(d, patch, { updatedAt: new Date().toISOString() });
    return d;
  }
}

/** SHA-256 of ciphertext — proves server never stores plaintext */
export function ciphertextFingerprint(ciphertext: string): string {
  return createHash("sha256").update(ciphertext).digest("hex").slice(0, 16);
}
