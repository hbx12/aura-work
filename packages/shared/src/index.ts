export type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "ollama"
  | "openai-compatible"
  | "qwen"
  | "minimax"
  | "lmstudio";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  secretLabel: string;
  defaultBaseUrl?: string;
  supportsOAuth?: boolean;
}

export const PROVIDER_META: ProviderMeta[] = [
  { id: "openai", label: "OpenAI", secretLabel: "OpenAI API key" },
  { id: "anthropic", label: "Anthropic", secretLabel: "Anthropic API key" },
  { id: "gemini", label: "Google Gemini", secretLabel: "Gemini API key" },
  { id: "deepseek", label: "DeepSeek", secretLabel: "DeepSeek API key" },
  { id: "ollama", label: "Ollama", secretLabel: "Local Ollama", defaultBaseUrl: "http://127.0.0.1:11434" },
  { id: "openai-compatible", label: "OpenAI Compatible", secretLabel: "API key / optional" },
  { id: "qwen", label: "Qwen", secretLabel: "Qwen API key" },
  { id: "minimax", label: "MiniMax", secretLabel: "MiniMax API key" },
  { id: "lmstudio", label: "LM Studio", secretLabel: "Local LM Studio", defaultBaseUrl: "http://127.0.0.1:1234" },
];

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  enabled: boolean;
  hasSecret: boolean;
  baseUrl?: string | null;
  defaultModel?: string | null;
  accountLabel?: string | null;
  updatedAt?: string | null;
}

export interface ChatUsage {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
  estimatedCostUsd?: number | null;
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
  metadata?: string | null;
  createdAt: string;
}
