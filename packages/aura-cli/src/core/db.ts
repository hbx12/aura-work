import { existsSync } from "node:fs";
import { getDbPath } from "../utils/platform.js";
import { log } from "../utils/logger.js";

// ─── Types ────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  folder_path: string;
  instructions?: string;
  permission_mode: string;
  git_remote?: string;
  git_branch?: string;
  commands_json?: string;
  created_at: string;
  updated_at: string;
  last_opened_at?: string;
}

export interface Session {
  id: string;
  project_id: string;
  parent_id?: string;
  title?: string;
  directory: string;
  agent: string;
  model_provider?: string;
  model_id?: string;
  model_variant?: string;
  mode: string;
  source: string;
  status: string;
  cost_total: number;
  tokens_input: number;
  tokens_output: number;
  tokens_reasoning: number;
  tokens_cache: number;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: string;
  content?: string;
  created_at: string;
  metadata_json?: string;
}

export interface MessagePart {
  id: string;
  message_id: string;
  type: string;
  content?: string;
  metadata_json?: string;
  created_at: string;
}

export interface Approval {
  id: string;
  session_id: string;
  message_id?: string;
  category: string;
  action: string;
  target?: string;
  reason?: string;
  risk_level: string;
  status: string;
  response?: string;
  created_at: string;
  responded_at?: string;
}

export interface Checkpoint {
  id: string;
  session_id: string;
  name?: string;
  description?: string;
  files_json: string;
  diff?: string;
  created_at: string;
}

export interface Budget {
  id: string;
  scope: string;
  scope_id?: string;
  daily_limit?: number;
  session_limit?: number;
  warning_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface UsageDaily {
  id: string;
  date: string;
  project_id?: string;
  provider?: string;
  model?: string;
  sessions_count: number;
  messages_count: number;
  tokens_input: number;
  tokens_output: number;
  cost: number;
}

// ─── Database Adapter ──────────────────────────────────

type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
};

type SqliteStatement = {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): unknown | undefined;
  all(...params: unknown[]): unknown[];
};

/**
 * Database adapter for Aura CLI.
 * Tries to use better-sqlite3 directly; falls back to agent sidecar HTTP API.
 */
export class Database {
  private db: SqliteDb | null = null;
  private useAgentFallback = false;

  constructor() {}

  async init(): Promise<void> {
    const dbPath = getDbPath();

    // Try direct SQLite access
    try {
      // @ts-expect-error - better-sqlite3 is optional, loaded dynamically
      const mod = await import("better-sqlite3").catch(() => null) as any;
      if (mod) {
        const Database = mod.default ?? mod;
        this.db = new Database(dbPath) as unknown as SqliteDb;
        this.db.exec("PRAGMA foreign_keys = ON");
        this.ensureTables();
        log.debug("Database: using direct SQLite access");
        return;
      }
    } catch {
      // better-sqlite3 not available
    }

    // Fallback: use agent sidecar
    this.useAgentFallback = true;
    log.debug("Database: using agent sidecar fallback");
  }

  private ensureTables(): void {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folder_path TEXT UNIQUE NOT NULL,
        instructions TEXT,
        permission_mode TEXT DEFAULT 'ask',
        git_remote TEXT,
        git_branch TEXT,
        commands_json TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_opened_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        parent_id TEXT REFERENCES sessions(id),
        title TEXT,
        directory TEXT NOT NULL,
        agent TEXT DEFAULT 'build',
        model_provider TEXT,
        model_id TEXT,
        model_variant TEXT,
        mode TEXT DEFAULT 'build',
        source TEXT DEFAULT 'cli',
        status TEXT DEFAULT 'active',
        cost_total REAL DEFAULT 0,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        tokens_reasoning INTEGER DEFAULT 0,
        tokens_cache INTEGER DEFAULT 0,
        metadata_json TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        archived_at TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        role TEXT NOT NULL,
        content TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        metadata_json TEXT
      );

      CREATE TABLE IF NOT EXISTS message_parts (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id),
        type TEXT NOT NULL,
        content TEXT,
        metadata_json TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        message_id TEXT REFERENCES messages(id),
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        reason TEXT,
        risk_level TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        response TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        responded_at TEXT
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        name TEXT,
        description TEXT,
        files_json TEXT NOT NULL,
        diff TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        scope_id TEXT,
        daily_limit REAL,
        session_limit REAL,
        warning_threshold REAL DEFAULT 0.8,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usage_daily (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        project_id TEXT,
        provider TEXT,
        model TEXT,
        sessions_count INTEGER DEFAULT 0,
        messages_count INTEGER DEFAULT 0,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        UNIQUE(date, project_id, provider, model)
      );

      CREATE TABLE IF NOT EXISTS custom_commands (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        command TEXT NOT NULL,
        description TEXT,
        risk_level TEXT DEFAULT 'low',
        requires_approval INTEGER DEFAULT 0,
        project_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS themes (
        name TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        type TEXT NOT NULL,
        colors_json TEXT NOT NULL,
        is_custom INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  // ─── Project operations ────────────────────────────

  async getOrCreateProject(folderPath: string, name?: string): Promise<Project> {
    if (this.db) {
      const existing = this.db.prepare("SELECT * FROM projects WHERE folder_path = ?").get(folderPath) as Project | undefined;
      if (existing) {
        this.db.prepare("UPDATE projects SET last_opened_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(existing.id);
        return existing;
      }
      const id = crypto.randomUUID();
      const projectName = name ?? folderPath.split(/[\\/]/).pop() ?? "untitled";
      const now = new Date().toISOString();
      this.db.prepare(
        "INSERT INTO projects (id, name, folder_path, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, projectName, folderPath, now, now, now);
      return this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project;
    }
    throw new Error("Database not initialized");
  }

  async listProjects(): Promise<Project[]> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM projects ORDER BY last_opened_at DESC").all() as Project[];
    }
    throw new Error("Database not initialized");
  }

  async getProject(id: string): Promise<Project | undefined> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
    }
    throw new Error("Database not initialized");
  }

  // ─── Session operations ────────────────────────────

  async createSession(projectId: string, directory: string, opts: Partial<Session> = {}): Promise<Session> {
    if (this.db) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO sessions (id, project_id, title, directory, agent, model_provider, model_id, mode, source, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        projectId,
        opts.title ?? null,
        directory,
        opts.agent ?? "build",
        opts.model_provider ?? null,
        opts.model_id ?? null,
        opts.mode ?? "build",
        opts.source ?? "cli",
        opts.status ?? "active",
        now,
        now,
      );
      return this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Session;
    }
    throw new Error("Database not initialized");
  }

  async listSessions(projectId?: string, limit = 50): Promise<Session[]> {
    if (this.db) {
      if (projectId) {
        return this.db.prepare("SELECT * FROM sessions WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?").all(projectId, limit) as Session[];
      }
      return this.db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?").all(limit) as Session[];
    }
    throw new Error("Database not initialized");
  }

  async getSession(id: string): Promise<Session | undefined> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Session | undefined;
    }
    throw new Error("Database not initialized");
  }

  async updateSession(id: string, patch: Partial<Session>): Promise<void> {
    if (this.db) {
      const fields: string[] = [];
      const values: unknown[] = [];
      for (const [key, value] of Object.entries(patch)) {
        if (key === "id") continue;
        fields.push(`${key} = ?`);
        values.push(value);
      }
      fields.push("updated_at = datetime('now')");
      values.push(id);
      this.db.prepare(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
  }

  async getLastSession(projectId: string): Promise<Session | undefined> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM sessions WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1").get(projectId) as Session | undefined;
    }
    throw new Error("Database not initialized");
  }

  // ─── Message operations ────────────────────────────

  async createMessage(sessionId: string, role: string, content?: string): Promise<Message> {
    if (this.db) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      this.db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(id, sessionId, role, content ?? null, now);
      this.db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);
      return this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as Message;
    }
    throw new Error("Database not initialized");
  }

  async listMessages(sessionId: string, limit = 100): Promise<Message[]> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?").all(sessionId, limit) as Message[];
    }
    throw new Error("Database not initialized");
  }

  async createMessagePart(messageId: string, type: string, content?: string, metadata?: unknown): Promise<MessagePart> {
    if (this.db) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      this.db.prepare("INSERT INTO message_parts (id, message_id, type, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, messageId, type, content ?? null, metadata ? JSON.stringify(metadata) : null, now);
      return { id, message_id: messageId, type, content, created_at: now };
    }
    throw new Error("Database not initialized");
  }

  // ─── Approval operations ──────────────────────────

  async createApproval(sessionId: string, category: string, action: string, target?: string, reason?: string, riskLevel = "medium"): Promise<Approval> {
    if (this.db) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      this.db.prepare("INSERT INTO approvals (id, session_id, category, action, target, reason, risk_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, sessionId, category, action, target ?? null, reason ?? null, riskLevel, now);
      return this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as Approval;
    }
    throw new Error("Database not initialized");
  }

  async respondToApproval(id: string, approved: boolean, response?: string): Promise<void> {
    if (this.db) {
      const now = new Date().toISOString();
      this.db.prepare("UPDATE approvals SET status = ?, response = ?, responded_at = ? WHERE id = ?").run(approved ? "approved" : "rejected", response ?? null, now, id);
    }
  }

  // ─── Checkpoint operations ────────────────────────

  async createCheckpoint(sessionId: string, files: { path: string; before_hash: string; after_hash: string }[], name?: string, diff?: string): Promise<Checkpoint> {
    if (this.db) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      this.db.prepare("INSERT INTO checkpoints (id, session_id, name, files_json, diff, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, sessionId, name ?? null, JSON.stringify(files), diff ?? null, now);
      return this.db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(id) as Checkpoint;
    }
    throw new Error("Database not initialized");
  }

  async listCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC").all(sessionId) as Checkpoint[];
    }
    throw new Error("Database not initialized");
  }

  // ─── Budget operations ────────────────────────────

  async setBudget(scope: string, scopeId: string | undefined, dailyLimit?: number, sessionLimit?: number): Promise<Budget> {
    if (this.db) {
      const existing = this.db.prepare("SELECT * FROM budgets WHERE scope = ? AND (scope_id = ? OR (scope_id IS NULL AND ? IS NULL))").get(scope, scopeId ?? null, scopeId ?? null) as Budget | undefined;
      const now = new Date().toISOString();
      if (existing) {
        this.db.prepare("UPDATE budgets SET daily_limit = ?, session_limit = ?, updated_at = ? WHERE id = ?").run(dailyLimit ?? null, sessionLimit ?? null, now, existing.id);
        return this.db.prepare("SELECT * FROM budgets WHERE id = ?").get(existing.id) as Budget;
      }
      const id = crypto.randomUUID();
      this.db.prepare("INSERT INTO budgets (id, scope, scope_id, daily_limit, session_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, scope, scopeId ?? null, dailyLimit ?? null, sessionLimit ?? null, now, now);
      return this.db.prepare("SELECT * FROM budgets WHERE id = ?").get(id) as Budget;
    }
    throw new Error("Database not initialized");
  }

  async getBudget(scope: string, scopeId?: string): Promise<Budget | undefined> {
    if (this.db) {
      return this.db.prepare("SELECT * FROM budgets WHERE scope = ? AND (scope_id = ? OR (scope_id IS NULL AND ? IS NULL))").get(scope, scopeId ?? null, scopeId ?? null) as Budget | undefined;
    }
    throw new Error("Database not initialized");
  }

  // ─── Usage operations ─────────────────────────────

  async recordUsage(projectId: string, provider: string, model: string, inputTokens: number, outputTokens: number, cost: number): Promise<void> {
    if (this.db) {
      const today = new Date().toISOString().split("T")[0];
      const id = crypto.randomUUID();
      try {
        this.db.prepare(`
          INSERT INTO usage_daily (id, date, project_id, provider, model, tokens_input, tokens_output, cost, messages_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(date, project_id, provider, model) DO UPDATE SET
            tokens_input = tokens_input + excluded.tokens_input,
            tokens_output = tokens_output + excluded.tokens_output,
            cost = cost + excluded.cost,
            messages_count = messages_count + 1
        `).run(id, today, projectId, provider, model, inputTokens, outputTokens, cost);
      } catch {
        // SQLite < 3.24 doesn't support ON CONFLICT
        const existing = this.db.prepare("SELECT * FROM usage_daily WHERE date = ? AND project_id = ? AND provider = ? AND model = ?").get(today, projectId, provider, model) as UsageDaily | undefined;
        if (existing) {
          this.db.prepare("UPDATE usage_daily SET tokens_input = tokens_input + ?, tokens_output = tokens_output + ?, cost = cost + ?, messages_count = messages_count + 1 WHERE id = ?").run(inputTokens, outputTokens, cost, existing.id);
        } else {
          this.db.prepare("INSERT INTO usage_daily (id, date, project_id, provider, model, tokens_input, tokens_output, cost, messages_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").run(id, today, projectId, provider, model, inputTokens, outputTokens, cost);
        }
      }
    }
  }

  async getDailyUsage(date?: string, projectId?: string): Promise<UsageDaily[]> {
    if (this.db) {
      const targetDate = date ?? new Date().toISOString().split("T")[0];
      if (projectId) {
        return this.db.prepare("SELECT * FROM usage_daily WHERE date = ? AND project_id = ?").all(targetDate, projectId) as UsageDaily[];
      }
      return this.db.prepare("SELECT * FROM usage_daily WHERE date = ?").all(targetDate) as UsageDaily[];
    }
    throw new Error("Database not initialized");
  }

  // ─── Lifecycle ─────────────────────────────────────

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

let _db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!_db) {
    _db = new Database();
    await _db.init();
  }
  return _db;
}
