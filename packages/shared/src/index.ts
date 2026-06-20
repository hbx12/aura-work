export type ProviderId =
  | "aura-cloud"
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "ollama"
  | "openai-compatible"
  | "minimax"
  | "qwen"
  | "lmstudio";

export type RoutingPolicy = "quality-first" | "cost-first" | "privacy-first" | "local-only" | "manual";

export interface ModelInfo {
  id: string;
  providerId: ProviderId;
  displayName: string;
  contextWindow: number;
  inputCostPer1M?: number | null;
  outputCostPer1M?: number | null;
  supportsTools?: boolean;
  supportsVision?: boolean;
  localOnly?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface RoutingDecision {
  providerId: ProviderId;
  modelId: string;
  reason: string;
  estimatedCostUsd?: number | null;
  requiresApproval?: boolean;
  fallbackFrom?: ProviderId | null;
}

export interface ProviderConfigPublic {
  providerId: ProviderId;
  enabled: boolean;
  displayName: string;
  models: ModelInfo[];
  baseUrl?: string | null;
  authMode?: string | null;
  hasSecret?: boolean;
  validatedAt?: string | null;
  validationStatus?: "unknown" | "valid" | "invalid";
  validationMessage?: string | null;
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
  | "cancelled";

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

export interface ScheduledTaskRecord {
  id: string;
  projectId: string;
  name: string;
  prompt: string;
  cadenceKind: string;
  cronExpr?: string | null;
  everySeconds?: number | null;
  timezone?: string | null;
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

export interface PermissionProfileGrant {
  category: string;
  action: string;
  targetPattern: string;
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

export interface MarketplacePublisher {
  name: string;
  github?: string | null;
  verified?: boolean;
}

export interface MarketplaceAuthField {
  name: string;
  label: string;
  secret?: boolean;
  required?: boolean;
}

export interface MarketplaceAuth {
  type: "none" | "api-key" | "pat" | "oauth" | "oauth-or-pat" | "env" | "connection-string" | "local-file" | "local-only";
  requiresLogin?: boolean;
  fields?: MarketplaceAuthField[];
}

export interface MarketplaceInstall {
  kind: "skill" | "mcp" | "plugin";
  transport?: "stdio" | "sse" | string;
  command?: string;
  args?: string[];
  script?: string;
  prompt?: string;
}

export interface MarketplaceTool {
  name: string;
  description?: string;
}

export interface MarketplaceLocalizedText {
  name?: string;
  summary?: string;
  description?: string;
  setup?: string[];
  tools?: MarketplaceTool[];
  categories?: string[];
}

export interface MarketplaceEntry {
  id: string;
  type: "skill" | "mcp" | "plugin";
  name: string;
  version: string;
  summary?: string | null;
  description?: string | null;
  publisher?: MarketplacePublisher | null;
  icon?: string | null;
  cover?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  risk?: "low" | "medium" | "high" | null;
  auth?: MarketplaceAuth | null;
  install?: MarketplaceInstall | null;
  permissions?: string[] | null;
  setup?: string[] | null;
  tools?: MarketplaceTool[] | null;
  homepage?: string | null;
  license?: string | null;
  repository?: string | null;
  localized?: Record<string, MarketplaceLocalizedText> | null;
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
}
