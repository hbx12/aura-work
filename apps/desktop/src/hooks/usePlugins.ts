import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  InstalledPlugin,
  MarketplaceEntry,
  McpServerRecord,
  PluginsHelperStatus,
} from "@aura-os/shared";
import { universalWorkspaceEntries } from "../marketplace/universalWorkspaceEntries";
import { mergeMarketplaceEntries } from "../marketplace/localizeMarketplace";

/** URL to the live marketplace registry on GitHub Pages. */
const REGISTRY_URL = "https://aura-work.shop/registry/marketplace.json";

export interface SkillInfo {
  pluginId: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
}

function withMarketplaceFallback(entries: MarketplaceEntry[] | null | undefined) {
  return mergeMarketplaceEntries(universalWorkspaceEntries, entries ?? []);
}

async function loadMarketplaceEntries() {
  try {
    return withMarketplaceFallback(await invoke<MarketplaceEntry[]>("list_marketplace_entries"));
  } catch (error) {
    console.warn("[marketplace] Could not load marketplace registry", error);
    return withMarketplaceFallback([]);
  }
}

export function usePlugins(projectId: string | null) {
  const [status, setStatus] = useState<PluginsHelperStatus | null>(null);
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerRecord[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceEntry[]>(universalWorkspaceEntries);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, p, m, mk, sk] = await Promise.all([
        invoke<PluginsHelperStatus>("get_plugins_status"),
        invoke<InstalledPlugin[]>("list_installed_plugins"),
        invoke<McpServerRecord[]>("list_mcp_servers"),
        loadMarketplaceEntries(),
        invoke<SkillInfo[]>("list_local_skills"),
      ]);
      setStatus(s);
      setPlugins(p);
      setMcpServers(m);
      setMarketplace(mk);
      setSkills(sk);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<PluginsHelperStatus>("start_plugins");
      setStatus(s);
      await invoke("reload_plugins_helper");
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<PluginsHelperStatus>("stop_plugins");
      setStatus(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const installLocal = useCallback(
    async (sourcePath: string) => {
      setLoading(true);
      try {
        const p = await invoke<InstalledPlugin>("install_local_plugin", {
          input: { sourcePath },
        });
        await refresh();
        return p;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const uninstall = useCallback(
    async (pluginId: string) => {
      setLoading(true);
      try {
        await invoke("uninstall_plugin", { pluginId });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const setPluginEnabled = useCallback(
    async (pluginId: string, enabled: boolean) => {
      setLoading(true);
      try {
        await invoke("set_plugin_enabled", { pluginId, enabled });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const addMcpServer = useCallback(
    async (name: string, command: string, transport: string, args: string[]) => {
      setLoading(true);
      try {
        await invoke("add_mcp_server", { input: { name, command, transport, args } });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const deleteMcpServer = useCallback(
    async (serverId: string) => {
      setLoading(true);
      try {
        await invoke("delete_mcp_server", { serverId });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const setMcpEnabled = useCallback(
    async (serverId: string, enabled: boolean) => {
      setLoading(true);
      try {
        await invoke("set_mcp_server_enabled", { serverId, enabled });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const setProjectMcpEnabled = useCallback(
    async (serverId: string, enabled: boolean) => {
      if (!projectId) return;
      setLoading(true);
      try {
        await invoke("set_project_mcp_enabled", {
          input: { projectId, serverId, enabled },
        });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh],
  );

  const syncMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const entries = withMarketplaceFallback(await invoke<MarketplaceEntry[]>("sync_marketplace", {
        registryUrl: REGISTRY_URL,
      }));
      setMarketplace(entries);
      return entries;
    } catch (error) {
      console.warn("[marketplace] Sync failed", error);
      const entries = withMarketplaceFallback([]);
      setMarketplace(entries);
      return entries;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Sync from remote on mount, then every 5 minutes
    void syncMarketplace();
    const localId = window.setInterval(() => void refresh(), 10000);
    const remoteId = window.setInterval(() => void syncMarketplace(), 300000);
    return () => {
      window.clearInterval(localId);
      window.clearInterval(remoteId);
    };
  }, [refresh, syncMarketplace]);

  return {
    status,
    plugins,
    mcpServers,
    marketplace,
    skills,
    loading,
    error,
    refresh,
    start,
    stop,
    installLocal,
    uninstall,
    setPluginEnabled,
    addMcpServer,
    deleteMcpServer,
    setMcpEnabled,
    setProjectMcpEnabled,
    syncMarketplace,
  };
}
