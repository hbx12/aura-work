/**
 * Checkpoint system for Aura CLI
 * Session snapshots and rollback functionality
 */

import { randomUUID } from 'crypto';
import { getDatabase } from '../db.js';

// Checkpoint metadata
export interface Checkpoint {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  createdAt: string;
  messageCount: number;
  metadata?: Record<string, unknown>;
}

// Create a checkpoint
export async function createCheckpoint(
  sessionId: string,
  name: string,
  description?: string
): Promise<Checkpoint> {
  const db = await getDatabase();
  const messages = await db.getMessagesBySession(sessionId);

  const checkpoint: Checkpoint = {
    id: randomUUID(),
    sessionId,
    name,
    description,
    createdAt: new Date().toISOString(),
    messageCount: messages.length,
  };

  await db.createCheckpoint({
    id: checkpoint.id,
    sessionId: checkpoint.sessionId,
    name: checkpoint.name,
    description: checkpoint.description,
    messageCount: checkpoint.messageCount,
  });

  return checkpoint;
}

// Get checkpoints for a session
export async function getCheckpoints(sessionId: string): Promise<Checkpoint[]> {
  const db = await getDatabase();
  return db.getCheckpointsBySession(sessionId);
}

// Get a specific checkpoint
export async function getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
  const db = await getDatabase();
  return db.getCheckpoint(checkpointId);
}

// Rollback to a checkpoint
export async function rollbackToCheckpoint(
  checkpointId: string
): Promise<{ success: boolean; messagesRemoved: number }> {
  const db = await getDatabase();
  const checkpoint = await db.getCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  // Get current messages
  const currentMessages = await db.getMessagesBySession(checkpoint.sessionId);

  // Remove messages after checkpoint
  const messagesToRemove = currentMessages.slice(checkpoint.messageCount);

  for (const msg of messagesToRemove) {
    await db.deleteMessage(msg.id);
  }

  return {
    success: true,
    messagesRemoved: messagesToRemove.length,
  };
}

// Delete a checkpoint
export async function deleteCheckpoint(checkpointId: string): Promise<void> {
  const db = await getDatabase();
  await db.deleteCheckpoint(checkpointId);
}

// Auto-checkpoint before risky operations
export async function autoCheckpoint(
  sessionId: string,
  operation: string
): Promise<Checkpoint | null> {
  // Create checkpoint before risky operations
  const riskyOperations = [
    'delete',
    'remove',
    'git reset',
    'git revert',
    'npm install',
    'pip install',
  ];

  const isRisky = riskyOperations.some(op => operation.toLowerCase().includes(op));

  if (isRisky) {
    return createCheckpoint(
      sessionId,
      `auto-before-${operation.slice(0, 20)}`,
      `Automatic checkpoint before: ${operation}`
    );
  }

  return null;
}

// Get undo history
export async function getUndoHistory(sessionId: string): Promise<Checkpoint[]> {
  const checkpoints = await getCheckpoints(sessionId);
  return checkpoints.reverse(); // Most recent first
}

// Undo last operation (rollback to most recent checkpoint)
export async function undoLast(sessionId: string): Promise<{
  success: boolean;
  checkpoint: Checkpoint;
  messagesRemoved: number;
} | null> {
  const checkpoints = await getUndoHistory(sessionId);

  if (checkpoints.length === 0) {
    return null;
  }

  const latestCheckpoint = checkpoints[0];
  const result = await rollbackToCheckpoint(latestCheckpoint.id);

  return {
    ...result,
    checkpoint: latestCheckpoint,
  };
}
