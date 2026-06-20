import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Composer,
  ContextPanel,
  Msg,
  StreamingMsg,
  ClarificationCard,
  NavRail,
  NAV_ITEMS,
  PlanBlock,
  Sidebar,
  Steps,
  Summary,
  TaskWelcome,
  Thinking,
  TitleBar,
  type AppView,
  type ThemeMode,
  type ThemePreference,
  type TaskItem,
} from "@aura-os/ui";
import { PROVIDER_META } from "@aura-os/shared";
import { NewProjectDialog } from "./components/NewProjectDialog";
import { ProviderKeyDialog } from "./components/ProviderKeyDialog";
import { ProvidersPageLive } from "./components/ProvidersPageLive";
import { SettingsPage } from "./components/SettingsPage";
import { FallbackApprovalDialog } from "./components/FallbackApprovalDialog";
import { PermissionApprovalDialog } from "./components/PermissionApprovalDialog";
import { FilesPage } from "./components/FilesPage";
import { GitPage } from "./components/GitPage";
import { TerminalPage } from "./components/TerminalPage";
import { AuditPageLive } from "./components/AuditPageLive";
import { useProjects } from "./hooks/useProjects";
import { formatCost, useAgent } from "./hooks/useAgent";
import { useProviders } from "./hooks/useProviders";
import { useTasks } from "./hooks/useTasks";
import { useFiles } from "./hooks/useFiles";
import { useGit } from "./hooks/useGit";
import { useAudit } from "./hooks/useAudit";
import { BrowserPage } from "./components/BrowserPage";
import { PluginsPage } from "./components/PluginsPage";
import { useVm } from "./hooks/useVm";
import { useBrowser } from "./hooks/useBrowser";
import { usePlugins } from "./hooks/usePlugins";
import { useCloud } from "./hooks/useCloud";
import { SchedulePageLive } from "./components/SchedulePageLive";
import { useScheduledTasks } from "./hooks/useScheduledTasks";
import { MemoryPage } from "./components/MemoryPage";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { TaskTimeline } from "./components/TaskTimeline";
import { ComputerUsePage } from "./components/ComputerUsePage";
import { useBridge } from "./hooks/useBridge";
import { useComputerUse } from "./hooks/useComputerUse";
import { useMemory } from "./hooks/useMemory";
import { useI18n, usePackaging, usePendingOpenTask } from "./hooks/useI18n";
import type { MessageCatalog } from "@aura-os/i18n";
import { useChatModels, parseModelSelection } from "./hooks/useChatModels";
import { PetWindowContent } from "./components/PetWindowContent";
import CanvasPanel from "./components/CanvasPanel";
import "@aura-os/ui/tokens.css";
import "@aura-os/ui/app.css";
import "./app-overrides.css";

const THEME_KEY = "aura-theme";
const THEME_MODES: ThemeMode[] = [
  "light",
  "dark",
  "amoled",
  "blue",
  "high-contrast",
  "cyberpunk",
  "forest",
  "pastel",
  "sunset",
  "sepia",
  "nord",
  "dracula",
  "matrix",
  "sakura",
  "sakura-dark",
  "coffee",
  "ocean",
  "luxury",
  "emerald-luxury",
  "rose-luxury",
  "velvet-luxury",
  "bronze-luxury",
  "platinum-luxury",
  "crimson-luxury",
  "sapphire-luxury",
  "amethyst-luxury",
  "amber-luxury",
  "obsidian-gold",
  "pearl-noir",
  "jade-silk",
  "arctic-glass",
  "royal-indigo",
  "copper-olive",
  "moonlit-rose",
  "carbon-teal"
];
const THEME_PREFERENCES: ThemePreference[] = ["system", ...THEME_MODES];

function isThemePreference(value: string | null): value is ThemePreference {
  return !!value && THEME_PREFERENCES.includes(value as ThemePreference);
}

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function mapTaskState(state: string): TaskItem["state"] {
  switch (state) {
    case "running":
      return "running";
    case "completed":
      return "done";
    case "waiting-for-approval":
      return "wait";
    case "blocked":
    case "failed":
      return "block";
    case "paused":
      return "paused";
    default:
      return "draft";
  }
}

function formatTaskTime(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

const quoteFont = (font: string) => `'${font.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

const googleFontFamily = (font: string) => encodeURIComponent(font).replace(/%20/g, "+");

const ensureGoogleFont = (id: string, font: string, weights: string) => {
  if (font === "system" || font.startsWith("ui-") || font.includes(",")) return;
  const linkId = `google-font-${id}-link`;
  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=${googleFontFamily(font)}:wght@${weights}&display=swap`;
};

const applyFonts = (sans: string | null, mono: string | null) => {
  const root = document.documentElement;
  if (sans && sans !== "system") {
    ensureGoogleFont("sans", sans, "400;500;600;700");
    const family = quoteFont(sans);
    root.style.setProperty("--font-sans", `${family}, 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif`);
    root.style.setProperty("--font-arabic", `${family}, 'IBM Plex Sans Arabic', system-ui, sans-serif`);
  } else {
    root.style.removeProperty("--font-sans");
    root.style.removeProperty("--font-arabic");
  }
  
  if (mono && mono !== "system") {
    ensureGoogleFont("mono", mono, "400;500;600");
    root.style.setProperty("--font-mono", `${quoteFont(mono)}, ui-monospace, monospace`);
  } else {
    root.style.removeProperty("--font-mono");
  }
};

export default function App() {
  // Check if this is the pet window view
  const params = new URLSearchParams(window.location.search);
  const isPetView = params.get("view") === "pet";

  if (isPetView) {
    const type = params.get("type") || "robot";
    return <PetWindowContent initialType={type} />;
  }

  const { projects, loading, error, createProject, pickFolder, refresh: refreshProjects } = useProjects();
  const providersApi = useProviders();
  const agent = useAgent();

  const [activeEditor, setActiveEditor] = useState<{ filePath: string; content: string; cursorLine?: number } | null>(null);

  // Load typography preferences on mount and listen to changes
  useEffect(() => {
    const sans = localStorage.getItem("selected-font-sans");
    const mono = localStorage.getItem("selected-font-mono");
    applyFonts(sans, mono);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "selected-font-sans" || e.key === "selected-font-mono") {
        const activeSans = localStorage.getItem("selected-font-sans");
        const activeMono = localStorage.getItem("selected-font-mono");
        applyFonts(activeSans, activeMono);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Listen to active editor sync event
  useEffect(() => {
    let unlistenEditor: (() => void) | undefined;
    const listenToEditor = async () => {
      try {
        const unlisten = await listen<any>("vs-code-editor-sync", (event) => {
          setActiveEditor(event.payload);
        });
        unlistenEditor = unlisten;
      } catch (err) {
        console.error("Failed to listen to vs-code-editor-sync:", err);
      }
    };
    void listenToEditor();
    return () => {
      if (unlistenEditor) unlistenEditor();
    };
  }, []);

  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return isThemePreference(saved) ? saved : "system";
  });
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(() => getSystemTheme());
  const theme = themePreference === "system" ? systemTheme : themePreference;
  const [view, setView] = useState<AppView>("tasks");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );
  const [settingsTab, setSettingsTab] = useState<string>("general");
  const [showCtx, setShowCtx] = useState(true);
  const [showCanvas, setShowCanvas] = useState<boolean>(() => {
    return localStorage.getItem("aura-show-canvas") === "true";
  });
  const [canvasWidth, setCanvasWidth] = useState<number>(() => {
    const saved = localStorage.getItem("aura-canvas-width");
    return saved ? parseInt(saved, 10) : 480;
  });
  const [activeCanvasFile, setActiveCanvasFile] = useState<string | null>(null);

  const handleToggleCanvas = () => {
    setShowCanvas((prev) => {
      const next = !prev;
      localStorage.setItem("aura-show-canvas", String(next));
      return next;
    });
  };

  const handleCanvasWidthChange = (w: number) => {
    setCanvasWidth(w);
    localStorage.setItem("aura-canvas-width", String(w));
  };
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");
  const [mode, setMode] = useState<"ask" | "act">("act");
  const [showNewProject, setShowNewProject] = useState(false);
  const [configureProvider, setConfigureProvider] = useState<string | null>(null);
  const [planCollapsed, setPlanCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string; model?: string }[]
  >([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("selected-model") || "auto";
  });
  const [chatError, setChatError] = useState<string | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeAgent, setActiveAgent] = useState("build");
  const [fallbackApproval, setFallbackApproval] = useState<{
    from?: string | null;
    to: string;
    model: string;
    reason: string;
    pendingMessage: string;
    pendingHistory: { role: string; content: string }[];
    activeAgent?: string | null;
  } | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>("aura://theme-preference", (event) => {
      if (isThemePreference(event.payload)) {
        setThemePreference(event.payload);
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const [chatStreamText, setChatStreamText] = useState<string | null>(null);
  const [chatStreamModel, setChatStreamModel] = useState<string>("");
  const chatStreamTimerRef = useRef<any>(null);

  const startTypingSimulation = (text: string, model: string) => {
    if (chatStreamTimerRef.current) {
      clearInterval(chatStreamTimerRef.current);
    }
    setChatStreamText("");
    setChatStreamModel(model);
    let index = 0;
    
    chatStreamTimerRef.current = setInterval(() => {
      if (index <= text.length) {
        setChatStreamText(text.slice(0, index));
        index += Math.max(2, Math.floor(text.length / 150));
      } else {
        setChatStreamText(text);
        if (chatStreamTimerRef.current) {
          clearInterval(chatStreamTimerRef.current);
          chatStreamTimerRef.current = null;
        }
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: text,
            model,
          },
        ]);
        setChatStreamText(null);
      }
    }, 15);
  };

  useEffect(() => {
    return () => {
      if (chatStreamTimerRef.current) {
        clearInterval(chatStreamTimerRef.current);
      }
    };
  }, []);

  const handlePendingOpenTask = useCallback(async (taskId: string) => {
    try {
      const task = await invoke<{ projectId: string }>("get_task", { taskId });
      setActiveProjectId(task.projectId);
    } catch {
      /* task may not exist */
    }
    setView("tasks");
    setActiveTaskId(taskId);
  }, []);

  usePendingOpenTask(handlePendingOpenTask);
  const tasks = useTasks(activeProjectId);
  const files = useFiles(activeProjectId);
  const git = useGit(activeProjectId);
  const audit = useAudit(activeProjectId);
  const vm = useVm();
  const browser = useBrowser();
  const pluginsApi = usePlugins(activeProjectId);
  const cloudApi = useCloud();
  const scheduledApi = useScheduledTasks(activeProjectId);
  const bridgeApi = useBridge();
  const computerUseApi = useComputerUse(activeProjectId);
  const memoryApi = useMemory(activeProjectId);
  const i18n = useI18n();
  const packaging = usePackaging();

  const canvasFiles = useMemo(() => {
    return tasks.activeTask?.modifiedFiles || [];
  }, [tasks.activeTask?.modifiedFiles]);

  useEffect(() => {
    if (canvasFiles.length > 0) {
      if (!activeCanvasFile || !canvasFiles.includes(activeCanvasFile)) {
        setActiveCanvasFile(canvasFiles[canvasFiles.length - 1]);
      }
    } else {
      setActiveCanvasFile(null);
    }
  }, [canvasFiles, activeCanvasFile]);

  const handleCanvasSendPrompt = (prompt: string) => {
    setComposer(prompt);
    setTimeout(() => {
      if (tasks.activeTask) {
        if (mode === "act" && tasks.activeTask.state !== "running" && tasks.activeTask.state !== "paused") {
          void handleNewTask();
        } else {
          void handleContinueTask();
        }
      } else {
        if (mode === "act") {
          void handleNewTask();
        } else {
          void handleSendChat();
        }
      }
    }, 50);
  };

  const renderCanvasToggleButton = () => {
    const isAr = i18n.settings?.locale === "ar";
    return (
      <button
        onClick={handleToggleCanvas}
        className={`chip-btn ${showCanvas ? "active" : ""}`}
        style={{
          background: showCanvas ? "var(--accent)" : "var(--bg-3)",
          color: showCanvas ? "#fff" : "var(--fg-2)",
          border: "1px solid var(--border-3)",
          padding: "6px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span>📋</span>
        <span>{isAr ? "اللوحة" : "Canvas"}</span>
      </button>
    );
  };
  const chatModels = useChatModels(
    providersApi.providers.filter((p) => p.enabled && p.hasSecret).length +
      providersApi.providers.map((p) => p.defaultModel ?? "").join(",").length,
  );

  const currentModelContextWindow = useMemo(() => {
    const { preferredModel } = parseModelSelection(selectedModel);
    if (!preferredModel) return 128000;
    const name = preferredModel.toLowerCase();
    if (name.includes("gemini-1.5-pro")) return 2000000;
    if (name.includes("gemini-1.5-flash")) return 1000000;
    if (name.includes("gemini-2.0-flash")) return 1048576;
    if (name.includes("gemini-2.0-pro")) return 2097152;
    if (name.includes("gemini")) return 1000000;
    if (name.includes("claude-3-5-sonnet") || name.includes("claude-3-5-haiku")) return 200000;
    if (name.includes("claude-3-opus") || name.includes("claude-3")) return 200000;
    if (name.includes("claude")) return 200000;
    if (name.includes("gpt-4o") || name.includes("gpt-4-turbo")) return 128000;
    if (name.includes("gpt-4")) return 128000;
    if (name.includes("o1")) return 128000;
    if (name.includes("o3")) return 200000;
    if (name.includes("gpt-3.5-turbo")) return 16385;
    if (name.includes("deepseek-coder") || name.includes("deepseek-chat") || name.includes("deepseek-r1")) return 128000;
    if (name.includes("deepseek")) return 128000;
    if (name.includes("qwen-2.5") || name.includes("qwen2.5")) return 128000;
    if (name.includes("qwen")) return 32000;
    if (name.includes("llama-3.1") || name.includes("llama3.1") || name.includes("llama-3-2") || name.includes("llama3.2")) return 128000;
    if (name.includes("llama-3") || name.includes("llama3")) return 8192;
    if (name.includes("llama-2") || name.includes("llama2")) return 4096;
    if (name.includes("codestral")) return 32000;
    if (name.includes("mistral-large")) return 128000;
    if (name.includes("mistral")) return 32000;
    if (name.includes("command-r")) return 128000;
    return 128000;
  }, [selectedModel]);

  // Re-bind hooks when project changes

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setChatMessages([]);
    setChatError(null);
    const saved = localStorage.getItem("selected-model") || "auto";
    setSelectedModel(saved);

    if (activeProjectId) {
      invoke("get_project_profile", { projectId: activeProjectId })
        .then((profile: any) => {
          setShowOnboarding(profile.confidence !== "high");
        })
        .catch(() => {
          setShowOnboarding(true);
        });
    } else {
      setShowOnboarding(false);
    }
  }, [activeProjectId]);

  const [canRollback, setCanRollback] = useState(false);

  useEffect(() => {
    if (activeTaskId) {
      invoke<boolean>("has_task_snapshot", { taskId: activeTaskId })
        .then(setCanRollback)
        .catch(() => setCanRollback(false));
    } else {
      setCanRollback(false);
    }
  }, [activeTaskId, tasks.activeTask?.state]);

  const handleRollback = async () => {
    if (!activeTaskId) return;
    const isArabic = i18n.settings?.locale === "ar";
    const msg = isArabic
      ? "هل أنت متأكد من رغبتك في التراجع عن جميع التغييرات التي أجراها الوكيل في هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء."
      : "Are you sure you want to rollback all file modifications made by the agent in this task? This action cannot be undone.";

    if (confirm(msg)) {
      try {
        const res = await invoke<string>("rollback_task", { taskId: activeTaskId });
        alert(res);
        setCanRollback(false);
        await tasks.refreshTasks();
      } catch (e) {
        alert("Rollback failed: " + e);
      }
    }
  };

  useEffect(() => {
    setPlanCollapsed(false);
  }, [activeTaskId]);

  const navItems = useMemo(
    () => {
      const list = NAV_ITEMS.map((item) => ({
        ...item,
        label: i18n.t(`nav.${item.id}` as Parameters<typeof i18n.t>[0]),
      }));
      list.push({
        id: "terminal" as AppView,
        icon: "terminal",
        label: i18n.t("nav.terminal" as any, { defaultValue: "Terminal" }),
      });
      return list;
    },
    [i18n],
  );

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    localStorage.setItem("selected-model", model);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(media.matches ? "dark" : "light");
    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, themePreference);
  }, [theme, themePreference]);

  const handleToggleTheme = useCallback(() => {
    setThemePreference((current) => {
      const currentTheme = current === "system" ? systemTheme : current;
      return currentTheme === "light" || currentTheme === "blue" ? "dark" : "light";
    });
  }, [systemTheme]);

  useEffect(() => {
    if (projects.length && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await invoke<{ agents: any[] }>("get_agents_list", {
          projectPath: activeProject?.folderPath || null,
        });
        if (res && Array.isArray(res.agents)) {
          setAgents(res.agents);
        }
      } catch (err) {
        console.error("Failed to load agents:", err);
      }
    };
    void fetchAgents();
  }, [activeProject?.folderPath]);

  useEffect(() => {
    void agent.checkSidecar();
    void agent.loadLatestUsage(activeProjectId);
  }, [activeProjectId, agent.checkSidecar, agent.loadLatestUsage]);

  useEffect(() => {
    if (activeProjectId) {
      void agent.loadLatestUsage(activeProjectId);
    }
  }, [tasks.activeTask?.iteration, tasks.running, activeProjectId]);

  useEffect(() => {
    if (activeProjectId) void tasks.refreshTasks();
  }, [activeProjectId]);

  useEffect(() => {
    if (activeTaskId) void tasks.loadTask(activeTaskId);
  }, [activeTaskId]);

  useEffect(() => {
    if (view === "files" && activeProjectId) void files.refreshFiles();
    if (view === "git" && activeProjectId) void git.refresh();
    if (view === "audit") void audit.refresh();
    if (view === "schedule") void scheduledApi.refresh();
    if (view === "computer") void computerUseApi.refresh();
    if (view === "memory" && activeProjectId) void memoryApi.refresh();
    if (view === "settings") {
      void cloudApi.refresh();
      void bridgeApi.refresh();
    }
  }, [view, activeProjectId]);

  useEffect(() => {
    if (!activeProject) return;
    setMode(activeProject.permissionMode === "act-without-asking" ? "act" : "ask");
  }, [activeProject?.id, activeProject?.permissionMode]);

  const handleToggleMode = useCallback(async () => {
    const next = mode === "ask" ? "act" : "ask";
    setMode(next);
    if (!activeProjectId) return;
    try {
      await invoke("set_project_permission_mode", {
        input: {
          projectId: activeProjectId,
          permissionMode: next === "act" ? "act-without-asking" : "ask-first",
        },
      });
      await refreshProjects();
    } catch {
      /* revert on failure */
      setMode(mode);
    }
  }, [mode, activeProjectId, refreshProjects]);

  const cost = useMemo(() => formatCost(agent.lastUsage), [agent.lastUsage]);

  const sidebarTasks: TaskItem[] = useMemo(
    () =>
      tasks.tasks.map((t) => ({
        id: t.id,
        name: t.title,
        state: mapTaskState(t.state),
        time: formatTaskTime(t.updatedAt),
        projectId: t.projectId,
      })),
    [tasks.tasks],
  );

  const crumb = useMemo(() => {
    if (view === "tasks" && activeProject) return `${activeProject.name} / Tasks`;
    if (view === "tasks") return "Tasks";
    return view.charAt(0).toUpperCase() + view.slice(1);
  }, [view, activeProject]);

  const composerLabels = useMemo(
    () => ({
      placeholder: i18n.t("chat.placeholder"),
      send: i18n.t("chat.send"),
      runTask: i18n.t("chat.runTask"),
      startTask: i18n.t("chat.startTask"),
      autoModel: i18n.t("chat.autoModel"),
      modeAsk: i18n.t("chat.modeAsk"),
      modeAct: i18n.t("chat.modeAct"),
      running: i18n.t("chat.thinking"),
    }),
    [i18n],
  );

  const t = useMemo(
    () => (key: string, params?: Record<string, string>) =>
      i18n.t(key as keyof MessageCatalog, params),
    [i18n],
  );

  const contextPanelLabels = useMemo(
    () => ({
      sidecar: t("ctx.sidecar"),
      sidecarReady: t("task.sidecar.ready"),
      sidecarOffline: t("task.sidecar.offline"),
      linuxWorkspace: t("ctx.linuxWorkspace"),
      vmRunning: t("ctx.vmRunning"),
      vmOffline: t("ctx.vmOffline"),
      browserHelper: t("ctx.browserHelper"),
      browserRunning: t("ctx.browserRunning"),
      browserOffline: t("ctx.browserOffline"),
      pluginsHelper: t("ctx.pluginsHelper"),
      toolsAvailable: t("ctx.toolsAvailable"),
      pluginsOffline: t("ctx.pluginsOffline"),
      auraCloud: t("ctx.auraCloud"),
      notSignedIn: t("ctx.notSignedIn"),
      syncActive: t("ctx.syncActive"),
      syncOffline: t("ctx.syncOffline"),
      syncDisabled: t("ctx.syncDisabled"),
      usage: t("ctx.usage"),
    }),
    [t],
  );

  const taskWelcomeLabels = useMemo(
    () => ({
      titlePhase11: t("task.welcome.subtitle"),
      descPhase11: t("task.welcome.desc"),
    }),
    [t],
  );

  const planBlockLabels = useMemo(
    () => ({
      collapsed: t("task.plan.collapsed"),
      approved: t("task.plan.approved"),
      proposedPlan: t("task.plan.proposedPlan"),
      askFirst: t("chat.modeAsk"),
      approveRun: t("task.plan.approveRun"),
    }),
    [t],
  );

  const summaryLabels = useMemo(
    () => ({
      taskComplete: t("task.summary.complete"),
    }),
    [t],
  );

  const thinkingLabels = useMemo(
    () => ({
      working: t("task.thinking.working"),
    }),
    [t],
  );

  const approvalLabels = useMemo(
    () => ({
      highRisk: t("task.approval.highRisk"),
      needsApproval: t("task.approval.needsApproval"),
      desktopOnly: i18n.locale?.startsWith("ar")
        ? "تتطلب هذه العملية موافقة من تطبيق سطح المكتب. لا يمكن اعتمادها من جهاز بعيد."
        : "Desktop approval required. Remote clients cannot approve this action.",
      allowOnce: t("task.approval.allowOnce"),
      allowAlways: i18n.locale?.startsWith("ar") ? "السماح دائماً لهذا المشروع" : "Allow always (this project)",
      deny: t("task.approval.deny"),
    }),
    [i18n.locale, t],
  );

  const handleCheckPetCommand = (text: string): boolean => {
    const msg = text.trim().toLowerCase();
    if (msg.startsWith("/pet") || msg.startsWith("/أليف")) {
      let type = localStorage.getItem("selected-pet") || "robot";
      
      if (msg.includes("cat") || msg.includes("قط") || msg.includes("بسة")) type = "cat";
      else if (msg.includes("dog") || msg.includes("كلب") || msg.includes("شيبا")) type = "dog";
      else if (msg.includes("bunny") || msg.includes("أرنب") || msg.includes("ارنب")) type = "bunny";
      else if (msg.includes("panda") || msg.includes("باندا")) type = "panda";
      else if (msg.includes("fox") || msg.includes("ثعلب")) type = "fox";
      else if (msg.includes("hamster") || msg.includes("هامستر")) type = "hamster";
      else if (msg.includes("penguin") || msg.includes("بطريق")) type = "penguin";
      else if (msg.includes("koala") || msg.includes("كوالا")) type = "koala";
      else if (msg.includes("bear") || msg.includes("دب")) type = "bear";
      else if (msg.includes("pig") || msg.includes("خنزير")) type = "pig";
      else if (msg.includes("tiger") || msg.includes("نمر")) type = "tiger";
      else if (msg.includes("robot") || msg.includes("روبوت") || msg.includes("بوت")) type = "robot";

      invoke("toggle_pet_window", { petType: type }).catch(console.error);
      setComposer("");
      return true;
    }
    return false;
  };

  const handleCheckSlashCommands = async (text: string): Promise<boolean> => {
    const msg = text.trim();
    const isAr = i18n.locale?.startsWith("ar");
    
    if (msg.startsWith("/context") || msg.startsWith("/السياق")) {
      const systemEst = 4000;
      const currentMessages = tasks.activeTask ? tasks.activeTask.messages : chatMessages;
      const historyEst = Math.ceil(currentMessages.reduce((acc: number, m: { content: string }) => acc + m.content.length, 0) / 4);
      const inputEst = Math.ceil(composer.length / 4);
      const totalEst = systemEst + historyEst + inputEst;
      
      const responseText = isAr
        ? `📊 **توزيع استخدام السياق المقدر:**
- ⚙️ **موجه النظام (System):** ~${systemEst.toLocaleString()} رمزاً (Tokens)
- 📁 **ملفات مساحة العمل:** (يتم تضمينها ديناميكياً عند الحاجة)
- 💬 **سجل المحادثة:** ~${historyEst.toLocaleString()} رمزاً
- ✏️ **الرسالة الحالية:** ~${inputEst.toLocaleString()} رمزاً
- 📈 **الإجمالي المقدر:** ~${totalEst.toLocaleString()} / ${currentModelContextWindow.toLocaleString()} رمزاً

💡 **نصائح لتنظيف وتحسين السياق:**
1. قم ببدء مهمة جديدة لتصفير سجل الدردشة غير الضروري.
2. تجنب فتح ملفات ضخمة جداً في المحرر دفعة واحدة.
3. استخدم ذاكرة المشروع والمهارات لتلخيص المعرفة الدائمة.`
        : `📊 **Estimated Context Allocation:**
- ⚙️ **System Prompt:** ~${systemEst.toLocaleString()} tokens
- 📁 **Workspace Files:** (dynamically injected based on context)
- 💬 **Chat History:** ~${historyEst.toLocaleString()} tokens
- ✏️ **Current Message:** ~${inputEst.toLocaleString()} tokens
- 📈 **Total Estimated:** ~${totalEst.toLocaleString()} / ${currentModelContextWindow.toLocaleString()} tokens

💡 **Context Optimization Tips:**
1. Start a fresh task/chat to clear out historical context.
2. Avoid opening or reading very large files concurrently.
3. Utilize project memory and skills to pin long-term knowledge.`;

      setComposer("");
      setChatMessages(prev => [
        ...prev,
        { role: "user", content: msg },
        { role: "assistant", content: responseText }
      ]);
      return true;
    }

    if (msg.startsWith("/security-audit") || msg.startsWith("/تدقيق_امني")) {
      if (!activeProjectId) return false;
      setComposer("");
      const startMsg = isAr ? "جاري تشغيل التدقيق الأمني للمشروع..." : "Running security audit scan...";
      setChatMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: startMsg }]);

      invoke<any[]>("run_security_audit", { projectId: activeProjectId })
        .then((findings) => {
          if (findings.length === 0) {
            const successMsg = isAr
              ? "✅ **لم يتم العثور على مشاكل أمنية واضحة في هذا المشروع.**"
              : "✅ **No obvious security vulnerabilities found in this project.**";
            setChatMessages(prev => [...prev.slice(0, prev.length - 1), { role: "assistant", content: successMsg }]);
          } else {
            let markdown = isAr
              ? `🔍 **نتائج التدقيق الأمني للمشروع (${findings.length} ملاحظات):**\n\n`
              : `🔍 **Security Audit Findings (${findings.length} issues detected):**\n\n`;

            findings.forEach((f) => {
              const severityIcon = f.severity === "critical" ? "🔴 [حرج]" : f.severity === "high" ? "🟠 [عالي]" : "🟡 [متوسط]";
              const severityIconEn = f.severity === "critical" ? "🔴 [Critical]" : f.severity === "high" ? "🟠 [High]" : "🟡 [Medium]";

              if (isAr) {
                markdown += `### ${f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : "🟡"} ${f.finding} (${f.filePath})\n`;
                markdown += `- **الخطورة:** ${severityIcon}\n`;
                markdown += `- **الوصف:** ${f.description}\n`;
                markdown += `- **الحل المقترح:** ${f.recommendedFix}\n\n`;
              } else {
                markdown += `### ${f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : "🟡"} ${f.finding} (${f.filePath})\n`;
                markdown += `- **Severity:** ${severityIconEn}\n`;
                markdown += `- **Description:** ${f.description}\n`;
                markdown += `- **Fix:** ${f.recommendedFix}\n\n`;
              }
            });
            setChatMessages(prev => [...prev.slice(0, prev.length - 1), { role: "assistant", content: markdown }]);
          }
        })
        .catch((e) => {
          const failMsg = (isAr ? "فشل التدقيق الأمني: " : "Security audit failed: ") + e;
          setChatMessages(prev => [...prev.slice(0, prev.length - 1), { role: "assistant", content: failMsg }]);
        });
      return true;
    }

    if (msg.startsWith("/init-aura") || msg.startsWith("/تهيئة_اورا")) {
      if (!activeProjectId) return false;
      setComposer("");
      const statusMsg = isAr ? "جاري فحص مساحة العمل لإنشاء ملف AURA.md..." : "Scanning workspace to generate AURA.md...";
      setChatMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: statusMsg }]);
      
      let pkgName = activeProject?.name || "Aura Project";
      let depsList = "";
      try {
        const pkgJsonStr = await invoke<string>("read_project_file", {
          projectId: activeProjectId,
          filePath: "package.json"
        });
        const pkg = JSON.parse(pkgJsonStr);
        pkgName = pkg.name || pkgName;
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        depsList = Object.keys(deps).map(d => `- ${d}: ${deps[d]}`).join("\n");
      } catch (e) {
        // package.json might not exist or failed
      }

      const auraMdContent = `# Aura Project Rules - ${pkgName}

This file contains coding conventions, build instructions, and guidelines for the Aura Work assistant in this workspace.

## Project Stack
${depsList ? depsList : "- TypeScript / Javascript (No dependencies detected)"}

## Architecture Guidelines
- Keep code modular and strictly typed.
- Prefer helper modules over monolithic files.
- Keep components small and reusable.

## Build and Verification Commands
- Compile project: \`npm run build\` or equivalent.
- Run tests: \`npm test\` or equivalent.
- Lint check: \`npm run lint\` or equivalent.

## Security and Rules
- Never commit API keys or secret credentials.
- Write unit tests for new APIs and edge cases.
- Always run local compile checks before completing tasks.
`;

      try {
        await invoke("write_project_file", {
          input: {
            projectId: activeProjectId,
            filePath: "AURA.md",
            content: auraMdContent,
            skipPermission: true
          }
        });
        const successText = isAr
          ? `✅ **تم إنشاء ملف القواعد بنجاح!**
تم حفظ الملف في مسار المشروع باسم [AURA.md](file://${activeProject?.folderPath}/AURA.md).
يمكنك فتحه وتعديله لتخصيص سلوك الوكيل داخل هذا المشروع.`
          : `✅ **AURA.md rules file created successfully!**
The file has been saved to [AURA.md](file://${activeProject?.folderPath}/AURA.md).
You can open and customize it to instruct the agent on workspace rules.`;

        setChatMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: successText }]);
      } catch (err) {
        const failText = isAr
          ? `❌ فشل إنشاء ملف القواعد: ${String(err)}`
          : `❌ Failed to create rules file: ${String(err)}`;
        setChatMessages(prev => [...prev, { role: "assistant", content: failText }]);
      }
      return true;
    }
    
    return false;
  };

  const handleSendChat = async (fallbackApproved = false) => {
    if (handleCheckPetCommand(composer)) return;
    if (await handleCheckSlashCommands(composer)) return;
    const msg = composer.trim();
    if (!msg || agent.running || tasks.running) return;
    if (activeTaskId) return;

    // Budget check
    const budget = localStorage.getItem("aura-monthly-budget");
    if (budget && budget !== "unlimited") {
      try {
        const spending = await invoke<number>("get_monthly_spending");
        if (spending >= parseFloat(budget)) {
          const errMsg = `API monthly budget limit reached ($${spending.toFixed(2)} >= $${parseFloat(budget).toFixed(2)}). Please increase your budget in Settings.`;
          setChatError(errMsg);
          setChatMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
          return;
        }
      } catch (err) {
        console.error("Budget check failed:", err);
      }
    }

    setComposer("");
    setChatError(null);
    const userLine = { role: "user" as const, content: msg };
    const history = [...chatMessages, userLine];
    if (!fallbackApproved) setChatMessages(history);

    let finalMsg = msg;
    if (activeEditor) {
      finalMsg = `${msg}\n\n[Context from active file in VS Code: ${activeEditor.filePath}${activeEditor.cursorLine ? ` (Line ${activeEditor.cursorLine})` : ""}]\n\`\`\`\n${activeEditor.content}\n\`\`\``;
    }

    let chatAgent = activeAgent;
    const mentionMatch = msg.match(/^@([a-zA-Z0-9_-]+)/);
    if (mentionMatch) {
      const agentId = mentionMatch[1].toLowerCase();
      const found = agents.find(a => a.name === agentId);
      if (found) {
        chatAgent = agentId;
        finalMsg = msg.slice(mentionMatch[0].length).trim();
      }
    }

    const { preferredProvider, preferredModel } = parseModelSelection(selectedModel);
    try {
      const result = await agent.runChat({
        message: finalMsg,
        projectId: activeProjectId,
        messages: [
          ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: finalMsg }
        ],
        preferredProvider,
        preferredModel,
        fallbackApproved,
        activeAgent: chatAgent,
      });
      if (result.requiresFallbackApproval) {
        setFallbackApproval({
          from: result.fallbackFrom,
          to: result.providerId,
          model: result.modelId,
          reason: result.routingReason,
          pendingMessage: msg,
          pendingHistory: history.map((m) => ({ role: m.role, content: m.content })),
          activeAgent: chatAgent,
        });
        return;
      }
      if (activeProjectId) {
        void tasks.refreshPendingPermissions({ projectId: activeProjectId, taskId: null });
      }
      startTypingSimulation(
        result.text || t("chat.emptyResponse"),
        `${result.providerId}/${result.modelId}`
      );
      if (activeProjectId) {
        void agent.loadLatestUsage(activeProjectId);
      }
    } catch (e) {
      const err = String(e);
      setChatError(err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: err }]);
    }
  };

  const handleApproveFallback = async () => {
    if (!fallbackApproval) return;
    const { pendingMessage, pendingHistory } = fallbackApproval;
    setFallbackApproval(null);
    setComposer(pendingMessage);
    setChatMessages(
      pendingHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    );
    setComposer("");
    setChatError(null);
    const { preferredProvider, preferredModel } = parseModelSelection(selectedModel);
    try {
      const result = await agent.runChat({
        message: pendingMessage,
        projectId: activeProjectId,
        messages: pendingHistory,
        preferredProvider,
        preferredModel,
        fallbackApproved: true,
        activeAgent: fallbackApproval?.activeAgent,
      });
      startTypingSimulation(
        result.text || t("chat.emptyResponse"),
        `${result.providerId}/${result.modelId}`
      );
      if (activeProjectId) {
        void agent.loadLatestUsage(activeProjectId);
      }
    } catch (e) {
      setChatError(String(e));
    }
  };

  const ensureActPermissions = async () => {
    if (mode !== "act" || !activeProjectId) return;
    if (activeProject?.permissionMode === "act-without-asking") return;
    await invoke("set_project_permission_mode", {
      input: {
        projectId: activeProjectId,
        permissionMode: "act-without-asking",
      },
    });
    await refreshProjects();
  };

  const handleNewTask = async () => {
    if (handleCheckPetCommand(composer)) return;
    if (await handleCheckSlashCommands(composer)) return;
    const msg = composer.trim();
    if (!msg || tasks.running) return;

    // Budget check
    const budget = localStorage.getItem("aura-monthly-budget");
    if (budget && budget !== "unlimited") {
      try {
        const spending = await invoke<number>("get_monthly_spending");
        if (spending >= parseFloat(budget)) {
          const errMsg = `API monthly budget limit reached ($${spending.toFixed(2)} >= $${parseFloat(budget).toFixed(2)}). Please increase your budget in Settings.`;
          tasks.setError(errMsg);
          return;
        }
      } catch (err) {
        console.error("Budget check failed:", err);
      }
    }

    setComposer("");
    setChatMessages([]);
    setChatError(null);
    setActiveTaskId(null);
    tasks.setActiveTask(null);

    let finalMsg = msg;
    if (activeEditor) {
      finalMsg = `${msg}\n\n[Context from active file in VS Code: ${activeEditor.filePath}${activeEditor.cursorLine ? ` (Line ${activeEditor.cursorLine})` : ""}]\n\`\`\`\n${activeEditor.content}\n\`\`\``;
    }

    const { preferredProvider, preferredModel } = parseModelSelection(selectedModel);
    try {
      if (mode === "act") await ensureActPermissions();
      const task = await tasks.createAndStart({
        prompt: finalMsg,
        preferredProvider,
        preferredModel,
        autoApprove: mode === "act",
      });
      setActiveTaskId(task.id);
    } catch {
      /* error surfaced via tasks.error */
    }
  };

  const handleComposerPrimary = () => {
    if (mode === "act") {
      void handleNewTask();
      return;
    }
    void handleSendChat();
  };

  const handleApprovePlan = async () => {
    if (!tasks.activeTask) return;
    await tasks.approvePlan(tasks.activeTask.id);
    await tasks.runLoop(tasks.activeTask.id, undefined, mode === "act");
  };

  const handleContinueTask = async () => {
    if (!tasks.activeTask) return;
    const task = tasks.activeTask;
    if (task.state !== "running" && task.state !== "paused") return;

    if (await handleCheckSlashCommands(composer)) return;

    const msg = composer.trim();
    if (msg) {
      setComposer("");
      await tasks.sendTaskMessage(task.id, msg);
    } else if (task.state === "running") {
      await tasks.continueTask(task.id, mode === "act");
    }
  };

  const handleNewTaskWorkspace = () => {
    setActiveTaskId(null);
    tasks.setActiveTask(null);
    setComposer("");
    setChatMessages([]);
    setChatError(null);
  };

  const renderTaskWorkspace = () => {
    const task = tasks.activeTask;
    if (!activeProject) return null;

    if (!task && !activeTaskId) {
      if (mode === "ask" && chatMessages.length > 0) {
        return (
          <>
            <div className="ws-head">
              <div className="row1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <h1>{activeProject.name}</h1>
                {renderCanvasToggleButton()}
              </div>
              <div className="row2">
                <span className="ws-meta">{activeProject.folderPath}</span>
                <span className="chat-meta">
                  <span className="tag local">{t("chat.modeAsk")}</span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, height: "100%" }}>
                <div className="ws-scroll">
                  <div className="ws-canvas">
                    {showOnboarding && activeProjectId && (
                      <OnboardingWizard
                        projectId={activeProjectId}
                        onClose={() => setShowOnboarding(false)}
                        isArabic={i18n.settings?.locale === "ar"}
                      />
                    )}
                    {chatMessages.map((m, i) => (
                      <Msg
                        key={i}
                        who={m.role === "user" ? t("chat.you") : t("chat.aura")}
                        agent={m.role === "assistant"}
                        role={m.model}
                      >
                        {m.content}
                      </Msg>
                    ))}
                    {chatStreamText !== null && (
                      <StreamingMsg
                        who={t("chat.aura")}
                        agent
                        role={chatStreamModel}
                        streaming
                        liveText={chatStreamText}
                      >
                        {chatStreamText}
                      </StreamingMsg>
                    )}
                    {tasks.pendingPermissions[0] && (
                      <PermissionApprovalDialog
                        permission={tasks.pendingPermissions[0]}
                        labels={approvalLabels}
                        onDecide={(d) => void tasks.resolvePermission(tasks.pendingPermissions[0].id, d)}
                      />
                    )}
                    {chatError && <p className="modal-error">{chatError}</p>}
                    {agent.running && <Thinking label={i18n.t("chat.thinking")} labels={thinkingLabels} />}
                  </div>
                </div>
                <Composer
                  value={composer}
                  onChange={setComposer}
                  onSend={() => void handleComposerPrimary()}
                  onRunTask={() => void handleNewTask()}
                  mode={mode}
                  onToggleMode={() => void handleToggleMode()}
                  disabled={agent.running || tasks.running || chatStreamText !== null}
                  models={chatModels.models}
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  labels={composerLabels}
                  locale={i18n.locale}
                  skills={pluginsApi.skills}
                  messages={chatMessages}
                  modelContextWindow={currentModelContextWindow}
                  showRunTask
                  activeAgent={activeAgent}
                  onAgentChange={setActiveAgent}
                  agents={agents}
                />
              </div>
              {showCanvas && (
                <CanvasPanel
                  projectId={activeProjectId!}
                  taskId={null}
                  isAr={i18n.settings?.locale === "ar"}
                  activeFile={activeCanvasFile}
                  onChangeActiveFile={setActiveCanvasFile}
                  onSendPrompt={handleCanvasSendPrompt}
                  onRefreshWorkspace={refreshProjects}
                  modifiedFiles={canvasFiles}
                  width={canvasWidth}
                  onWidthChange={handleCanvasWidthChange}
                />
              )}
            </div>
          </>
        );
      }
      return (
        <div className="empty-task">
          <div className="et-inner">
            <TaskWelcome projectName={activeProject.name} phase={11} labels={taskWelcomeLabels} />
            <div className="composer-wrap">
              <Composer
                value={composer}
                onChange={setComposer}
                onSend={() => void handleComposerPrimary()}
                onRunTask={mode === "ask" ? () => void handleNewTask() : undefined}
                mode={mode}
                onToggleMode={() => void handleToggleMode()}
                disabled={agent.running || tasks.running || chatStreamText !== null}
                models={chatModels.models}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                labels={composerLabels}
                locale={i18n.locale}
                skills={pluginsApi.skills}
                messages={chatMessages}
                modelContextWindow={currentModelContextWindow}
                showRunTask={mode === "ask"}
                activeAgent={activeAgent}
                onAgentChange={setActiveAgent}
                agents={agents}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="ws-head">
          <div className="row1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <h1>{task?.title ?? t("chat.taskFallback")}</h1>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {canRollback && (
                <button
                  onClick={handleRollback}
                  className="chip-btn"
                  style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "4px 8px", borderRadius: "6px" }}
                >
                  ↩️ {i18n.settings?.locale === "ar" ? "تراجع واستعادة الملفات" : "Undo & Restore"}
                </button>
              )}
              {renderCanvasToggleButton()}
            </div>
          </div>
          <div className="row2">
            <span className="ws-meta">{activeProject.folderPath}</span>
            <span className="ws-meta">{t("task.state")}: {task?.state ?? "…"}</span>
            {!agent.sidecar.running && (
              <span className="ws-meta warn">{t("task.sidecar.offline")}</span>
            )}
            {!vm.status?.running && (
              <span className="ws-meta warn">{t("ctx.vmOffline")}</span>
            )}
            {!browser.status?.running && (
              <span className="ws-meta warn">{t("ctx.browserOffline")}</span>
            )}
            {!pluginsApi.status?.running && (
              <span className="ws-meta warn">{t("ctx.pluginsOffline")}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, height: "100%" }}>
            <div className="ws-scroll">
              <div className="ws-canvas">
                {showOnboarding && activeProjectId && (
                  <OnboardingWizard
                    projectId={activeProjectId}
                    onClose={() => setShowOnboarding(false)}
                    isArabic={i18n.settings?.locale === "ar"}
                  />
                )}
                {tasks.loading && !task && <Thinking label={t("common.loading")} labels={thinkingLabels} />}
                {task?.messages.map((m, i) => {
                  const isClarification = m.content.trim().startsWith('{"type":"clarification"');
                  if (isClarification) {
                    try {
                      const data = JSON.parse(m.content);
                      const isLatest = i === task.messages.length - 1;
                      return (
                        <ClarificationCard
                          key={i}
                          data={data}
                          isLatest={isLatest}
                          isArabic={i18n.locale?.startsWith("ar")}
                          onSubmit={async (response) => {
                            setComposer("");
                            await tasks.sendTaskMessage(task.id, response);
                            await tasks.continueTask(task.id, mode === "act");
                          }}
                        />
                      );
                    } catch (e) {
                      // fallback
                    }
                  }

                  return (
                    <StreamingMsg
                      key={i}
                      who={m.agentRole ?? (m.role === "user" ? t("chat.you") : t("chat.aura"))}
                      agent={m.role !== "user"}
                      role={m.agentRole ?? undefined}
                      streaming={tasks.running && m.role === "assistant" && i === task.messages.length - 1}
                      liveText={
                        tasks.running && m.role === "assistant" && i === task.messages.length - 1
                          ? tasks.streamText
                          : null
                      }
                    >
                      {m.content}
                    </StreamingMsg>
                  );
                })}

                {tasks.running && tasks.streamText && (!task?.messages.length || task.messages[task.messages.length - 1]?.role === "user") && (
                  <StreamingMsg
                    who={t("chat.aura")}
                    agent
                    role="coordinator"
                    streaming
                    liveText={tasks.streamText}
                  >
                    {tasks.streamText.replace(/```[\s\S]*$/g, "").trim() || "…"}
                  </StreamingMsg>
                )}

                {task?.pendingEditId && task.state === "waiting-for-approval" && (
                  <p className="modal-desc">
                    {t("files.pendingEdits")}{" "}
                    <button type="button" className="btn sm" onClick={() => setView("files")}>
                      {t("files.approveWrite")}
                    </button>
                  </p>
                )}

                {task && (task.state === "running" || task.state === "paused") && !tasks.running && (
                  <div className="section">
                    <button type="button" className="btn primary sm" onClick={() => void handleContinueTask()}>
                      {task.state === "paused" ? t("chat.send") : t("chat.continueTask")}
                    </button>
                  </div>
                )}

                {task && task.plan.length > 0 && (
                  <PlanBlock
                    steps={task.plan}
                    approved={task.planApproved}
                    collapsed={planCollapsed && task.planApproved}
                    onExpand={() => setPlanCollapsed(false)}
                    labels={planBlockLabels}
                    onApprove={
                      task.state === "waiting-for-approval" && !task.planApproved
                        ? () => void handleApprovePlan()
                        : undefined
                    }
                  />
                )}

                {task && task.steps.length > 0 && <Steps items={task.steps} />}

                {tasks.pendingPermissions[0] && (
                  <PermissionApprovalDialog
                    permission={tasks.pendingPermissions[0]}
                    labels={approvalLabels}
                    onDecide={(d) => void tasks.resolvePermission(tasks.pendingPermissions[0].id, d)}
                  />
                )}

                {task?.state === "completed" && task.summary && (
                  <Summary
                    data={{
                      points: [task.summary],
                      files: task.modifiedFiles.map((p) => ({ path: p })),
                    }}
                    labels={summaryLabels}
                  />
                )}

                {tasks.running && <Thinking label={t("task.thinking.coordinator")} labels={thinkingLabels} />}
                {tasks.error && (
                  <p className="modal-error">{tasks.error}</p>
                )}

                {activeEditor && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "color-mix(in srgb, var(--accent) 8%, var(--bg-1))",
                    border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--border-1))",
                    borderRadius: "8px",
                    marginBottom: "8px",
                    fontSize: "12px",
                    color: "var(--fg-2)"
                  }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#5a8a52" }} />
                    <span>{t("settings.ideConnected") || "VS Code Connected"}: <strong>{activeEditor.filePath.split('/').pop()}</strong>{activeEditor.cursorLine ? ` (Line ${activeEditor.cursorLine})` : ""}</span>
                    <button
                      onClick={() => setActiveEditor(null)}
                      style={{
                        marginLeft: "auto",
                        border: "none",
                        background: "transparent",
                        color: "var(--fg-3)",
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "0 4px"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Composer
              value={composer}
              onChange={setComposer}
              onSend={() => {
                if (handleCheckPetCommand(composer)) return;
                if (
                  mode === "act" &&
                  task &&
                  task.state !== "running" &&
                  task.state !== "paused"
                ) {
                  void handleNewTask();
                  return;
                }
                void handleContinueTask();
              }}
              onRunTask={() => void handleNewTask()}
              mode={mode}
              onToggleMode={() => void handleToggleMode()}
              disabled={
                agent.running ||
                tasks.running ||
                (task?.state === "running" && tasks.running)
              }
              models={chatModels.models}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              labels={{
                ...composerLabels,
                send:
                  mode === "act" && task && task.state !== "running"
                    ? t("chat.send")
                    : t("chat.continueTask"),
                placeholder:
                  mode === "act" && task && task.state !== "running"
                    ? t("chat.placeholder")
                    : t("chat.taskPlaceholder"),
              }}
              locale={i18n.locale}
              skills={pluginsApi.skills}
              messages={task?.messages || []}
              workspaceFiles={task?.modifiedFiles.join(",") || ""}
              modelContextWindow={currentModelContextWindow}
              activeAgent={activeAgent}
              onAgentChange={setActiveAgent}
              agents={agents}
            />
          </div>
          {showCanvas && (
            <CanvasPanel
              projectId={activeProjectId!}
              taskId={task?.id || null}
              isAr={i18n.settings?.locale === "ar"}
              activeFile={activeCanvasFile}
              onChangeActiveFile={setActiveCanvasFile}
              onSendPrompt={handleCanvasSendPrompt}
              onRefreshWorkspace={refreshProjects}
              modifiedFiles={canvasFiles}
              width={canvasWidth}
              onWidthChange={handleCanvasWidthChange}
            />
          )}
        </div>
      </>
    );
  };

  const renderMain = () => {
    if (loading) {
      return (
        <div className="page">
          <div className="empty">
            <p>{i18n.t("common.loading")}</p>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="page">
          <div className="empty">
            <p className="modal-error">{error}</p>
          </div>
        </div>
      );
    }
    if (view === "tasks") {
      if (!activeProject) {
        return (
          <div className="page">
            <div className="empty">
              <h2>{i18n.t("app.noProjectsTitle")}</h2>
              <p>{i18n.t("app.noProjectsDesc")}</p>
              <button type="button" className="btn primary" onClick={() => setShowNewProject(true)}>
                {i18n.t("app.newProject")}
              </button>
            </div>
          </div>
        );
      }
      return renderTaskWorkspace();
    }
    if (view === "providers")
      return (
        <ProvidersPageLive
          providers={providersApi.providers}
          routingPolicy={providersApi.routingPolicy}
          loading={providersApi.loading}
          error={providersApi.error}
          onSelectPolicy={(p) => void providersApi.setRoutingPolicy(p)}
          onToggleProvider={(id, enabled) => void providersApi.updateProvider(id, { enabled })}
          onConfigure={setConfigureProvider}
          onValidate={providersApi.validateProvider}
          onFetchModels={providersApi.listProviderModels}
          onSetModelEnabled={async (providerId, modelId, enabled) => {
            await providersApi.setProviderModelEnabled(providerId, modelId, enabled);
            await chatModels.refresh();
          }}
          t={i18n.t}
        />
      );
    if (view === "audit") return <AuditPageLive entries={audit.entries} loading={audit.loading} />;
    if (view === "schedule")
      return (
        <SchedulePageLive
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          activeProjectId={activeProjectId}
          activeProjectName={activeProject?.name}
          tasks={scheduledApi.tasks}
          selected={scheduledApi.selected}
          runs={scheduledApi.runs}
          loading={scheduledApi.loading}
          error={scheduledApi.error}
          onRefresh={scheduledApi.refresh}
          onSelect={scheduledApi.loadTask}
          onCreate={scheduledApi.create}
          onUpdate={scheduledApi.update}
          onDelete={scheduledApi.remove}
          onRunNow={scheduledApi.runNow}
          onPause={scheduledApi.pause}
          onResume={scheduledApi.resume}
          t={t}
        />
      );
    if (view === "computer")
      return (
        <ComputerUsePage
          projectName={activeProject?.name}
          projectId={activeProjectId}
          status={computerUseApi.status}
          windows={computerUseApi.windows}
          blocklist={computerUseApi.blocklist}
          settings={computerUseApi.settings}
          screenshots={computerUseApi.screenshots}
          loading={computerUseApi.loading}
          error={computerUseApi.error}
          onRefresh={computerUseApi.refresh}
          onStart={computerUseApi.start}
          onStop={computerUseApi.stop}
          onLoadWindows={computerUseApi.loadWindows}
          onSetRetention={computerUseApi.setRetention}
          onDeleteScreenshot={computerUseApi.deleteScreenshot}
          t={t}
        />
      );
    if (view === "memory")
      return (
        <MemoryPage
          pending={memoryApi.pending}
          memories={memoryApi.memories}
          loading={memoryApi.loading}
          error={memoryApi.error}
          onApprove={memoryApi.approve}
          onReject={memoryApi.reject}
          onDelete={memoryApi.remove}
          t={t}
        />
      );
    if (view === "settings")
      return (
        <SettingsPage
          vaultStatus={providersApi.vaultStatus}
          vmStatus={vm.status}
          vmLoading={vm.loading}
          onStartVm={vm.start}
          onStopVm={vm.stop}
          browserStatus={browser.status}
          browserLoading={browser.loading}
          onStartBrowser={browser.start}
          onStopBrowser={browser.stop}
          pluginsStatus={pluginsApi.status}
          pluginsLoading={pluginsApi.loading}
          onStartPlugins={pluginsApi.start}
          onStopPlugins={pluginsApi.stop}
          onExport={providersApi.exportVault}
          onImport={providersApi.importVault}
          onFetchPricing={providersApi.fetchPricing}
          localeSettings={i18n.settings}
          locales={i18n.locales}
          onSetLocale={i18n.setLocale}
          t={i18n.t}
          packagingInfo={packaging.info}
          updateResult={packaging.update}
          updateLoading={packaging.loading}
          onCheckUpdates={packaging.checkUpdates}
          theme={theme}
          themePreference={themePreference}
          onSetTheme={setThemePreference}
          projectId={activeProjectId}
          cloudStatus={cloudApi.status}
          cloudDevices={cloudApi.devices}
          cloudSyncHelper={cloudApi.syncHelper}
          cloudUsage={cloudApi.usage}
          cloudReleaseInfo={cloudApi.releaseInfo}
          cloudLoading={cloudApi.loading}
          cloudError={cloudApi.error}
          onCloudRegister={async (email, password, displayName, serverUrl) => {
            const r = await cloudApi.register(email, password, displayName, serverUrl);
            return { recoveryKey: r.recoveryKey };
          }}
          onCloudLogin={cloudApi.login}
          onCloudLogout={cloudApi.logout}
          onCloudSetupRecovery={cloudApi.setupRecovery}
          onCloudSetSyncEnabled={cloudApi.setSyncEnabled}
          onCloudSyncNow={cloudApi.syncNow}
          onCloudCreatePairing={cloudApi.createPairing}
          onCloudRevokeDevice={cloudApi.revokeDevice}
          onCloudRemoteDispatch={cloudApi.remoteDispatch}
          onCloudInspectServer={cloudApi.inspectServer}
          onCloudStartSyncHelper={cloudApi.startSyncHelper}
          onCloudStopSyncHelper={cloudApi.stopSyncHelper}
          onCloudStartDeviceLogin={cloudApi.startDeviceLogin}
          onCloudCompleteDeviceLogin={cloudApi.completeDeviceLogin}
          bridgeStatus={bridgeApi.status}
          bridgeClients={bridgeApi.clients}
          bridgeLoading={bridgeApi.loading}
          bridgeError={bridgeApi.error}
          onBridgeRefresh={bridgeApi.refresh}
          onBridgeStart={bridgeApi.start}
          onBridgeStop={bridgeApi.stop}
          onBridgeCreatePairing={bridgeApi.createPairing}
          onBridgeRevokeClient={bridgeApi.revokeClient}
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
        />
      );
    if (view === "browser")
      return (
        <BrowserPage
          projectName={activeProject?.name}
          browserStatus={browser.status}
          browserLoading={browser.loading}
          onStartBrowser={browser.start}
          onStopBrowser={browser.stop}
          t={t}
        />
      );
    if (view === "files")
      return (
        <FilesPage
          files={files.files}
          selectedPath={files.selectedPath}
          content={files.content}
          pendingEdits={files.pendingEdits}
          loading={files.loading}
          error={files.error}
          onOpen={(p) => void files.openFile(p)}
          onSave={files.saveFile}
          onApproveEdit={(id) =>
            void files.approveEdit(id, (taskId) => {
              setView("tasks");
              setActiveTaskId(taskId);
              void tasks.loadTask(taskId);
            })
          }
          t={t}
        />
      );
    if (view === "git")
      return (
        <GitPage
          status={git.status}
          diff={git.diff}
          pendingCommits={git.pendingCommits}
          commitMessage={git.commitMessage}
          loading={git.loading}
          error={git.error}
          folderPath={activeProject?.folderPath}
          selectedFile={git.selectedFile}
          onCommitMessageChange={git.setCommitMessage}
          onProposeCommit={() => void git.proposeCommit()}
          onApproveCommit={(id) => void git.approveCommit(id)}
          onSelectFile={(path) => void git.selectFile(path)}
          onInitRepo={() => void git.initRepo()}
          t={t}
        />
      );
    if (view === "terminal")
      return (
        <TerminalPage
          projectId={activeProjectId}
          folderPath={activeProject?.folderPath ?? null}
          t={t}
        />
      );
    if (view === "plugins")
      return (
        <PluginsPage
          projectId={activeProjectId}
          status={pluginsApi.status}
          plugins={pluginsApi.plugins}
          mcpServers={pluginsApi.mcpServers}
          marketplace={pluginsApi.marketplace}
          loading={pluginsApi.loading}
          error={pluginsApi.error}
          onStart={pluginsApi.start}
          onStop={pluginsApi.stop}
          onInstallLocal={pluginsApi.installLocal}
          onUninstall={pluginsApi.uninstall}
          onSetPluginEnabled={pluginsApi.setPluginEnabled}
          onAddMcpServer={pluginsApi.addMcpServer}
          onDeleteMcpServer={pluginsApi.deleteMcpServer}
          onSetMcpEnabled={pluginsApi.setMcpEnabled}
          onSyncMarketplace={pluginsApi.syncMarketplace}
          t={t}
          locale={i18n.locale}
          cloudSignedIn={cloudApi.status?.signedIn}
          onGoToCloudLogin={() => {
            setView("settings");
            setSettingsTab("cloud");
          }}
        />
      );
    return null;
  };

  const configured = configureProvider
    ? providersApi.providers.find((p) => p.providerId === configureProvider)
    : null;
  const meta = configureProvider
    ? PROVIDER_META[configureProvider as keyof typeof PROVIDER_META]
    : null;

  return (
    <div className="os-stage">
      <div className="os-scaler">
        <div className="os-window">
          <TitleBar
            crumb={crumb}
            brandName={i18n.t("app.name")}
            theme={theme}
            dir={i18n.settings?.locale === "ar" || i18n.settings?.locale === "fa" ? "rtl" : "ltr"}
            onToggleTheme={handleToggleTheme}
            onToggleCtx={() => setShowCtx((s) => !s)}
            onToggleDir={() => {
              const isRtl = i18n.settings?.locale === "ar" || i18n.settings?.locale === "fa";
              void i18n.setLocale({ locale: isRtl ? "en" : "ar", useSystemLocale: false });
            }}
          />
          <div className="os-body">
            <NavRail
              active={view}
              onNav={setView}
              items={navItems}
              settingsLabel={i18n.t("nav.settings")}
              accountTitle={t("sidebar.account")}
              brandLogoSrc="/aura-logo.png"
            />
            {view === "tasks" && (
              <Sidebar
                projects={projects}
                activeProjectId={activeProjectId}
                tasks={sidebarTasks}
                activeTaskId={activeTaskId}
                search={search}
                onSearchChange={setSearch}
                onSelectProject={(id) => {
                  setActiveProjectId(id);
                  setActiveTaskId(null);
                  tasks.setActiveTask(null);
                }}
                onSelectTask={(id) => setActiveTaskId(id)}
                onNewProject={() => setShowNewProject(true)}
                onNewTask={handleNewTaskWorkspace}
                labels={{
                  projects: i18n.t("sidebar.projects"),
                  search: i18n.t("sidebar.search"),
                  tasks: i18n.t("sidebar.tasks"),
                  noTasks: i18n.t("sidebar.noTasks"),
                  newProjectTitle: t("sidebar.newProject"),
                  newTaskTitle: t("sidebar.newTask"),
                }}
              />
            )}
            <div className="main">{renderMain()}</div>
            {view === "tasks" && showCtx && (
              <div className="right-panel-col" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "300px", height: "100%", overflowY: "auto", borderLeft: "1px solid var(--border-1)", padding: "12px" }}>
                <ContextPanel
                  cost={cost}
                  routingPolicy={providersApi.routingPolicy}
                  sidecarRunning={agent.sidecar.running}
                  vmRunning={vm.status?.running}
                  vmBackend={vm.status?.backendLabel}
                  browserRunning={browser.status?.running}
                  browserBackend={browser.status?.backendLabel}
                  pluginsRunning={pluginsApi.status?.running}
                  pluginsToolCount={pluginsApi.status?.toolCount}
                  cloudSyncEnabled={cloudApi.status?.syncEnabled}
                  cloudSyncRunning={cloudApi.syncHelper?.running}
                  cloudSignedIn={cloudApi.status?.signedIn}
                  labels={contextPanelLabels}
                />
                {activeTaskId && activeProjectId && (
                  <TaskTimeline projectId={activeProjectId} taskId={activeTaskId} isArabic={i18n.settings?.locale === "ar"} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <NewProjectDialog
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={async (name, folder, instructions) => {
          await createProject(name, folder, instructions);
        }}
        onPickFolder={pickFolder}
      />
      <ProviderKeyDialog
        open={Boolean(configureProvider)}
        providerId={configureProvider}
        displayName={configured?.displayName}
        isLocal={meta?.local}
        existingBaseUrl={configured?.baseUrl}
        existingAuthMode={configured?.authMode}
        onClose={() => setConfigureProvider(null)}
        t={i18n.t}
        locale={i18n.locale}
        onSave={async (apiKey, baseUrl, authMode) => {
          if (!configureProvider) return;
          await providersApi.setProviderSecret(configureProvider, apiKey, baseUrl, authMode);
        }}
        onAfterSave={async (providerId) => {
          try {
            const result = await providersApi.validateProvider(providerId);
            if (!result.valid) return result.message ?? null;
            const models = await providersApi.listProviderModels(providerId);
            return i18n.t("provider.key.fetchingModels", { count: String(models.length) });
          } catch (e) {
            return String(e);
          }
        }}
        onClear={async () => {
          if (!configureProvider) return;
          await providersApi.clearProviderSecret(configureProvider);
        }}
      />
      <FallbackApprovalDialog
        open={Boolean(fallbackApproval)}
        fromProvider={fallbackApproval?.from}
        toProvider={fallbackApproval?.to ?? ""}
        modelId={fallbackApproval?.model ?? ""}
        reason={fallbackApproval?.reason ?? ""}
        onDeny={() => setFallbackApproval(null)}
        onApprove={() => void handleApproveFallback()}
        t={t}
      />
    </div>
  );
}
