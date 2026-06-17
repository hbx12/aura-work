export type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "ollama"
  | "openai-compatible"
  | "minimax"
  | "qwen"
  | "lmstudio";

export {
  DEFAULT_JSON_BODY_LIMIT_BYTES,
  SIDECAR_AUTH_ENV,
  isSidecarAuthorized,
  loadSidecarToken,
  readJsonBody,
  rejectUnauthorized,
  requireSidecarAuth,
} from "./sidecar-auth.js";

export type RoutingPolicy =
  | "quality-first"
  | "cost-first"
  | "privacy-first"
  | "local-only"
  | "manual";

export type ModelCapability =
  | "text"
  | "vision"
  | "tool-calling"
  | "json-schema"
  | "reasoning"
  | "embeddings"
  | "audio"
  | "video";

export interface ModelPricing {
  inputPerMillionTokens?: number;
  outputPerMillionTokens?: number;
  currency: "USD";
  source: "auto" | "manual" | "unknown";
  updatedAt?: string;
}

export interface ModelInfo {
  id: string;
  providerId: ProviderId;
  displayName: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities: ModelCapability[];
  pricing?: ModelPricing;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  estimatedCostUsd?: number;
}

export interface RoutingContext {
  taskType:
    | "coding"
    | "research"
    | "document"
    | "data"
    | "browser"
    | "review"
    | "security"
    | "general";
  sensitivity: "normal" | "sensitive" | "secret-risk";
  needsVision?: boolean;
  needsToolCalling?: boolean;
  needsReasoning?: boolean;
  userPreferredModel?: string;
  allowedProviders: ProviderId[];
}

export interface RoutingDecision {
  providerId: ProviderId;
  modelId: string;
  reason: string;
  estimatedCostClass: "low" | "medium" | "high" | "unknown";
  requiresApproval?: boolean;
}

export interface ProviderConfigPublic {
  providerId: ProviderId;
  displayName: string;
  enabled: boolean;
  hasSecret: boolean;
  baseUrl?: string | null;
  defaultModel?: string | null;
  manualModel?: string | null;
  validatedAt?: string | null;
  validationStatus: "unknown" | "valid" | "invalid";
}

export interface TaskUsageRecord {
  id: string;
  projectId?: string | null;
  providerId: ProviderId;
  modelId: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
  routingPolicy: RoutingPolicy;
  createdAt: string;
}

export interface VaultStatus {
  unlocked: boolean;
  version: number;
  secretCount: number;
  deviceBound: boolean;
}

export type TaskStateName =
  | "draft"
  | "planning"
  | "waiting-for-approval"
  | "running"
  | "paused"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolled_back";

export interface PlanStep {
  title: string;
  subtitle?: string | null;
  role?: string | null;
}

export interface TaskStep {
  title: string;
  role?: string | null;
  status: string;
  tool?: string | null;
  toolOk?: boolean | null;
  output?: string | null;
}

export interface TaskMessage {
  role: string;
  content: string;
  agentRole?: string | null;
}

export interface TaskRecord {
  id: string;
  projectId: string;
  title: string;
  prompt: string;
  state: TaskStateName;
  plan: PlanStep[];
  steps: TaskStep[];
  messages: TaskMessage[];
  planApproved: boolean;
  iteration: number;
  summary?: string | null;
  modifiedFiles: string[];
  pendingPermissionId?: string | null;
  pendingEditId?: string | null;
  providerId?: string | null;
  modelId?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListItem {
  id: string;
  projectId: string;
  title: string;
  state: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  projectId?: string | null;
  taskId?: string | null;
  actor: string;
  category: string;
  action: string;
  target?: string | null;
  summary: string;
  risk?: string | null;
  decision?: string | null;
  result: string;
  createdAt: string;
  metadata?: string | null;
}

export interface PermissionRequest {
  id: string;
  projectId: string;
  taskId?: string | null;
  category: string;
  action: string;
  target: string;
  reason: string;
  risk: string;
  requestedBy: string;
  allowAlwaysAvailable: boolean;
  desktopOnly?: boolean;
  status: string;
  createdAt: string;
}

export const COMPUTER_USE_HELPER_URL = "http://127.0.0.1:47828";

export type ScreenshotRetention = "none" | "task" | "always";

export interface ComputerUseStatus {
  state: string;
  backend: string;
  backendLabel: string;
  experimental: boolean;
  startedAt?: string | null;
  lastError?: string | null;
  remediation?: string | null;
  running: boolean;
}

export interface DesktopWindow {
  id: string;
  processName: string;
  title: string;
}

export interface ComputerUseBlocklistEntry {
  id: string;
  pattern: string;
  category: string;
  userEditable: boolean;
  createdAt: string;
}

export interface ComputerUseScreenshotRecord {
  id: string;
  projectId: string;
  taskId?: string | null;
  appTarget?: string | null;
  filePath: string;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}
