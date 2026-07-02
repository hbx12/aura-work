import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { Icon, MarkdownText } from "@aura-os/ui";
import type {
  InstalledPlugin,
  MarketplaceEntry,
  McpServerRecord,
  PluginsHelperStatus,
} from "@aura-os/shared";
import MarketplaceGrid from "./marketplace/MarketplaceGrid";
import SkillCreator from "./SkillCreator";
import { ToolCreator } from "./ToolCreator";
import { VisualBuilder } from "./VisualBuilder";

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
  onAddMcpServer: (name: string, command: string, transport: string, args: string[]) => Promise<void>;
  onDeleteMcpServer: (serverId: string) => Promise<void>;
  onSetMcpEnabled: (serverId: string, enabled: boolean) => Promise<void>;
  onSyncMarketplace: () => Promise<MarketplaceEntry[]>;
  t?: (key: string, params?: Record<string, string>) => string;
  locale?: string;
  cloudSignedIn?: boolean;
  onGoToCloudLogin?: () => void;
}

const PLUGIN_COLORS = ["#5a8a52", "#3a6fc4", "#4b5bb0", "#645d8e", "#a44f2c", "#3a352c"];

const MCP_PRESETS_EN = [
  {
    name: "Custom (Manual)",
    transport: "stdio",
    command: "",
    args: "",
    envHelp: "Enter command and arguments manually.",
  },
  {
    name: "Filesystem (Access local files)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem /path/to/folder",
    envHelp: "Note: Replace /path/to/folder with your desired local folder path.",
  },
  {
    name: "GitHub (Manage repos and issues)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-github",
    envHelp: "Note: Requires environment variable: GITHUB_PERSONAL_ACCESS_TOKEN=your_token",
  },
  {
    name: "Postgres Database (Query relational databases)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-postgres postgres://localhost/db",
    envHelp: "Note: Replace connection string with your Postgres URL.",
  },
  {
    name: "SQLite Database (Query SQLite files)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-sqlite /path/to/db.sqlite",
    envHelp: "Note: Replace /path/to/db.sqlite with your SQLite file path.",
  },
  {
    name: "Web Browser (Scrape web pages with Puppeteer)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-puppeteer",
    envHelp: "Runs a headless browser to extract text from web pages.",
  },
  {
    name: "Claude Desktop Integration (SSE)",
    transport: "sse",
    command: "http://localhost:8765/sse",
    args: "",
    envHelp: "Connects to Claude Desktop App via SSE. Make sure your Claude Desktop SSE server is running.",
  },
];

const MCP_PRESETS_AR = [
  {
    name: "مخصص (يدوي)",
    transport: "stdio",
    command: "",
    args: "",
    envHelp: "أدخل الأمر والوسيطات يدوياً.",
  },
  {
    name: "الملفات المحلية (الوصول للمجلدات)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem /path/to/folder",
    envHelp: "ملاحظة: استبدل /path/to/folder بمسار المجلد المحلي على جهازك.",
  },
  {
    name: "مستودعات GitHub (إدارة المشاكل والأكواد)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-github",
    envHelp: "ملاحظة: يتطلب متغير البيئة: GITHUB_PERSONAL_ACCESS_TOKEN=your_token",
  },
  {
    name: "قاعدة بيانات Postgres (الاستعلام من قاعدة البيانات)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-postgres postgres://localhost/db",
    envHelp: "ملاحظة: استبدل الرابط بعنوان اتصال قاعدة البيانات الخاص بك.",
  },
  {
    name: "قاعدة بيانات SQLite (الاستعلام من ملفات SQLite)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-sqlite /path/to/db.sqlite",
    envHelp: "ملاحظة: استبدل المسار بمسار ملف SQLite على جهازك.",
  },
  {
    name: "متصفح الويب (قراءة الصفحات باستخدام Puppeteer)",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-puppeteer",
    envHelp: "يشغل متصفحاً خفياً لاستخراج النصوص والمحتويات من الويب.",
  },
  {
    name: "تكامل Claude Desktop (عبر SSE)",
    transport: "sse",
    command: "http://localhost:8765/sse",
    args: "",
    envHelp: "يتصل بتطبيق كلود عبر SSE. تأكد من تشغيل خادم كلود SSE على جهازك.",
  },
];

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
  projectId,
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
  locale,
  cloudSignedIn,
  onGoToCloudLogin,
}: PluginsPageProps) {
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpTransport, setMcpTransport] = useState("stdio");
  const [mcpCommand, setMcpCommand] = useState("npx");
  const [mcpArgs, setMcpArgs] = useState("-y @modelcontextprotocol/server-filesystem .");
  const [message, setMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"marketplace" | "plugins" | "skills" | "custom-tools" | "visual-builder">("marketplace");
  const [skills, setSkills] = useState<any[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [skillPrompt, setSkillPrompt] = useState("");
  const [skillMessage, setSkillMessage] = useState<string | null>(null);
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [editingSkill, setEditingSkill] = useState<any | null>(null);

  const [customTools, setCustomTools] = useState<any[]>([]);
  const [loadingCustomTools, setLoadingCustomTools] = useState(false);
  const [showToolForm, setShowToolForm] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);
  const [toolMessage, setToolMessage] = useState<string | null>(null);

  const refreshCustomTools = () => {
    setLoadingCustomTools(true);
    invoke("list_custom_tools", { projectId })
      .then((res: any) => {
        setCustomTools(res || []);
      })
      .catch((err) => {
        console.error("Failed to load custom tools:", err);
      })
      .finally(() => {
        setLoadingCustomTools(false);
      });
  };

  useEffect(() => {
    if (activeTab === "custom-tools") {
      refreshCustomTools();
    }
  }, [activeTab, projectId]);

  const [chatModels, setChatModels] = useState<any[]>([]);
  const [sandboxModel, setSandboxModel] = useState<string>("auto");
  const [sandboxInput, setSandboxInput] = useState<string>("");
  const [sandboxOutput, setSandboxOutput] = useState<string>("");
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);

  useEffect(() => {
    if (editingSkill) {
      void invoke<any[]>("list_chat_models").then((list) => {
        setChatModels(list);
        if (list.length > 0) {
          setSandboxModel(`${list[0].providerId}:${list[0].modelId}`);
        }
      }).catch(err => {
        console.error("Failed to load chat models:", err);
      });
    } else {
      setSandboxInput("");
      setSandboxOutput("");
    }
  }, [editingSkill]);

  const runSandboxTest = async () => {
    if (!sandboxInput.trim() || !editingSkill) return;
    setSandboxLoading(true);
    setSandboxOutput("");
    try {
      const sep = sandboxModel.indexOf(":");
      const preferredProvider = sep > 0 ? sandboxModel.slice(0, sep) : null;
      const preferredModel = sep > 0 ? sandboxModel.slice(sep + 1) : null;

      const result = await invoke<any>("run_chat", {
        input: {
          projectId: null,
          message: sandboxInput.trim(),
          taskType: "general",
          preferredProvider,
          preferredModel,
          messages: [
            { role: "system", content: skillPrompt },
            { role: "user", content: sandboxInput.trim() }
          ],
          fallbackApproved: false
        }
      });
      setSandboxOutput(result.text || (isAr ? "(لا توجد استجابة)" : "(No response content)"));
    } catch (err) {
      setSandboxOutput((isAr ? "خطأ: " : "Error: ") + String(err));
    } finally {
      setSandboxLoading(false);
    }
  };

  const exportSkill = async (s: any) => {
    try {
      const exportData = JSON.stringify({
        name: s.name,
        description: s.description || "",
        prompt: s.prompt
      }, null, 2);

      const filePath = await save({
        title: isAr ? "تصدير المهارة" : "Export Skill",
        defaultPath: `${s.name}.aura-skill`,
        filters: [
          {
            name: "Aura Skill",
            extensions: ["aura-skill"]
          }
        ]
      });

      if (filePath) {
        await invoke("save_text_file", { path: filePath, content: exportData });
        setSkillMessage(isAr ? `تم تصدير المهارة بنجاح إلى ${filePath}` : `Skill exported successfully to ${filePath}`);
      }
    } catch (err) {
      setSkillMessage(String(err));
    }
  };

  const importSkill = async () => {
    try {
      const selected = await open({
        title: isAr ? "استيراد مهارة" : "Import Skill",
        multiple: false,
        filters: [
          {
            name: "Aura Skill",
            extensions: ["aura-skill", "json"]
          }
        ]
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      const content = await invoke<string>("read_text_file", { path: filePath });
      const parsed = JSON.parse(content);
      if (!parsed.name || !parsed.prompt) {
        throw new Error(isAr ? "الملف غير صالح، يجب أن يحتوي على الاسم والتعليمات" : "Invalid file: name and prompt are required.");
      }
      await invoke("create_local_skill", {
        input: {
          name: parsed.name.trim(),
          description: (parsed.description || "").trim(),
          prompt: parsed.prompt.trim()
        }
      });
      setSkillMessage(isAr ? "تم استيراد المهارة بنجاح" : "Skill imported successfully");
      void refreshSkills();
    } catch (err) {
      setSkillMessage(isAr ? `فشل الاستيراد: ${String(err)}` : `Failed to import: ${String(err)}`);
    }
  };

  const refreshSkills = async () => {
    try {
      const list = await invoke<any[]>("list_local_skills");
      setSkills(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void refreshSkills();
  }, [plugins]);

  const activePlugins = plugins.filter((p) => p.enabled).length;
  const runningMcp = mcpServers.filter((s) => s.enabled).length;

  const isAr = locale?.startsWith("ar");
  const presetsList = isAr ? MCP_PRESETS_AR : MCP_PRESETS_EN;

  const hasRemoteMcp = mcpServers.some(
    (s) =>
      s.transport === "sse" ||
      s.transport === "websocket" ||
      s.command.startsWith("http") ||
      s.command.startsWith("ws"),
  );

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
            {hasRemoteMcp && !cloudSignedIn && (
              <div
                className="banner warning"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                  padding: "10px 16px",
                  borderRadius: "var(--r-sm, 6px)",
                  background: "var(--warning-dim, rgba(234, 179, 8, 0.12))",
                  border: "1px solid var(--warning, #eab308)",
                  color: "var(--warning, #eab308)",
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span>
                  {isAr
                    ? "تم تكوين خادم MCP بعيد. يرجى تسجيل الدخول إلى Aura Cloud لتفعيل المزامنة والوصول الكامل."
                    : "A remote MCP server is configured. Please sign in to Aura Cloud for full sync and access."}
                </span>
                <button
                  type="button"
                  className="btn primary sm"
                  style={{
                    background: "var(--warning, #eab308)",
                    color: "var(--bg-1, #131010)",
                    border: "none",
                    fontWeight: 600,
                  }}
                  onClick={onGoToCloudLogin}
                >
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </button>
              </div>
            )}
            <div className="seg" style={{ marginTop: 10 }}>
              <button
                type="button"
                className={activeTab === "marketplace" ? "active" : ""}
                onClick={() => setActiveTab("marketplace")}
              >
                {isAr ? "المتجر" : "Marketplace"}
              </button>
              <button
                type="button"
                className={activeTab === "plugins" ? "active" : ""}
                onClick={() => setActiveTab("plugins")}
              >
                {isAr ? "الإضافات و MCP" : "Plugins & MCP"}
              </button>
              <button
                type="button"
                className={activeTab === "skills" ? "active" : ""}
                onClick={() => setActiveTab("skills")}
              >
                {isAr ? "المهارات (Skills)" : "Skills"}
              </button>
              <button
                type="button"
                className={activeTab === "custom-tools" ? "active" : ""}
                onClick={() => setActiveTab("custom-tools")}
              >
                {isAr ? "الأدوات المخصصة" : "Custom Tools"}
              </button>
              <button
                type="button"
                className={activeTab === "visual-builder" ? "active" : ""}
                onClick={() => setActiveTab("visual-builder")}
              >
                {isAr ? "بناء" : "Build"}
              </button>
            </div>
          </div>
          <div className="ph-actions">
            {activeTab === "marketplace" ? (
              <button
                type="button"
                className="btn secondary sm"
                disabled={loading}
                onClick={async () => {
                  if (onSyncMarketplace) {
                    await onSyncMarketplace();
                  }
                }}
              >
                <Icon name="arrow-path" size={14} style={{ marginRight: isAr ? 0 : 4, marginLeft: isAr ? 4 : 0 }} />
                {isAr ? "مزامنة المتجر" : "Sync Marketplace"}
              </button>
            ) : activeTab === "plugins" ? (
              <button type="button" className="btn secondary sm" disabled={loading} onClick={() => void pickAndInstall()}>
                <Icon name="plus" size={14} />
                {t("plugins.addPlugin")}
              </button>
            ) : activeTab === "skills" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn secondary sm" disabled={loading} onClick={() => void importSkill()}>
                  <Icon name="plus" size={14} />
                  {isAr ? "استيراد مهارة" : "Import Skill"}
                </button>
                <button type="button" className="btn secondary sm" disabled={loading} onClick={() => setShowSkillForm((s) => !s)}>
                  <Icon name="plus" size={14} />
                  {isAr ? "إنشاء مهارة جديدة" : "Create New Skill"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn secondary sm"
                disabled={loading}
                onClick={() => {
                  setEditingTool(null);
                  setShowToolForm((t) => !t);
                }}
              >
                <Icon name="plus" size={14} />
                {isAr ? "إنشاء أداة مخصصة" : "Create Custom Tool"}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {activeTab === "marketplace" && (
            <MarketplaceGrid
              marketplace={marketplace}
              plugins={plugins}
              mcpServers={mcpServers}
              skills={skills}
              loading={loading}
              isAr={isAr}
              onRefresh={async () => {
                await refreshSkills();
                if (onSyncMarketplace) {
                  await onSyncMarketplace();
                }
              }}
            />
          )}

          {activeTab === "plugins" && (
            <>
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
                  <div className="panel cloud-form" style={{ marginBottom: 12, gap: 14 }}>
                    <div className="form-grid">
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span>{isAr ? "قوالب سريعة للأجهزة المساعدة" : "Server Template Preset"}</span>
                        <select
                          className="settings-select"
                          style={{ background: "var(--bg-1)", border: "1px solid var(--border-3)", padding: "8px 12px", borderRadius: "var(--r-sm)", color: "var(--fg-1)" }}
                          onChange={(e) => {
                            const val = e.target.value;
                            const preset = presetsList.find((p) => p.name === val);
                            if (preset && val !== presetsList[0].name) {
                              const englishPreset = (isAr ? MCP_PRESETS_EN[presetsList.indexOf(preset)] : preset);
                              setMcpName(englishPreset.name.split(" ")[0].toLowerCase());
                              setMcpCommand(preset.command);
                              setMcpArgs(preset.args);
                              setMcpTransport(preset.transport || "stdio");
                              setMessage(preset.envHelp);
                            }
                          }}
                        >
                          {presetsList.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span>{isAr ? "نوع الاتصال (Transport)" : "Transport Type"}</span>
                        <select
                          className="settings-select"
                          style={{ background: "var(--bg-1)", border: "1px solid var(--border-3)", padding: "8px 12px", borderRadius: "var(--r-sm)", color: "var(--fg-1)" }}
                          value={mcpTransport}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMcpTransport(val);
                            if (val === "sse") {
                              setMcpCommand("http://localhost:8765/sse");
                              setMcpArgs("");
                            } else if (val === "websocket") {
                              setMcpCommand("ws://localhost:8080");
                              setMcpArgs("");
                            } else {
                              setMcpCommand("npx");
                              setMcpArgs("-y @modelcontextprotocol/server-filesystem .");
                            }
                          }}
                        >
                          <option value="stdio">{isAr ? "سطر الأوامر (stdio)" : "Command Line (stdio)"}</option>
                          <option value="sse">{isAr ? "أحداث خادم SSE (sse)" : "Server-Sent Events (sse)"}</option>
                          <option value="websocket">{isAr ? "ويب سوكيت (websocket)" : "WebSockets (websocket)"}</option>
                        </select>
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        {t("plugins.serverName")}
                        <input value={mcpName} onChange={(e) => setMcpName(e.target.value)} placeholder="filesystem" />
                      </label>
                      <label>
                        {mcpTransport === "stdio" ? t("plugins.command") : (isAr ? "رابط الخدمة (URL)" : "Service URL")}
                        <input value={mcpCommand} onChange={(e) => setMcpCommand(e.target.value)} placeholder={mcpTransport === "stdio" ? "npx" : "http://localhost:8765/sse"} />
                      </label>
                    </div>
                    {mcpTransport === "stdio" && (
                      <label>
                        {t("plugins.args")}
                        <input
                          value={mcpArgs}
                          onChange={(e) => setMcpArgs(e.target.value)}
                          placeholder="-y @modelcontextprotocol/server-filesystem ."
                        />
                      </label>
                    )}
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn primary sm"
                        disabled={loading || !mcpName.trim() || !mcpCommand.trim()}
                        onClick={() => {
                          const args = mcpTransport === "stdio" && mcpArgs.trim() ? mcpArgs.trim().split(/\s+/) : [];
                          void onAddMcpServer(mcpName.trim(), mcpCommand.trim(), mcpTransport, args).then(() => {
                            setMcpName("");
                            setMcpTransport("stdio");
                            setMcpCommand("npx");
                            setMcpArgs("-y @modelcontextprotocol/server-filesystem .");
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
                            {s.id.startsWith("aura_config_") && (
                              <span className="tag" style={{ background: "var(--bg-3)", color: "var(--fg-2)" }}>
                                {isAr ? "ملف الإعدادات" : "config"}
                              </span>
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
                            title={s.id.startsWith("aura_config_") ? (isAr ? "هذا الخادم للقراءة فقط (معرف في ملف الإعدادات)" : "Read-only config-based server") : t("plugins.remove")}
                            disabled={loading || s.id.startsWith("aura_config_")}
                            onClick={() => void onDeleteMcpServer(s.id)}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                          <div
                            className={`toggle${s.enabled ? " on" : ""}`}
                            style={s.id.startsWith("aura_config_") ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                            onClick={() => {
                              if (s.id.startsWith("aura_config_")) return;
                              void onSetMcpEnabled(s.id, !s.enabled);
                            }}
                            onKeyDown={(e) => {
                              if (s.id.startsWith("aura_config_")) return;
                              if (e.key === "Enter") void onSetMcpEnabled(s.id, !s.enabled);
                            }}
                            role="button"
                            tabIndex={s.id.startsWith("aura_config_") ? -1 : 0}
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
            </>
          )}

          {activeTab === "skills" && (
            <>
              {(skillMessage || error) && (
                <div className={`banner${error ? " err" : ""}`}>{error ?? skillMessage}</div>
              )}

              {showSkillForm && (
                <SkillCreator
                  isAr={isAr}
                  onSuccess={(msg) => {
                    setSkillMessage(msg);
                    setShowSkillForm(false);
                    void refreshSkills();
                  }}
                  onCancel={() => setShowSkillForm(false)}
                />
              )}

              {editingSkill && (
                <div className="panel cloud-form" style={{ marginBottom: 12, gap: 14 }}>
                  <div className="form-grid">
                    <label>
                      {isAr ? "اسم المهارة" : "Skill Name"}
                      <input value={skillName} disabled={true} style={{ opacity: 0.6 }} />
                    </label>
                    <label>
                      {isAr ? "وصف المهارة" : "Description"}
                      <input value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} placeholder="A skill to design UIs" />
                    </label>
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span>{isAr ? "التعليمات والـ Prompt" : "Instructions & Prompt"}</span>
                    <textarea
                      value={skillPrompt}
                      onChange={(e) => setSkillPrompt(e.target.value)}
                      rows={5}
                      style={{ background: "var(--bg-1)", border: "1px solid var(--border-3)", padding: "9px 12px", borderRadius: "var(--r-sm)", color: "var(--fg-1)", font: "inherit", resize: "vertical" }}
                    />
                  </label>
                  <hr style={{ border: "none", borderTop: "1px solid var(--border-3)", margin: "16px 0" }} />
                  
                  {/* Skill Sandbox */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--fg-1)" }}>
                      {isAr ? "بيئة تجربة المهارة (Sandbox)" : "Skill Testing Sandbox"}
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span>{isAr ? "النموذج النشط للدردشة" : "Active Model"}</span>
                        <select
                          value={sandboxModel}
                          onChange={(e) => setSandboxModel(e.target.value)}
                          style={{
                            background: "var(--bg-1)",
                            border: "1px solid var(--border-3)",
                            padding: "8px 12px",
                            borderRadius: "var(--r-sm)",
                            color: "var(--fg-1)",
                            font: "inherit"
                          }}
                        >
                          {chatModels.map((m) => (
                            <option key={`${m.providerId}:${m.modelId}`} value={`${m.providerId}:${m.modelId}`}>
                              {m.label} ({m.providerId})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span>{isAr ? "استعلام التجربة / المدخلات" : "Test Query / Input"}</span>
                      <textarea
                        value={sandboxInput}
                        onChange={(e) => setSandboxInput(e.target.value)}
                        placeholder={isAr ? "اكتب هنا استعلام التجربة..." : "Enter test query..."}
                        rows={3}
                        style={{ background: "var(--bg-1)", border: "1px solid var(--border-3)", padding: "9px 12px", borderRadius: "var(--r-sm)", color: "var(--fg-1)", font: "inherit", resize: "vertical" }}
                      />
                    </label>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn primary sm"
                        disabled={sandboxLoading || !sandboxInput.trim()}
                        onClick={() => void runSandboxTest()}
                      >
                        {sandboxLoading ? (isAr ? "جاري التشغيل..." : "Running...") : (isAr ? "تشغيل الاختبار" : "Run Test")}
                      </button>
                      {sandboxOutput && (
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => setSandboxOutput("")}
                        >
                          {isAr ? "مسح المخرجات" : "Clear Output"}
                        </button>
                      )}
                    </div>

                    {sandboxOutput && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span>{isAr ? "مخرجات استجابة التجربة" : "Sandbox Response Output"}</span>
                        <div
                          style={{
                            background: "var(--bg-inset)",
                            border: "1px solid var(--border-3)",
                            padding: "12px",
                            borderRadius: "var(--r-sm)",
                            color: "var(--fg-2)",
                            fontFamily: "var(--font-mono, monospace)",
                            whiteSpace: "pre-wrap",
                            maxHeight: "200px",
                            overflowY: "auto",
                            fontSize: "13px"
                          }}
                        >
                          {sandboxOutput}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={loading || !skillPrompt.trim()}
                      onClick={() => {
                        void invoke("save_local_skill", {
                          input: {
                            pluginId: editingSkill.pluginId,
                            name: editingSkill.name,
                            description: skillDesc.trim(),
                            prompt: skillPrompt.trim(),
                            path: editingSkill.path || null,
                          },
                        }).then(() => {
                          setEditingSkill(null);
                          setSkillName("");
                          setSkillDesc("");
                          setSkillPrompt("");
                          setSkillMessage(isAr ? "تم تحديث وحفظ المهارة بنجاح" : "Skill updated and saved successfully");
                          void refreshSkills();
                        }).catch((err) => {
                          setSkillMessage(String(err));
                        });
                      }}
                    >
                      {isAr ? "تحديث المهارة" : "Update Skill"}
                    </button>
                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => {
                        setEditingSkill(null);
                        setSkillName("");
                        setSkillDesc("");
                        setSkillPrompt("");
                      }}
                    >
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}

              <div className="panel">
                {skills.length === 0 ? (
                  <div className="empty" style={{ padding: 28 }}>
                    <div className="em-ic">
                      <Icon name="puzzle" size={26} />
                    </div>
                    <p>{isAr ? "لا يوجد مهارات مضافة حالياً. أنشئ مهارة جديدة للبدء." : "No skills installed. Create a new skill to get started."}</p>
                  </div>
                ) : (
                  skills.map((s) => {
                    const skillKey = `${s.pluginId}-${s.name}`;
                    const isExpanded = !!expandedSkills[skillKey];
                    const toggleExpand = () => {
                      setExpandedSkills(prev => ({ ...prev, [skillKey]: !prev[skillKey] }));
                    };
                    return (
                      <div key={skillKey} className="panel-row" style={{ alignItems: "flex-start" }}>
                        <div className="prov-logo" style={{ background: "var(--accent)", marginTop: 4 }}>
                          <Icon name="puzzle" size={17} />
                        </div>
                        <div className="prov-meta" style={{ flex: 1 }}>
                          <div className="prov-name">
                            {s.name}
                            {s.pluginId === "config_skill" && (
                              <span className="tag" style={{ background: "var(--bg-3)", color: "var(--fg-2)", marginLeft: 6 }}>
                                {isAr ? "ملف الإعدادات" : "config"}
                              </span>
                            )}
                          </div>
                          <div className="prov-sub">
                            {s.description || s.pluginId}
                          </div>
                          <div className="perm-chips" style={{ marginTop: 6 }}>
                            <div
                              className="perm-chip skill-md-preview"
                              style={{
                                display: "block",
                                background: "var(--bg-3)",
                                padding: "8px 10px",
                                borderRadius: "var(--r-xs, 4px)",
                                color: "var(--fg-2)",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <MarkdownText text={isExpanded ? s.prompt : (s.prompt.length > 220 ? s.prompt.slice(0, 220) + "..." : s.prompt)} />
                            </div>
                          </div>
                        </div>
                        <div className="mini-acts" style={{ marginTop: 4 }}>
                          {s.prompt.length > 120 && (
                            <button
                              type="button"
                              className="btn ghost icon sm"
                              title={isExpanded ? (isAr ? "تصغير" : "Collapse") : (isAr ? "توسيع" : "Expand")}
                              onClick={toggleExpand}
                            >
                              <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn ghost icon sm"
                            title={isAr ? "تعديل المهارة" : "Edit Skill"}
                            disabled={loading}
                            onClick={() => {
                              setEditingSkill(s);
                              setSkillName(s.name);
                              setSkillDesc(s.description || "");
                              setSkillPrompt(s.prompt);
                              setShowSkillForm(false);
                            }}
                          >
                            <Icon name="file-code" size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn ghost icon sm"
                            title={isAr ? "تصدير المهارة" : "Export Skill"}
                            disabled={loading}
                            onClick={() => void exportSkill(s)}
                          >
                            <Icon name="download" size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn ghost icon sm"
                            title={s.pluginId === "config_skill" ? (isAr ? "المهارات من ملف الإعدادات لا يمكن حذفها مباشرة" : "Config-based skills cannot be deleted directly") : (isAr ? "حذف" : "Delete")}
                            disabled={loading || s.pluginId === "config_skill"}
                            onClick={() => {
                              void onUninstall(s.pluginId).then(() => {
                                setSkillMessage(isAr ? "تم حذف المهارة بنجاح" : "Skill deleted successfully");
                                void refreshSkills();
                              });
                            }}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === "custom-tools" && (
            <>
              {toolMessage && (
                <div className="banner">{toolMessage}</div>
              )}

              {(showToolForm || editingTool) && (
                <ToolCreator
                  isAr={isAr}
                  projectId={projectId}
                  editingTool={editingTool}
                  onSuccess={(msg) => {
                    setToolMessage(msg);
                    setShowToolForm(false);
                    setEditingTool(null);
                    refreshCustomTools();
                  }}
                  onCancel={() => {
                    setShowToolForm(false);
                    setEditingTool(null);
                  }}
                />
              )}

              <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--fg-2)" }}>
                  {isAr ? "الأدوات المخصصة النشطة" : "Active Custom Tools"}
                </span>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={loadingCustomTools}
                  onClick={refreshCustomTools}
                >
                  <Icon name="rotate-cw" size={14} style={{ marginRight: 6 }} />
                  {isAr ? "تحديث" : "Refresh"}
                </button>
              </div>

              <div className="panel">
                {loadingCustomTools ? (
                  <div className="empty" style={{ padding: 28 }}>
                    <div className="em-ic">
                      <Icon name="loader" size={26} style={{ animation: "spin 1s linear infinite" }} />
                    </div>
                    <p>{isAr ? "جاري تحميل الأدوات المخصصة..." : "Loading custom tools..."}</p>
                  </div>
                ) : customTools.length === 0 ? (
                  <div className="empty" style={{ padding: 28 }}>
                    <div className="em-ic">
                      <Icon name="braces" size={26} />
                    </div>
                    <p>{isAr ? "لم يتم العثور على أدوات مخصصة." : "No custom tools found."}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 6 }}>
                      {isAr
                        ? "أضف ملفات TypeScript/JavaScript في المجلد المحلي .aura/tools/ أو العالمي ~/.config/aura/tools/ للبدء."
                        : "Add TypeScript/JavaScript files under .aura/tools/ or ~/.config/aura/tools/ to get started."}
                    </p>
                  </div>
                ) : (
                  customTools.map((tool) => (
                    <div key={tool.name} className="panel-row" style={{ alignItems: "flex-start", gap: 14 }}>
                      <div className="prov-logo" style={{ background: tool.error ? "rgba(239, 68, 68, 0.15)" : "var(--accent)", color: tool.error ? "var(--danger)" : "inherit", marginTop: 4 }}>
                        <Icon name={tool.error ? "alert-triangle" : "braces"} size={17} />
                      </div>
                      <div className="prov-meta" style={{ flex: 1 }}>
                        <div className="prov-name" style={{ fontWeight: 600, color: tool.error ? "var(--danger)" : "var(--fg-1)", display: "flex", alignItems: "center", gap: 8 }}>
                          {tool.name}
                          {tool.error && (
                            <span className="tag" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1px 6px", borderRadius: 4, fontSize: "10px" }}>
                              {isAr ? "فشل التحميل" : "Failed to load"}
                            </span>
                          )}
                        </div>
                        <div className="prov-sub" style={{ fontSize: "13px", color: "var(--fg-2)", marginTop: 2 }}>
                          {tool.description || (isAr ? "(بلا وصف)" : "(No description provided)")}
                        </div>
                        
                        {tool.error && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, color: "var(--danger)" }}>
                            <div style={{ fontWeight: 600, fontSize: "11px", display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase" }}>
                              <Icon name="alert-triangle" size={12} />
                              {isAr ? "خطأ في التحميل/الترجمة:" : "Compilation / Load Error:"}
                            </div>
                            <div style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", whiteSpace: "pre-wrap", marginTop: 4, opacity: 0.9 }}>
                              {tool.error}
                            </div>
                          </div>
                        )}

                        {!tool.error && Object.keys(tool.args || {}).length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                              {isAr ? "الوسائط المتوقعة (Parameters):" : "Arguments / Parameters:"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                              {Object.entries(tool.args).map(([argName, argVal]: [string, any]) => (
                                <div key={argName} style={{ display: "flex", gap: 8, fontSize: "12px" }}>
                                  <code style={{ background: "var(--bg-3)", padding: "1px 6px", borderRadius: 4, color: "var(--accent)" }}>
                                    {argName}
                                  </code>
                                  <span style={{ color: "var(--fg-3)" }}>
                                    {argVal.description || (isAr ? "بلا وصف" : "No description")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 10, fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="folder" size={11} />
                          <span>{tool.filePath}</span>
                        </div>
                      </div>
                      <div className="mini-acts" style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn ghost icon sm"
                          title={isAr ? "تعديل الأداة" : "Edit Tool"}
                          onClick={() => {
                            setEditingTool(tool);
                            setShowToolForm(false);
                          }}
                        >
                          <Icon name="file-code" size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost icon sm"
                          title={isAr ? "حذف الأداة" : "Delete Tool"}
                          onClick={() => {
                            if (window.confirm(isAr ? `هل أنت متأكد من حذف الأداة المخصصة ${tool.name}؟` : `Are you sure you want to delete custom tool ${tool.name}?`)) {
                              invoke("delete_custom_tool", { filePath: tool.filePath })
                                .then(() => {
                                  setToolMessage(isAr ? "تم حذف الأداة بنجاح" : "Tool deleted successfully");
                                  refreshCustomTools();
                                })
                                .catch((err) => {
                                  setToolMessage(String(err));
                                });
                            }
                          }}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "visual-builder" && (
            <VisualBuilder
              isAr={isAr}
              projectId={projectId}
              onSuccess={(msg) => {
                setToolMessage(msg);
                refreshCustomTools();
              }}
              onCancel={() => {
                setActiveTab("custom-tools");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
