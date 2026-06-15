import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import type {
  CallResult,
  HelperConfig,
  McpCallRequest,
  McpServerConfig,
  ProjectMcpSetting,
  ToolListing,
} from "./types.js";

interface McpConnection {
  config: McpServerConfig;
  client: Client;
  tools: ToolListing[];
}

let connections: McpConnection[] = [];
let projectSettings: ProjectMcpSetting[] = [];

function envToStrings(env: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

export async function reloadMcp(config: HelperConfig) {
  await disconnectAll();
  projectSettings = config.projectMcpSettings;
  for (const server of config.mcpServers) {
    if (!server.enabled) continue;
    try {
      await connectServer(server);
    } catch (e) {
      console.warn(`[mcp] failed to connect ${server.name}:`, e);
    }
  }
}

async function connectServer(server: McpServerConfig) {
  let transport;
  if (server.transport === "sse") {
    const sseOptions: any = {};
    if (server.headers) {
      sseOptions.requestInit = {
        headers: server.headers,
      };
    }
    transport = new SSEClientTransport(new URL(server.command), sseOptions);
  } else if (server.transport === "websocket" || server.transport === "ws") {
    transport = new WebSocketClientTransport(new URL(server.command));
  } else {
    const baseEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v === "string") baseEnv[k] = v;
    }
    transport = new StdioClientTransport({
      command: server.command,
      args: server.args,
      env: { ...baseEnv, ...envToStrings(server.env as Record<string, unknown>) },
    });
  }

  const client = new Client({ name: "aura-plugins-helper", version: "0.6.0" });
  await client.connect(transport);
  const listed = await client.listTools();
  const tools: ToolListing[] = (listed.tools ?? []).map((t) => ({
    source: "mcp" as const,
    serverId: server.id,
    serverName: server.name,
    toolId: t.name,
    name: t.name,
    description: t.description ?? "",
  }));
  connections.push({ config: server, client, tools });
}

async function disconnectAll() {
  for (const c of connections) {
    try {
      await c.client.close();
    } catch {
      /* ignore */
    }
  }
  connections = [];
}

export function mcpServerCount(): number {
  return connections.length;
}

export function mcpConnectedCount(): number {
  return connections.length;
}

export function isMcpEnabledForProject(projectId: string, serverId: string): boolean {
  const override = projectSettings.find(
    (s) => s.projectId === projectId && s.serverId === serverId,
  );
  if (override) return override.enabled;
  return true;
}

export function listMcpTools(projectId?: string): ToolListing[] {
  const out: ToolListing[] = [];
  for (const c of connections) {
    if (projectId && !isMcpEnabledForProject(projectId, c.config.id)) continue;
    out.push(...c.tools);
  }
  return out;
}

export async function callMcpTool(req: McpCallRequest): Promise<CallResult> {
  const start = Date.now();
  if (!isMcpEnabledForProject(req.projectId, req.serverId)) {
    return {
      ok: false,
      output: `MCP server disabled for this project: ${req.serverId}`,
      durationMs: Date.now() - start,
      source: `mcp:${req.serverId}`,
    };
  }
  const conn = connections.find((c) => c.config.id === req.serverId);
  if (!conn) {
    return {
      ok: false,
      output: `MCP server not connected: ${req.serverId}`,
      durationMs: Date.now() - start,
      source: `mcp:${req.serverId}`,
    };
  }
  try {
    const result = await conn.client.callTool({
      name: req.toolName,
      arguments: req.arguments ?? {},
    });
    const parts = (result.content as { type: string; text?: string }[]) ?? [];
    const text = parts
      .map((p) => (p.type === "text" ? p.text ?? "" : JSON.stringify(p)))
      .join("\n");
    return {
      ok: !result.isError,
      output: text || JSON.stringify(result),
      durationMs: Date.now() - start,
      source: `mcp:${req.serverId}:${req.toolName}`,
    };
  } catch (e) {
    return {
      ok: false,
      output: String(e),
      durationMs: Date.now() - start,
      source: `mcp:${req.serverId}:${req.toolName}`,
    };
  }
}

export async function shutdownMcp() {
  await disconnectAll();
}
