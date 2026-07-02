/**
 * Desktop Sync module for Aura CLI
 * Handles synchronization between CLI and Desktop app
 */

import { getDatabase } from './db.js';
import { EventEmitter } from 'events';

// Event types for sync
export type SyncEventType =
  | 'session.created'
  | 'session.updated'
  | 'session.deleted'
  | 'message.created'
  | 'approval.created'
  | 'approval.resolved'
  | 'checkpoint.created'
  | 'usage.recorded';

// Sync event
export interface SyncEvent {
  type: SyncEventType;
  source: 'cli' | 'desktop';
  sessionId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Sync manager
export class SyncManager extends EventEmitter {
  private static instance: SyncManager;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSync: Date = new Date(0);

  private constructor() {
    super();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  // Emit a sync event (CLI -> Desktop)
  async emitSync(event: Omit<SyncEvent, 'timestamp'>): Promise<void> {
    const fullEvent: SyncEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.emit('sync', fullEvent);

    // Store in database for Desktop to pick up
    const db = await getDatabase();
    await db.recordSyncEvent({
      type: fullEvent.type,
      source: fullEvent.source,
      sessionId: fullEvent.sessionId,
      data: JSON.stringify(fullEvent.data),
      timestamp: fullEvent.timestamp,
    });
  }

  // Start polling for Desktop events
  startPolling(intervalMs: number = 1000): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      await this.pollDesktopEvents();
    }, intervalMs);
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Poll for new events from Desktop
  private async pollDesktopEvents(): Promise<void> {
    try {
      const db = await getDatabase();
      const events = await db.getSyncEventsSince(this.lastSync.toISOString());

      for (const event of events) {
        if (event.source === 'desktop') {
          this.emit('desktop-event', event);
          this.lastSync = new Date(event.timestamp);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }

  // Get recent sync events
  async getRecentEvents(limit: number = 50): Promise<SyncEvent[]> {
    const db = await getDatabase();
    return db.getRecentSyncEvents(limit);
  }
}

// Helper functions for common sync operations
export async function syncSessionCreated(sessionId: string, data: Record<string, unknown>): Promise<void> {
  const sync = SyncManager.getInstance();
  await sync.emitSync({
    type: 'session.created',
    source: 'cli',
    sessionId,
    data,
  });
}

export async function syncSessionUpdated(sessionId: string, data: Record<string, unknown>): Promise<void> {
  const sync = SyncManager.getInstance();
  await sync.emitSync({
    type: 'session.updated',
    source: 'cli',
    sessionId,
    data,
  });
}

export async function syncMessageCreated(sessionId: string, data: Record<string, unknown>): Promise<void> {
  const sync = SyncManager.getInstance();
  await sync.emitSync({
    type: 'message.created',
    source: 'cli',
    sessionId,
    data,
  });
}

export async function syncApprovalCreated(sessionId: string, data: Record<string, unknown>): Promise<void> {
  const sync = SyncManager.getInstance();
  await sync.emitSync({
    type: 'approval.created',
    source: 'cli',
    sessionId,
    data,
  });
}

export async function syncCheckpointCreated(sessionId: string, data: Record<string, unknown>): Promise<void> {
  const sync = SyncManager.getInstance();
  await sync.emitSync({
    type: 'checkpoint.created',
    source: 'cli',
    sessionId,
    data,
  });
}

export async function syncUsageRecorded(sessionId: string, data: Record<string, unknown>): Promise<void> {
  const sync = SyncManager.getInstance();
  await sync.emitSync({
    type: 'usage.recorded',
    source: 'cli',
    sessionId,
    data,
  });
}
