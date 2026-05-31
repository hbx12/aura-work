export type SyncObjectType =
  | "project"
  | "task"
  | "message"
  | "audit-entry"
  | "setting"
  | "plugin-metadata"
  | "scheduled-task";

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

export interface CloudSyncConfig {
  serverUrl: string;
  accessToken: string;
  accountId: string;
  deviceId: string;
  syncEnabled: boolean;
}

export type HelperState = "stopped" | "starting" | "running" | "unavailable";

export interface CloudSyncStatus {
  state: HelperState;
  serverUrl?: string;
  accountId?: string;
  deviceId?: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  lastSyncPushCount?: number;
  lastSyncPullCount?: number;
  lastError?: string;
  dispatchPollActive: boolean;
  pendingDispatchCount: number;
  running: boolean;
  remediation?: string;
}

export interface DispatchPendingItem {
  id: string;
  sourceDeviceId: string;
  ciphertext: string;
  nonce: string;
  createdAt: string;
}
