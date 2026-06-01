import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";
import type {
  InstalledPlugin,
  MarketplaceEntry,
  McpServerRecord,
  PluginsHelperStatus,
} from "@aura-os/shared";

interface PluginsPageProps {
  projectId: string | null;
  status: PluginsHelperStatus | null;
  plugins: InstalledPlugin[];
  mcpServers: McpServerRecord[];
  marketplace: MarketplaceEntry[];
  loading?: boolean;
  error?: string | null;
  onStart: () => Promise<PluginsHelperStatus>;
  onStop: () => Promise<PluginsHelperStatus>;
  onInstallLocal: (path: string) => Promise<InstalledPlugin>;
  onUninstall: (pluginId: string) => Promise<void>;
  onSetPluginEnabled: (pluginId: string, enabled: boolean) => Promise<void>;
  onAddMcpServer: (name: string, command: string, args: string[]) => Promise<void>;
  onDeleteMcpServer: (serverId: string) => Promise<void>;
  onSetMcpEnabled: (serverId: string, enabled: boolean) => Promise<void>;
  onSyncMarketplace: () => Promise<MarketplaceEntry[]>;
  t?: (key: string, params?: Record<string, string>) => string;
}

const PLUGIN_COLORS = ["#5a8a52", "#3a6fc4", "#4b5bb0", "#645d8e", "#a44f2c", "#3a352c"];

function pluginColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * 17) % PLUGIN_COLORS.length;
  return PLUGIN_COLORS[hash] ?? PLUGIN_COLORS[0];
}

function pluginInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PluginsPage({
  status,
  plugins,
  mcpServers,
  marketplace,
  loading,
  error,
  onStart,
  onStop,
  onInstallLocal,
  onUninstall,
  onSetPluginEnabled,
  onAddMcpServer,
  onDeleteMcpServer,
  onSetMcpEnabled,
  onSyncMarketplace,
  t = (k) => k,
}: PluginsPageProps) {
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpCommand, setMcpCommand] = useState("npx");
  const [mcpArgs, setMcpArgs] = useState("-y @modelcontextprotocol/server-filesystem .");
  const [message, setMessage] = useState<string | null>(null);

  const activePlugins = plugins.filter((p) => p.enabled).length;
  const runningMcp = mcpServers.filter((s) => s.enabled).length;

  const pickAndInstall = async () => {
    try {
      const folder = await invoke<string | null>("pick_folder");
      if (!folder) return;
      const p = await onInstallLocal(folder);
      setMessage(`${t("plugins.installed")}: ${p.name} v${p.version}`);
    } catch (e) {
      setMessage(String(e));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("nav.plugins")}</h1>
            <p>{t("plugins.subtitle")}</p>
          </div>
          <div className="ph-actions">
            <button type="button" className="btn secondary sm" disabled={loading} onClick={() => void pickAndInstall()}>
              <Icon name="plus" size={14} />
              {t("plugins.addPlugin")}
            </button>
          </div>
        </div>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {(message || error) && (
            <div className={`banner${error ? " err" : ""}`}>{error ?? message}</div>
          )}

          {status && !status.running && (
            <div className="section">
              <div className="panel">
                <div className="panel-row">
                  <div className="prov-logo" style={{ background: "var(--accent)" }}>
                    <Icon name="puzzle" size={17} />
                  </div>
                  <div className="prov-meta">
                    <div className="prov-name">{t("plugins.helper")}</div>
                    <div className="prov-sub">{status.remediation ?? t("plugins.helperOffline")}</div>
                  </div>
                  <button type="button" className="btn primary sm" disabled={loading} onClick={() => void onStart()}>
                    {t("common.start")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="section">
            <div className="sec-head">
              <span className="sec-label">
                {t("plugins.installed")}
                <span className="count">
                  {activePlugins} {t("plugins.active")}
                </span>
              </span>
              <span className="muted" style={{ font: "var(--text-caption)" }}>
                {status?.running ? t("common.running") : t("common.offline")} · {status?.toolCount ?? 0}{" "}
                {t("plugins.tools")}
              </span>
            </div>
            <div className="panel">
              {plugins.length === 0 ? (
                <div className="empty" style={{ padding: 28 }}>
                  <div className="em-ic">
                    <Icon name="puzzle" size={26} />
                  </div>
                  <p>{t("plugins.empty")}</p>
                </div>
              ) : (
                plugins.map((p) => (
                  <div key={p.id} className="panel-row">
                    <div className="prov-logo" style={{ background: pluginColor(p.id), color: "#fff" }}>
                      {pluginInitials(p.name)}
                    </div>
                    <div className="prov-meta">
                      <div className="prov-name">
                        {p.name}
                        <span className="ver">v{p.version}</span>
                      </div>
                      <div className="prov-sub">
                        {p.description ?? p.id} · {p.toolCount} {t("plugins.tools")}
                      </div>
                      <div className="perm-chips">
                        <span className="perm-chip">{t("plugins.scopeLocal")}</span>
                        {!p.enabled && <span className="perm-chip warn">{t("common.stopped")}</span>}
                      </div>
                    </div>
                    <div className="mini-acts">
                      <button
                        type="button"
                        className="btn ghost icon sm"
                        title={t("plugins.uninstall")}
                        disabled={loading}
                        onClick={() => void onUninstall(p.id)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                      <div
                        className={`toggle${p.enabled ? " on" : ""}`}
                        onClick={() => void onSetPluginEnabled(p.id, !p.enabled)}
                        onKeyDown={(e) => e.key === "Enter" && void onSetPluginEnabled(p.id, !p.enabled)}
                        role="button"
                        tabIndex={0}
                        aria-label={p.enabled ? t("common.stop") : t("common.start")}
                      >
                        <i />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <div className="sec-head">
              <span className="sec-label">
                {t("plugins.mcpServers")}
                <span className="count">
                  {runningMcp} {t("plugins.running")}
                </span>
              </span>
              <button type="button" className="btn ghost sm" onClick={() => setShowMcpForm((s) => !s)}>
                <Icon name="plus" size={14} />
                {t("plugins.addServer")}
              </button>
            </div>
            {showMcpForm && (
              <div className="panel cloud-form" style={{ marginBottom: 12 }}>
                <div className="form-grid">
                  <label>
                    {t("plugins.serverName")}
                    <input value={mcpName} onChange={(e) => setMcpName(e.target.value)} placeholder="filesystem" />
                  </label>
                  <label>
                    {t("plugins.command")}
                    <input value={mcpCommand} onChange={(e) => setMcpCommand(e.target.value)} placeholder="npx" />
                  </label>
                </div>
                <label>
                  {t("plugins.args")}
                  <input
                    value={mcpArgs}
                    onChange={(e) => setMcpArgs(e.target.value)}
                    placeholder="-y @modelcontextprotocol/server-filesystem ."
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={loading || !mcpName.trim() || !mcpCommand.trim()}
                    onClick={() => {
                      const args = mcpArgs.trim() ? mcpArgs.trim().split(/\s+/) : [];
                      void onAddMcpServer(mcpName.trim(), mcpCommand.trim(), args).then(() => {
                        setMcpName("");
                        setShowMcpForm(false);
                        setMessage(`${t("plugins.added")}: ${mcpName}`);
                      });
                    }}
                  >
                    {t("plugins.addServer")}
                  </button>
                </div>
              </div>
            )}
            <div className="panel">
              {mcpServers.length === 0 ? (
                <div className="panel-row muted">{t("plugins.noMcp")}</div>
              ) : (
                mcpServers.map((s) => (
                  <div key={s.id} className="panel-row">
                    <div
                      className="prov-logo"
                      style={{
                        background: s.enabled ? "var(--agent)" : "var(--bg-3)",
                        color: s.enabled ? "#fff" : "var(--fg-3)",
                      }}
                    >
                      <Icon name="plug" size={17} />
                    </div>
                    <div className="prov-meta">
                      <div className="prov-name">
                        {s.name}
                        {s.enabled ? (
                          <span className="tag ok">{t("common.running")}</span>
                        ) : (
                          <span className="tag off">{t("common.stopped")}</span>
                        )}
                      </div>
                      <div className="prov-sub endpoint">
                        {s.command} {s.args.join(" ")}
                      </div>
                    </div>
                    <div className="mini-acts">
                      <button
                        type="button"
                        className="btn ghost icon sm"
                        title={t("plugins.remove")}
                        disabled={loading}
                        onClick={() => void onDeleteMcpServer(s.id)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                      <div
                        className={`toggle${s.enabled ? " on" : ""}`}
                        onClick={() => void onSetMcpEnabled(s.id, !s.enabled)}
                        onKeyDown={(e) => e.key === "Enter" && void onSetMcpEnabled(s.id, !s.enabled)}
                        role="button"
                        tabIndex={0}
                      >
                        <i />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {marketplace.length > 0 && (
            <div className="section">
              <div className="sec-head">
                <span className="sec-label">{t("plugins.marketplace")}</span>
                <button type="button" className="btn ghost sm" disabled={loading} onClick={() => void onSyncMarketplace()}>
                  {t("plugins.syncRegistry")}
                </button>
              </div>
              <div className="panel">
                {marketplace.map((e) => (
                  <div key={e.id} className="panel-row">
                    <div className="prov-meta">
                      <div className="prov-name">
                        {e.name} <span className="ver">v{e.version}</span>
                      </div>
                      <div className="prov-sub">{e.description ?? e.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status?.running && (
            <div className="section">
              <button type="button" className="btn sm" disabled={loading} onClick={() => void onStop()}>
                {t("plugins.stopHelper")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
