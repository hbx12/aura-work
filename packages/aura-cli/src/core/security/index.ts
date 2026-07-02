/**
 * Security module for Aura CLI
 * Handles permissions, approvals, and risk assessment
 */

import { randomUUID } from 'crypto';
import { getDatabase } from '../db.js';

// Risk levels for actions
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Permission types
export type PermissionType = 'read' | 'write' | 'execute' | 'network' | 'admin';

// Approval status
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

// Permission request
export interface PermissionRequest {
  id: string;
  sessionId: string;
  action: string;
  description: string;
  riskLevel: RiskLevel;
  permissionType: PermissionType;
  resource?: string;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  autoApproved?: boolean;
}

// Approval policy
export interface ApprovalPolicy {
  autoApproveLowRisk: boolean;
  autoApproveMediumRisk: boolean;
  requireApprovalFor: PermissionType[];
  allowedResources?: string[];
  deniedResources?: string[];
}

// Default policies
const DEFAULT_POLICY: ApprovalPolicy = {
  autoApproveLowRisk: true,
  autoApproveMediumRisk: false,
  requireApprovalFor: ['write', 'execute', 'network', 'admin'],
};

// Risk assessment rules
const RISK_RULES: Array<{
  pattern: RegExp;
  riskLevel: RiskLevel;
  permissionType: PermissionType;
}> = [
  // File operations
  { pattern: /read.*file/i, riskLevel: 'low', permissionType: 'read' },
  { pattern: /write.*file|create.*file|edit.*file/i, riskLevel: 'medium', permissionType: 'write' },
  { pattern: /delete.*file|remove.*file/i, riskLevel: 'high', permissionType: 'write' },
  { pattern: /execute.*command|run.*command/i, riskLevel: 'medium', permissionType: 'execute' },

  // Network operations
  { pattern: /fetch|request|api.*call/i, riskLevel: 'medium', permissionType: 'network' },
  { pattern: /download|upload/i, riskLevel: 'medium', permissionType: 'network' },

  // System operations
  { pattern: /install.*package|npm.*install/i, riskLevel: 'medium', permissionType: 'execute' },
  { pattern: /git.*push|git.*commit/i, riskLevel: 'medium', permissionType: 'execute' },
  { pattern: /sudo|admin/i, riskLevel: 'critical', permissionType: 'admin' },

  // Sensitive data
  { pattern: /password|secret|token|key/i, riskLevel: 'high', permissionType: 'read' },
  { pattern: /env|environment.*variable/i, riskLevel: 'medium', permissionType: 'read' },
];

// Assess risk level of an action
export function assessRisk(action: string): { riskLevel: RiskLevel; permissionType: PermissionType } {
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(action)) {
      return { riskLevel: rule.riskLevel, permissionType: rule.permissionType };
    }
  }

  // Default to medium risk
  return { riskLevel: 'medium', permissionType: 'execute' };
}

// Check if action should be auto-approved
export function shouldAutoApprove(
  riskLevel: RiskLevel,
  policy: ApprovalPolicy = DEFAULT_POLICY
): boolean {
  switch (riskLevel) {
    case 'low':
      return policy.autoApproveLowRisk;
    case 'medium':
      return policy.autoApproveMediumRisk;
    case 'high':
    case 'critical':
      return false;
    default:
      return false;
  }
}

// Create permission request
export async function requestPermission(
  sessionId: string,
  action: string,
  description: string,
  resource?: string,
  policy?: ApprovalPolicy
): Promise<PermissionRequest> {
  const db = await getDatabase();
  const { riskLevel, permissionType } = assessRisk(action);
  const autoApprove = shouldAutoApprove(riskLevel, policy);

  const request: PermissionRequest = {
    id: randomUUID(),
    sessionId,
    action,
    description,
    riskLevel,
    permissionType,
    resource,
    status: autoApprove ? 'approved' : 'pending',
    requestedAt: new Date().toISOString(),
    autoApproved: autoApprove,
  };

  if (autoApprove) {
    request.resolvedAt = request.requestedAt;
    request.resolvedBy = 'auto';
  }

  // Store in database
  await db.createApproval({
    id: request.id,
    sessionId: request.sessionId,
    action: request.action,
    description: request.description,
    riskLevel: request.riskLevel,
    permissionType: request.permissionType,
    status: request.status,
    resolvedAt: request.resolvedAt,
    resolvedBy: request.resolvedBy,
  });

  return request;
}

// Approve a pending request
export async function approveRequest(
  requestId: string,
  approvedBy: string = 'user'
): Promise<PermissionRequest | null> {
  const db = await getDatabase();

  await db.updateApproval(requestId, {
    status: 'approved',
    resolvedAt: new Date().toISOString(),
    resolvedBy: approvedBy,
  });

  return db.getApproval(requestId);
}

// Deny a pending request
export async function denyRequest(
  requestId: string,
  deniedBy: string = 'user'
): Promise<PermissionRequest | null> {
  const db = await getDatabase();

  await db.updateApproval(requestId, {
    status: 'denied',
    resolvedAt: new Date().toISOString(),
    resolvedBy: deniedBy,
  });

  return db.getApproval(requestId);
}

// Get pending approvals for a session
export async function getPendingApprovals(sessionId: string): Promise<PermissionRequest[]> {
  const db = await getDatabase();
  return db.getApprovalsBySession(sessionId, 'pending');
}

// Check if an action is allowed (has approval or is auto-approved)
export async function isActionAllowed(
  sessionId: string,
  action: string
): Promise<boolean> {
  const db = await getDatabase();

  // Check for existing approval
  const approvals = await db.getApprovalsBySession(sessionId);
  const existing = approvals.find(a =>
    a.action === action && a.status === 'approved'
  );

  if (existing) return true;

  // Assess risk and check auto-approve
  const { riskLevel } = assessRisk(action);
  return shouldAutoApprove(riskLevel);
}

// Audit log entry
export interface AuditEntry {
  id: string;
  sessionId: string;
  action: string;
  resource?: string;
  riskLevel: RiskLevel;
  permissionType: PermissionType;
  status: 'allowed' | 'denied';
  timestamp: string;
  details?: string;
}

// Log audit entry
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDatabase();

  await db.createAuditEntry({
    id: randomUUID(),
    ...entry,
    timestamp: new Date().toISOString(),
  });
}
