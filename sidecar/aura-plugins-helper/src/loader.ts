import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { manifestTools, readManifestFromDir } from "./manifest.js";
import type {
  CallResult,
  HelperConfig,
  InstalledPluginConfig,
  PluginCallRequest,
  PluginToolDef,
  ToolListing,
} from "./types.js";

type PluginHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

interface LoadedPlugin {
  config: InstalledPluginConfig;
  tools: PluginToolDef[];
  handlers: Record<string, PluginHandler>;
}

let loaded: LoadedPlugin[] = [];

export async function reloadPlugins(config: HelperConfig) {
  const next: LoadedPlugin[] = [];
  for (const p of config.plugins) {
    if (!p.enabled) continue;
    try {
      const manifest = p.manifest?.id ? p.manifest : readManifestFromDir(p.installPath);
      const tools = manifestTools(manifest);
      const handlers = await loadHandlers(p.installPath, manifest);
      next.push({
        config: { ...p, manifest },
        tools,
        handlers,
      });
    } catch (e) {
      console.warn(`[plugins] failed to load ${p.id}:`, e);
    }
  }
  loaded = next;
}

async function loadHandlers(
  installPath: string,
  manifest: { entrypoints?: { tools?: string }; tools?: PluginToolDef[] },
): Promise<Record<string, PluginHandler>> {
  const rel = manifest.entrypoints?.tools ?? "./tools/index.js";
  const abs = join(installPath, rel);
  if (!existsSync(abs)) {
    return buildFallbackHandlers(manifest.tools ?? []);
  }
  const mod = (await import(pathToFileURL(abs).href)) as {
    handlers?: Record<string, PluginHandler>;
    default?: { handlers?: Record<string, PluginHandler> };
  };
  return mod.handlers ?? mod.default?.handlers ?? buildFallbackHandlers(manifest.tools ?? []);
}

function buildFallbackHandlers(tools: PluginToolDef[]): Record<string, PluginHandler> {
  const h: Record<string, PluginHandler> = {};
  for (const t of tools) {
    h[t.id] = async (args) =>
      JSON.stringify({ tool: t.id, message: "Plugin handler not implemented", args }, null, 2);
  }
  return h;
}

export function listPluginTools(): ToolListing[] {
  const out: ToolListing[] = [];
  for (const p of loaded) {
    for (const t of p.tools) {
      out.push({
        source: "plugin",
        pluginId: p.config.id,
        toolId: t.id,
        name: t.name,
        description: t.description,
      });
    }
  }
  return out;
}

export function pluginCount(): number {
  return loaded.length;
}

export async function callPluginTool(req: PluginCallRequest): Promise<CallResult> {
  const start = Date.now();
  const plugin = loaded.find((p) => p.config.id === req.pluginId);
  if (!plugin) {
    return {
      ok: false,
      output: `Plugin not loaded: ${req.pluginId}`,
      durationMs: Date.now() - start,
      source: `plugin:${req.pluginId}`,
    };
  }
  const handler = plugin.handlers[req.toolId];
  if (!handler) {
    return {
      ok: false,
      output: `Unknown plugin tool: ${req.toolId}`,
      durationMs: Date.now() - start,
      source: `plugin:${req.pluginId}`,
    };
  }
  try {
    const result = await handler(req.arguments ?? {});
    const output =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return {
      ok: true,
      output,
      durationMs: Date.now() - start,
      source: `plugin:${req.pluginId}:${req.toolId}`,
    };
  } catch (e) {
    return {
      ok: false,
      output: String(e),
      durationMs: Date.now() - start,
      source: `plugin:${req.pluginId}:${req.toolId}`,
    };
  }
}
