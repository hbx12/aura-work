import { describe, it, expect } from "vitest";
import type {
  CloudSyncConfig,
  CloudSyncStatus,
  DispatchPendingItem,
  EncryptedSyncEnvelope,
  HelperState,
  SyncObjectType,
} from "./types.js";

describe("aura-cloud-sync types", () => {
  describe("SyncObjectType", () => {
    it("should accept valid sync object types", () => {
      const validTypes: SyncObjectType[] = [
        "project",
        "task",
        "message",
        "audit-entry",
        "setting",
        "plugin-metadata",
        "scheduled-task",
      ];
      expect(validTypes).toHaveLength(7);
    });
  });

  describe("HelperState", () => {
    it("should accept valid helper states", () => {
      const validStates: HelperState[] = [
        "stopped",
        "starting",
        "running",
        "unavailable",
      ];
      expect(validStates).toHaveLength(4);
    });
  });

  describe("EncryptedSyncEnvelope", () => {
    it("should create a valid envelope object", () => {
      const envelope: EncryptedSyncEnvelope = {
        id: "env-123",
        ownerAccountId: "account-456",
        objectType: "task",
        version: 1,
        ciphertext: "encrypted-data",
        nonce: "random-nonce",
        keyVersion: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      expect(envelope.id).toBe("env-123");
      expect(envelope.objectType).toBe("task");
      expect(envelope.version).toBe(1);
    });
  });

  describe("CloudSyncConfig", () => {
    it("should create a valid config object", () => {
      const config: CloudSyncConfig = {
        serverUrl: "http://localhost:47828",
        accessToken: "test-token",
        accountId: "account-123",
        deviceId: "device-456",
        syncEnabled: true,
      };
      expect(config.serverUrl).toBe("http://localhost:47828");
      expect(config.syncEnabled).toBe(true);
    });
  });

  describe("CloudSyncStatus", () => {
    it("should create a valid status object", () => {
      const status: CloudSyncStatus = {
        state: "running",
        serverUrl: "http://localhost:47828",
        accountId: "account-123",
        deviceId: "device-456",
        syncEnabled: true,
        lastSyncAt: "2026-01-01T00:00:00Z",
        lastSyncPushCount: 5,
        lastSyncPullCount: 3,
        dispatchPollActive: true,
        pendingDispatchCount: 0,
        running: true,
      };
      expect(status.state).toBe("running");
      expect(status.running).toBe(true);
      expect(status.lastSyncPushCount).toBe(5);
    });

    it("should handle stopped state", () => {
      const status: CloudSyncStatus = {
        state: "stopped",
        syncEnabled: false,
        dispatchPollActive: false,
        pendingDispatchCount: 0,
        running: false,
      };
      expect(status.state).toBe("stopped");
      expect(status.running).toBe(false);
    });

    it("should handle error state with remediation", () => {
      const status: CloudSyncStatus = {
        state: "unavailable",
        syncEnabled: true,
        lastError: "Connection refused",
        dispatchPollActive: false,
        pendingDispatchCount: 0,
        running: false,
        remediation: "Check cloud server status",
      };
      expect(status.state).toBe("unavailable");
      expect(status.lastError).toBe("Connection refused");
      expect(status.remediation).toBe("Check cloud server status");
    });
  });

  describe("DispatchPendingItem", () => {
    it("should create a valid dispatch item", () => {
      const item: DispatchPendingItem = {
        id: "dispatch-123",
        sourceDeviceId: "device-456",
        ciphertext: "encrypted-dispatch",
        nonce: "dispatch-nonce",
        createdAt: "2026-01-01T00:00:00Z",
      };
      expect(item.id).toBe("dispatch-123");
      expect(item.sourceDeviceId).toBe("device-456");
    });
  });
});
