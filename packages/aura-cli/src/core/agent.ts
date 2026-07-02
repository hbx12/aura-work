import { loadConfig } from "./config.js";
import { AgentOfflineError } from "../utils/errors.js";

export interface AgentHealth {
  status: string;
  phase: number;
  version: string;
  message?: string;
}

export interface ChatRequest {
  providerId: string;
  modelId: string;
  messages: { role: string; content: string }[];
  credentials?: Record<string, string>;
}

export interface ChatResponse {
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    estimatedCostUsd?: number;
  };
}

export interface TaskPlanRequest {
  projectId: string;
  prompt: string;
  agent?: string;
  model?: string;
}

export interface TaskIterateRequest {
  projectId: string;
  taskId: string;
  prompt: string;
  agent?: string;
  model?: string;
  providerId?: string;
  directory?: string;
  worktree?: string;
}

export class AgentClient {
  private baseUrl: string;
  private token: string | undefined;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.agentUrl ?? "http://127.0.0.1:47821";
    this.token = process.env.AURA_SIDECAR_TOKEN;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["X-Sidecar-Auth"] = this.token;
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new AgentOfflineError();
    }

    if (res.status === 503 || res.status === 502) {
      throw new AgentOfflineError();
    }

    const text = await res.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      const err = (data as { error?: string }).error ?? `HTTP ${res.status}`;
      throw new Error(err);
    }

    return data as T;
  }

  async health(): Promise<AgentHealth> {
    return this.request<AgentHealth>("GET", "/health");
  }

  async chat(body: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>("POST", "/chat", body);
  }

  async plan(body: TaskPlanRequest): Promise<unknown> {
    return this.request<unknown>("POST", "/task/plan", body);
  }

  async iterate(body: TaskIterateRequest): Promise<unknown> {
    return this.request<unknown>("POST", "/task/iterate", body);
  }

  async stream(taskId: string): Promise<{ text: string }> {
    return this.request<{ text: string }>("GET", `/task/stream?taskId=${taskId}`);
  }

  async validateProvider(providerId: string, credentials: Record<string, string>): Promise<{ valid: boolean; message?: string }> {
    return this.request("POST", "/providers/validate", { providerId, credentials });
  }

  async listModels(providerId: string, credentials?: Record<string, string>): Promise<{ models: unknown[] }> {
    return this.request("POST", "/providers/models", { providerId, credentials });
  }

  async listAgents(projectPath?: string): Promise<{ agents: unknown[] }> {
    return this.request("POST", "/agents/list", { projectPath });
  }

  async listTools(projectPath?: string): Promise<unknown[]> {
    return this.request("POST", "/tools/list", { projectPath });
  }
}

let _client: AgentClient | null = null;

export function getAgentClient(): AgentClient {
  if (!_client) _client = new AgentClient();
  return _client;
}
