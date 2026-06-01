export type SyncObjectType =
  | "project"
  | "task"
  | "message"
  | "audit-entry"
  | "setting"
  | "plugin-metadata"
  | "scheduled-task";

export interface Account {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  token: string;
  accountId: string;
  expiresAt: string;
}

export interface Device {
  id: string;
  accountId: string;
  name: string;
  deviceType: "desktop" | "mobile" | "remote";
  publicKey: string;
  pairedAt: string;
  lastSeenAt: string;
  revoked: boolean;
}

export interface PairingSession {
  code: string;
  accountId: string;
  initiatorDeviceId: string;
  initiatorPublicKey: string;
  wrappedSyncKey?: string;
  expiresAt: string;
  claimedByDeviceId?: string;
}

export interface EncryptedSyncEnvelope {
  id: string;
  ownerAccountId: string;
  objectType: SyncObjectType;
  version: number;
  ciphertext: string;
  nonce: string;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchRequest {
  id: string;
  accountId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  ciphertext: string;
  nonce: string;
  status: "pending" | "delivered" | "failed" | "completed";
  failureReason?: string;
  responseCiphertext?: string;
  responseNonce?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudStore {
  accounts: Account[];
  sessions: Session[];
  devices: Device[];
  pairingSessions: PairingSession[];
  syncEnvelopes: EncryptedSyncEnvelope[];
  dispatchRequests: DispatchRequest[];
}
