export type HelperState = "stopped" | "starting" | "running" | "unavailable";

export interface PluginToolDef {
  id: string;
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface PluginManifest {
  schemaVersion: string;
  id: string;
  name: string;
  version: string;
  publisher?: string;
  description?: string;
  homepage?: string;
  license?: string;
  entrypoints?: {
    tools?: string;
    mcpServer?: string;
    parsers?: string;
  };
  permissions?: Record<string, string[]>;
  tools?: PluginToolDef[];
  subagents?: unknown[];
  skills?: unknown[];
  integrity?: { sha256?: string };
}

export interface InstalledPluginConfig {
  id: string;
  installPath: string;
  enabled: boolean;
  manifest: PluginManifest;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: "stdio";
  command: string;
  args: string[];
  env: Record<string, unknown>;
  enabled: boolean;
}

export interface ProjectMcpSetting {
  projectId: string;
  serverId: string;
  enabled: boolean;
}

export interface HelperConfig {
  plugins: InstalledPluginConfig[];
  mcpServers: McpServerConfig[];
  projectMcpSettings: ProjectMcpSetting[];
}

export interface PluginCallRequest {
  projectId: string;
  pluginId: string;
  toolId: string;
  arguments?: Record<string, unknown>;
}

export interface McpCallRequest {
  projectId: string;
  serverId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface ToolListing {
  source: "plugin" | "mcp";
  pluginId?: string;
  serverId?: string;
  serverName?: string;
  toolId: string;
  name: string;
  description: string;
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  description?: string;
  homepage?: string;
  license?: string;
  repository?: string;
  tags?: string[];
}

export interface PluginsHelperStatus {
  state: HelperState;
  pluginCount: number;
  mcpServerCount: number;
  mcpConnectedCount: number;
  toolCount: number;
  startedAt?: string;
  lastError?: string;
  remediation?: string;
  running: boolean;
}

export interface CallResult {
  ok: boolean;
  output: string;
  durationMs: number;
  source: string;
}
