import { getDatabase, type Database, type Project, type Session, type Message } from "./db.js";
import { getAgentClient, type AgentClient } from "./agent.js";
import { loadConfig, type AuraConfig } from "./config.js";
import { resolveProjectPath } from "../utils/platform.js";
import { log } from "../utils/logger.js";

export interface RunOptions {
  /** Project directory */
  dir?: string;
  /** Continue last session */
  continue?: boolean;
  /** Resume specific session */
  session?: string;
  /** Fork before continuing */
  fork?: string;
  /** Model in provider/model format */
  model?: string;
  /** Agent name */
  agent?: string;
  /** Attach files */
  files?: string[];
  /** Output format */
  format?: "text" | "json";
  /** Auto-approve low-risk */
  auto?: boolean;
}

export class AuraRuntime {
  readonly db: Database;
  readonly agent: AgentClient;
  readonly config: AuraConfig;

  private _project: Project | null = null;
  private _session: Session | null = null;

  constructor(db: Database, agent: AgentClient, config: AuraConfig) {
    this.db = db;
    this.agent = agent;
    this.config = config;
  }

  get project(): Project | null {
    return this._project;
  }

  get session(): Session | null {
    return this._session;
  }

  async resolveProject(dir?: string): Promise<Project> {
    const projectPath = resolveProjectPath(dir);
    this._project = await this.db.getOrCreateProject(projectPath);
    log.debug(`Project: ${this._project.name} (${this._project.id})`);
    return this._project;
  }

  async resolveSession(opts: RunOptions): Promise<Session> {
    const project = this._project;
    if (!project) throw new Error("Project not resolved");

    if (opts.session) {
      const existing = await this.db.getSession(opts.session);
      if (!existing) throw new Error(`Session not found: ${opts.session}`);
      this._session = existing;
      return existing;
    }

    if (opts.continue) {
      const last = await this.db.getLastSession(project.id);
      if (last) {
        this._session = last;
        return last;
      }
    }

    // Create new session
    const modelParts = opts.model?.split("/");
    this._session = await this.db.createSession(project.folder_path, project.folder_path, {
      title: opts.dir ? `Session in ${project.name}` : undefined,
      agent: opts.agent ?? this.config.defaultAgent ?? "build",
      model_provider: modelParts?.[0],
      model_id: modelParts?.[1],
      mode: this.config.defaultMode ?? "build",
      source: "cli",
    });

    log.debug(`Session: ${this._session.id}`);
    return this._session;
  }

  async sendMessage(content: string, opts: RunOptions = {}): Promise<Message> {
    const session = this._session;
    if (!session) throw new Error("Session not resolved");

    // Create user message
    const userMsg = await this.db.createMessage(session.id, "user", content);

    // Parse model
    const modelParts = (opts.model ?? "").split("/");
    const providerId = modelParts[0] || session.model_provider || "openai";
    const modelId = modelParts[1] || session.model_id || "gpt-4o";

    try {
      // Get recent messages for context
      const recentMessages = await this.db.listMessages(session.id, 20);
      const chatMessages = recentMessages.map((m) => ({
        role: m.role,
        content: m.content ?? "",
      }));

      // Send to agent
      const response = await this.agent.chat({
        providerId,
        modelId,
        messages: chatMessages,
      });

      // Create assistant message
      const assistantMsg = await this.db.createMessage(session.id, "assistant", response.content);

      // Record usage
      if (response.usage) {
        await this.db.recordUsage(
          session.project_id,
          providerId,
          modelId,
          response.usage.inputTokens ?? 0,
          response.usage.outputTokens ?? 0,
          response.usage.estimatedCostUsd ?? 0,
        );

        // Update session totals
        await this.db.updateSession(session.id, {
          tokens_input: session.tokens_input + (response.usage.inputTokens ?? 0),
          tokens_output: session.tokens_output + (response.usage.outputTokens ?? 0),
          tokens_cache: session.tokens_cache + (response.usage.cacheReadTokens ?? 0),
          cost_total: session.cost_total + (response.usage.estimatedCostUsd ?? 0),
        });
      }

      return assistantMsg;
    } catch (err) {
      // Create error message
      await this.db.createMessage(session.id, "system", `Error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async listSessions(projectId?: string): Promise<Session[]> {
    return this.db.listSessions(projectId);
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return this.db.listMessages(sessionId);
  }
}

let _runtime: AuraRuntime | null = null;

export async function getRuntime(): Promise<AuraRuntime> {
  if (!_runtime) {
    const db = await getDatabase();
    const agent = getAgentClient();
    const config = loadConfig();
    _runtime = new AuraRuntime(db, agent, config);
  }
  return _runtime;
}
