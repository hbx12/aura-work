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

export interface ProjectComputerSettings {
  projectId: string;
  screenshotRetention: ScreenshotRetention;
}

export interface PermissionProfileGrant {
  category: string;
  action: string;
  targetPattern: string;
}

export type ScheduledCadenceKind =
  | "manual"
  | "hourly"
  | "daily"
  | "weekly"
  | "weekdays"
  | "custom";

export interface ScheduledCadence {
  kind: ScheduledCadenceKind | string;
  hour?: number | null;
  minute?: number | null;
  dayOfWeek?: number | null;
  cron?: string | null;
}

export interface ScheduledTaskRecord {
  id: string;
  name: string;
  description?: string | null;
  prompt: string;
  projectId: string;
  routingPolicy?: string | null;
  cadence: ScheduledCadence;
  permissionProfile: PermissionProfileGrant[];
  paused: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledTaskListItem {
  id: string;
  name: string;
  projectId: string;
  cadenceKind: string;
  paused: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  updatedAt: string;
}

export interface ScheduledTaskRun {
  id: string;
  scheduledTaskId: string;
  taskId?: string | null;
  status: string;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
}

export const PERMISSION_PROFILE_PRESETS: {
  id: string;
  label: string;
  grants: PermissionProfileGrant[];
}[] = [
  {
    id: "read-only",
    label: "Read-only files",
    grants: [{ category: "file", action: "read", targetPattern: "*" }],
  },
  {
    id: "safe-automation",
    label: "Safe automation",
    grants: [
      { category: "file", action: "read", targetPattern: "*" },
      { category: "file", action: "write", targetPattern: "*" },
      { category: "shell", action: "read", targetPattern: "*" },
    ],
  },
  {
    id: "research",
    label: "Research (read + browse)",
    grants: [
      { category: "file", action: "read", targetPattern: "*" },
      { category: "browser", action: "browse", targetPattern: "*" },
    ],
  },
];

export interface FileEntry {
  path: string;
  name: string;
  isDir: boolean;
  size?: number | null;
}

export interface PendingEdit {
  id: string;
  projectId: string;
  taskId?: string | null;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diff: string;
  status: string;
  createdAt: string;
}

export interface GitStatusResult {
  isRepo: boolean;
  branch?: string | null;
  clean: boolean;
  files: { path: string; status: string }[];
}

export interface PendingCommit {
  id: string;
  projectId: string;
  taskId?: string | null;
  message: string;
  diff: string;
  status: string;
  createdAt: string;
}

export interface PendingMemory {
  id: string;
  projectId: string;
  taskId?: string | null;
  content: string;
  status: string;
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  projectId: string;
  taskId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface VmMount {
  projectId: string;
  hostPath: string;
  guestPath: string;
  mode: "read" | "read-write";
  mountedAt: string;
}

export interface VmStatus {
  state: "stopped" | "starting" | "running" | "unavailable";
  backend: string;
  backendLabel: string;
  imageVersion: string;
  mounts: VmMount[];
  startedAt?: string | null;
  lastError?: string | null;
  remediation?: string | null;
  running: boolean;
}

export interface BrowserProfile {
  projectId: string;
  profilePath: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface BrowserStatus {
  state: "stopped" | "starting" | "running" | "unavailable";
  backend: string;
  backendLabel: string;
  profiles: BrowserProfile[];
  startedAt?: string | null;
  lastError?: string | null;
  remediation?: string | null;
  running: boolean;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  publisher?: string | null;
  description?: string | null;
  installPath: string;
  enabled: boolean;
  installedAt: string;
  toolCount: number;
}

export interface McpServerRecord {
  id: string;
  name: string;
  transport: string;
  command: string;
  args: string[];
  env: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  version: string;
  publisher?: string | null;
  description?: string | null;
  homepage?: string | null;
  license?: string | null;
  repository?: string | null;
  tags?: string[] | null;
  syncedAt?: string | null;
}

export interface PluginsHelperStatus {
  state: "stopped" | "starting" | "running" | "unavailable";
  pluginCount: number;
  mcpServerCount: number;
  mcpConnectedCount: number;
  toolCount: number;
  startedAt?: string | null;
  lastError?: string | null;
  remediation?: string | null;
  running: boolean;
}

export interface CloudSyncStatus {
  state: string;
  serverUrl?: string | null;
  accountId?: string | null;
  deviceId?: string | null;
  syncEnabled: boolean;
  lastSyncAt?: string | null;
  lastSyncPushCount?: number | null;
  lastSyncPullCount?: number | null;
  lastError?: string | null;
  dispatchPollActive: boolean;
  pendingDispatchCount: number;
  running: boolean;
  remediation?: string | null;
}

export interface CloudAccountStatus {
  signedIn: boolean;
  accountId?: string | null;
  email?: string | null;
  displayName?: string | null;
  serverUrl: string;
  deviceId?: string | null;
  deviceName?: string | null;
  syncEnabled: boolean;
  hasRecoveryKey: boolean;
  recoveryKeyFingerprint?: string | null;
  lastSyncAt?: string | null;
  cloudServerReachable: boolean;
  syncHelper?: CloudSyncStatus | null;
}

export interface CloudDeviceInfo {
  id: string;
  name: string;
  deviceType: string;
  publicKey: string;
  pairedAt: string;
  lastSeenAt: string;
  online: boolean;
}

export interface CloudRegisterResult {
  status: CloudAccountStatus;
  recoveryKey: string;
}

export const DEFAULT_CLOUD_SERVER_URL = "http://127.0.0.1:47830";
export const BRIDGE_PUBLIC_URL = "http://127.0.0.1:47826";
export const BRIDGE_INTERNAL_PORT = 47827;

export type BridgeClientType =
  | "chrome-extension"
  | "office-word"
  | "office-excel"
  | "office-powerpoint";

export interface BridgeHelperStatus {
  state: string;
  clientCount: number;
  connectedClients: number;
  startedAt?: string | null;
  lastError?: string | null;
  remediation?: string | null;
  running: boolean;
}

export interface BridgeStatus {
  internalRunning: boolean;
  helper: BridgeHelperStatus;
  pairedClientCount: number;
  internalPort: number;
  publicPort: number;
}

export interface BridgeClientRecord {
  id: string;
  name: string;
  clientType: string;
  projectId?: string | null;
  pairedAt: string;
  lastSeenAt?: string | null;
  revoked: boolean;
}

export interface BridgePairingResult {
  code: string;
  expiresAt: string;
}

export const PROVIDER_META: Record<
  ProviderId,
  { displayName: string; logo: string; color: string; local?: boolean }
> = {
  anthropic: { displayName: "Anthropic", logo: "A", color: "#c2683f" },
  openai: { displayName: "OpenAI", logo: "O", color: "#1a7f64" },
  gemini: { displayName: "Google Gemini", logo: "G", color: "#3a6fc4" },
  deepseek: { displayName: "DeepSeek", logo: "D", color: "#4b5bb0" },
  ollama: { displayName: "Ollama", logo: "Ω", color: "#7a5c8e", local: true },
  "openai-compatible": {
    displayName: "Custom endpoint",
    logo: "{}",
    color: "#645d4e",
  },
  minimax: { displayName: "Minimax", logo: "M", color: "#e05c2b" },
  qwen: { displayName: "Qwen", logo: "Q", color: "#4f35b3" },
  lmstudio: { displayName: "LM Studio", logo: "L", color: "#1988a2", local: true },
};

export const ROUTING_POLICIES: {
  id: RoutingPolicy;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "quality-first",
    title: "Quality-first",
    subtitle: "Best model for the job. Default.",
  },
  {
    id: "cost-first",
    title: "Cost-first",
    subtitle: "Cheapest model that can do the task.",
  },
  {
    id: "privacy-first",
    title: "Privacy-first",
    subtitle: "Prefer local; redact secrets before cloud.",
  },
  {
    id: "local-only",
    title: "Local-only",
    subtitle: "Ollama only. No cloud requests.",
  },
  {
    id: "manual",
    title: "Manual model",
    subtitle: "Use the model you pick per provider.",
  },
];

export * from "./sidecar-auth.js";
