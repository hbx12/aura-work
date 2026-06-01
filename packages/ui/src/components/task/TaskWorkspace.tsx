import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { MarkdownText } from "../MarkdownText";

export function StreamingMsg({
  who,
  role,
  children,
  agent,
  streaming = false,
  liveText,
}: {
  who: string;
  role?: string;
  children: ReactNode;
  agent?: boolean;
  streaming?: boolean;
  liveText?: string | null;
}) {
  const text = typeof children === "string" ? children : "";
  const [displayed, setDisplayed] = useState(text);
  const prevText = useRef(text);

  useEffect(() => {
    if (!streaming || typeof children !== "string") {
      setDisplayed(text);
      prevText.current = text;
      return;
    }
    if (text === prevText.current) return;
    prevText.current = text;
    setDisplayed("");
    let index = 0;
    const tick = () => {
      index += Math.max(1, Math.ceil(text.length / 48));
      setDisplayed(text.slice(0, index));
      if (index < text.length) {
        window.requestAnimationFrame(tick);
      }
    };
    window.requestAnimationFrame(tick);
  }, [text, streaming, children]);

  const body =
    liveText && streaming
      ? liveText.replace(/```[\s\S]*$/g, "").trim() || liveText.slice(-280)
      : typeof children === "string"
        ? displayed
        : children;

  return (
    <div className={`msg fade${streaming && liveText ? " msg-live" : ""}`}>
      <div className={`av ${agent ? "agent" : "user"}`}>
        {agent ? <Icon name="bot" size={16} /> : "A"}
      </div>
      <div className="mbody">
        <div className="who">
          {who}
          {role && <span className="role">· {role}</span>}
        </div>
        <div className="text">
          {typeof body === "string" ? (
            <>
              <MarkdownText text={body} />
              {streaming && liveText && <span className="stream-cursor">▍</span>}
            </>
          ) : (
            body
          )}
        </div>
      </div>
    </div>
  );
}

export function Msg({
  who,
  role,
  children,
  agent,
}: {
  who: string;
  role?: string;
  children: ReactNode;
  agent?: boolean;
}) {
  return (
    <div className="msg fade">
      <div className={`av ${agent ? "agent" : "user"}`}>
        {agent ? <Icon name="bot" size={16} /> : "A"}
      </div>
      <div className="mbody">
        <div className="who">
          {who}
          {role && <span className="role">· {role}</span>}
        </div>
        <div className="text">
          {typeof children === "string" ? <MarkdownText text={children} /> : children}
        </div>
      </div>
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  onRunTask,
  mode,
  onToggleMode,
  disabled,
  showRunTask = true,
  models = [],
  selectedModel = "auto",
  onModelChange,
  labels = {
    placeholder: "Ask Aura anything…",
    send: "Send",
    runTask: "Run task",
    autoModel: "Auto (routing)",
    modeAsk: "Ask-first",
    modeAct: "Act without asking",
    running: "Thinking…",
  },
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onRunTask?: () => void;
  mode: "ask" | "act";
  onToggleMode: () => void;
  disabled?: boolean;
  showRunTask?: boolean;
  models?: { providerId: string; modelId: string; label: string }[];
  selectedModel?: string;
  onModelChange?: (v: string) => void;
  labels?: {
    placeholder: string;
    send: string;
    runTask: string;
    autoModel: string;
    modeAsk: string;
    modeAct: string;
    running: string;
  };
}) {
  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          rows={2}
          placeholder={labels.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
          }}
          disabled={disabled}
        />
        <div className="crow">
          {onModelChange && (
            <select
              className="composer-model-select"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled}
              title={labels.autoModel}
            >
              <option value="auto">{labels.autoModel}</option>
              {models.map((m) => (
                <option key={`${m.providerId}:${m.modelId}`} value={`${m.providerId}:${m.modelId}`}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="chip-btn" onClick={onToggleMode}>
            <Icon name={mode === "ask" ? "shield-check" : "bot"} size={14} />
            {mode === "ask" ? labels.modeAsk : labels.modeAct}
          </button>
          <div className="cspacer" />
          {showRunTask && onRunTask && mode === "ask" && (
            <button
              type="button"
              className="btn sm"
              onClick={onRunTask}
              disabled={disabled || !value.trim()}
            >
              <Icon name="list-checks" size={14} />
              {labels.runTask}
            </button>
          )}
          <button type="button" className="btn primary sm" onClick={onSend} disabled={disabled || !value.trim()}>
            <Icon name="arrow-up" size={14} />
            {disabled ? labels.running : mode === "act" ? labels.runTask : labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}

const CONTEXT_PANEL_LABELS = {
  sidecar: "Agent sidecar",
  sidecarReady: "Sidecar ready · v1.0.0",
  sidecarOffline: "Sidecar offline",
  linuxWorkspace: "Linux workspace",
  vmRunning: "VM running",
  vmOffline: "VM helper offline",
  browserHelper: "Browser helper",
  browserRunning: "Browser running",
  browserOffline: "Browser helper offline",
  pluginsHelper: "Plugins helper",
  toolsAvailable: "{count} tool(s) available",
  pluginsOffline: "Plugins helper offline",
  auraCloud: "Aura Cloud",
  notSignedIn: "Not signed in",
  syncActive: "E2EE sync active",
  syncOffline: "Sync helper offline",
  syncDisabled: "Sync disabled",
  usage: "Usage",
};

export function ContextPanel({
  cost,
  routingPolicy,
  sidecarRunning,
  vmRunning,
  vmBackend,
  browserRunning,
  browserBackend,
  pluginsRunning,
  pluginsToolCount,
  cloudSyncEnabled,
  cloudSyncRunning,
  cloudSignedIn,
  labels: labelOverrides,
}: {
  cost: { usd: string; tok: string; model: string };
  routingPolicy?: string;
  sidecarRunning?: boolean;
  vmRunning?: boolean;
  vmBackend?: string;
  browserRunning?: boolean;
  browserBackend?: string;
  pluginsRunning?: boolean;
  pluginsToolCount?: number;
  cloudSyncEnabled?: boolean;
  cloudSyncRunning?: boolean;
  cloudSignedIn?: boolean;
  labels?: Partial<typeof CONTEXT_PANEL_LABELS>;
}) {
  const labels = { ...CONTEXT_PANEL_LABELS, ...labelOverrides };
  const toolsAvailable = labels.toolsAvailable.replace(
    "{count}",
    String(pluginsToolCount ?? 0),
  );

  return (
    <div className="ctx">
      <div className="ctx-scroll">
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="cpu" size={13} />
            {labels.sidecar}
          </div>
          <div className="statusline">
            <span className={`pulse${sidecarRunning ? "" : " off"}`} />
            {sidecarRunning ? labels.sidecarReady : labels.sidecarOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="terminal" size={13} />
            {labels.linuxWorkspace}
          </div>
          <div className="statusline">
            <span className={`pulse${vmRunning ? "" : " off"}`} />
            {vmRunning ? (vmBackend ?? labels.vmRunning) : labels.vmOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="globe" size={13} />
            {labels.browserHelper}
          </div>
          <div className="statusline">
            <span className={`pulse${browserRunning ? "" : " off"}`} />
            {browserRunning ? (browserBackend ?? labels.browserRunning) : labels.browserOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="puzzle" size={13} />
            {labels.pluginsHelper}
          </div>
          <div className="statusline">
            <span className={`pulse${pluginsRunning ? "" : " off"}`} />
            {pluginsRunning ? toolsAvailable : labels.pluginsOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="cloud" size={13} />
            {labels.auraCloud}
          </div>
          <div className="statusline">
            <span className={`pulse${cloudSyncRunning ? "" : " off"}`} />
            {!cloudSignedIn
              ? labels.notSignedIn
              : cloudSyncEnabled
                ? cloudSyncRunning
                  ? labels.syncActive
                  : labels.syncOffline
                : labels.syncDisabled}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="database" size={13} />
            {labels.usage}
          </div>
          <div className="cost-big">{cost.usd}</div>
          <div className="cost-sub">
            {cost.tok} · {cost.model} · {routingPolicy ?? "quality-first"}
          </div>
        </div>
      </div>
    </div>
  );
}

const TASK_WELCOME_LABELS = {
  titlePhase11:
    "Task engine + VM + Browser + Computer Use + Plugins + Cloud + Schedules + Extensions + i18n ready",
  titlePhase10:
    "Task engine + VM + Browser + Computer Use + Plugins + Cloud + Schedules + Extensions ready",
  titlePhase9:
    "Task engine + VM + Browser + Plugins + Cloud + Schedules + Extensions ready",
  titlePhase8: "Task engine + VM + Browser + Plugins + Cloud + Schedules ready",
  titlePhase7: "Task engine + VM + Browser + Plugins + Cloud ready",
  titlePhase6: "Task engine + VM + Browser + Plugins ready",
  titlePhase5: "Task engine + VM + Browser ready",
  titlePhase4: "Task engine + VM ready",
  titlePhase3: "Task engine ready",
  titlePhase2: "Test chat ready",
  titlePhase1: "No tasks yet",
  descPhase11:
    "Describe a task for project {projectName}. Aura plans steps in 20 languages, ships signed installers with bundled Node + VM image verification, exposes a CLI companion via the local bridge, and supports experimental computer use, Chrome/Office extensions, scheduled tasks, E2EE cloud sync, plugins/MCP, web browsing, and isolated shell. API keys never leave this device.",
  descPhase10:
    "Describe a task for project {projectName}. Aura plans steps, can use experimental computer use (per-app desktop approval), connects Chrome and Office via the local bridge, runs scheduled tasks, syncs E2EE via Aura Cloud, uses plugins/MCP, browses the web, and runs shell in an isolated workspace. API keys never leave this device.",
  descPhase9:
    "Describe a task for project {projectName}. Aura plans steps, connects Chrome and Office via the local bridge (with per-task page read approval), runs scheduled tasks, syncs E2EE via Aura Cloud, uses plugins/MCP, browses the web, and runs shell in an isolated workspace. API keys never leave this device.",
  descPhase8:
    "Describe a task for project {projectName}. Aura plans steps, runs scheduled tasks with pre-approved permission profiles (while the app is open), syncs E2EE via Aura Cloud, uses plugins/MCP, browses the web, and runs shell in an isolated workspace. API keys never leave this device.",
  descPhase7:
    "Describe a task for project {projectName}. Aura plans steps, syncs task history E2EE via Aura Cloud (optional), uses plugins/MCP tools, browses the web with source citations, runs shell in an isolated Linux workspace, and uses file tools. API keys never leave this device.",
  descPhase6:
    "Describe a task for project {projectName}. Aura plans steps, uses installed plugins and MCP tools (with permission prompts), browses the web with source citations, runs shell commands in an isolated Linux workspace, and uses file tools.",
  descPhase5:
    "Describe a task for project {projectName}. Aura plans steps, browses the web with permission prompts and source citations, runs shell commands in an isolated Linux workspace, uses file tools, and shows streamed output in the task log.",
  descPhase4:
    "Describe a task for project {projectName}. Aura plans steps, runs shell commands in an isolated Linux workspace (WSL or sandbox), uses file tools with permission prompts, and shows streamed output in the task log.",
  descPhase3:
    "Describe a task for project {projectName}. Aura will plan steps, use file tools with permission prompts, and show progress. Approve the plan before execution in Ask-first mode.",
  descPhase2: "Send a message to test provider routing in project {projectName}.",
  descPhase1: "Describe what you want Aura to do in project {projectName}.",
};

function welcomeTitle(phase: number, labels: typeof TASK_WELCOME_LABELS) {
  if (phase >= 11) return labels.titlePhase11;
  if (phase >= 10) return labels.titlePhase10;
  if (phase >= 9) return labels.titlePhase9;
  if (phase >= 8) return labels.titlePhase8;
  if (phase >= 7) return labels.titlePhase7;
  if (phase >= 6) return labels.titlePhase6;
  if (phase >= 5) return labels.titlePhase5;
  if (phase >= 4) return labels.titlePhase4;
  if (phase >= 3) return labels.titlePhase3;
  if (phase >= 2) return labels.titlePhase2;
  return labels.titlePhase1;
}

function welcomeDescription(phase: number, projectName: string, labels: typeof TASK_WELCOME_LABELS) {
  const key =
    phase >= 11
      ? "descPhase11"
      : phase >= 10
        ? "descPhase10"
        : phase >= 9
          ? "descPhase9"
          : phase >= 8
            ? "descPhase8"
            : phase >= 7
              ? "descPhase7"
              : phase >= 6
                ? "descPhase6"
                : phase >= 5
                  ? "descPhase5"
                  : phase >= 4
                    ? "descPhase4"
                    : phase >= 3
                      ? "descPhase3"
                      : phase >= 2
                        ? "descPhase2"
                        : "descPhase1";
  const text = labels[key as keyof typeof TASK_WELCOME_LABELS];
  const parts = text.split("{projectName}");
  if (parts.length === 1) return text;
  return (
    <>
      {parts[0]}
      <strong>{projectName}</strong>
      {parts[1]}
    </>
  );
}

export function TaskWelcome({
  projectName,
  phase = 1,
  labels: labelOverrides,
}: {
  projectName: string;
  phase?: number;
  labels?: Partial<typeof TASK_WELCOME_LABELS>;
}) {
  const labels = { ...TASK_WELCOME_LABELS, ...labelOverrides };

  return (
    <div className="empty-task">
      <div className="et-inner">
        <div className="et-mark">
          <div className="ring" />
          <div className="dot" />
        </div>
        <h1>{welcomeTitle(phase, labels)}</h1>
        <p className="et-sub">{welcomeDescription(phase, projectName, labels)}</p>
      </div>
    </div>
  );
}

const PLAN_BLOCK_LABELS = {
  collapsed: "Plan · {count} steps",
  approved: "Approved",
  proposedPlan: "Proposed plan",
  askFirst: "Ask-first",
  approveRun: "Approve & run",
};

export function PlanBlock({
  steps,
  onApprove,
  approved,
  collapsed,
  onExpand,
  labels: labelOverrides,
}: {
  steps: { title: string; subtitle?: string | null; role?: string | null }[];
  onApprove?: () => void;
  approved?: boolean;
  collapsed?: boolean;
  onExpand?: () => void;
  labels?: Partial<typeof PLAN_BLOCK_LABELS>;
}) {
  const labels = { ...PLAN_BLOCK_LABELS, ...labelOverrides };

  if (collapsed) {
    return (
      <button type="button" className="plan-collapsed fade" onClick={onExpand}>
        <Icon name="list-checks" size={15} />
        <span className="pc-t">{labels.collapsed.replace("{count}", String(steps.length))}</span>
        <span className="badge-soft">{labels.approved}</span>
        <span className="pc-chev">
          <Icon name="arrow-right" size={14} />
        </span>
      </button>
    );
  }
  return (
    <div className="plan fade">
      <div className="ph">
        <Icon name="list-checks" size={17} />
        <span className="ttl">{labels.proposedPlan}</span>
        <span className="badge-soft">{approved ? labels.approved : labels.askFirst}</span>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            <span className="num">{i + 1}</span>
            <span className="st">
              {s.title}
              {s.subtitle && <div className="sub">{s.subtitle}</div>}
              {s.role && !s.subtitle && <div className="sub">{s.role}</div>}
            </span>
          </li>
        ))}
      </ol>
      {!approved && onApprove && (
        <div className="pf">
          <button type="button" className="btn primary sm" onClick={onApprove}>
            <Icon name="check" size={14} />
            {labels.approveRun}
          </button>
        </div>
      )}
    </div>
  );
}

function StepNode({ status }: { status: string }) {
  if (status === "done") {
    return (
      <div className="node done">
        <Icon name="check" size={12} />
      </div>
    );
  }
  if (status === "running" || status === "run") {
    return (
      <div className="node run">
        <Icon name="loader" size={12} className="spin" />
      </div>
    );
  }
  if (status === "block") {
    return (
      <div className="node block">
        <Icon name="alert-triangle" size={12} />
      </div>
    );
  }
  return <div className="node pend" />;
}

export function Steps({
  items,
}: {
  items: {
    title: string;
    role?: string | null;
    status: string;
    tool?: string | null;
    toolOk?: boolean | null;
    output?: string | null;
  }[];
}) {
  if (!items.length) return null;
  return (
    <div className="steps fade">
      {items.map((s, i) => (
        <div key={i} className={`step${s.status === "pend" ? " pending" : ""}`}>
          <div className="rail">
            <StepNode status={s.status} />
            {i < items.length - 1 && <div className="line" />}
          </div>
          <div className="sbody">
            <div className="stitle">
              {s.title}
              {s.role && <span className="role">· {s.role}</span>}
            </div>
            {s.tool && (
              <div className="tool">
                <Icon name="terminal" size={13} />
                {s.tool}
                {s.toolOk && (
                  <span className="ok">
                    <Icon name="check" size={13} />
                  </span>
                )}
              </div>
            )}
            {s.output && <div className="term">{s.output}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const APPROVAL_LABELS = {
  highRisk: "High risk",
  needsApproval: "Needs approval",
  allowOnce: "Allow once",
  allowAlways: "Allow always (this project)",
  deny: "Deny",
  denied: "Denied",
  allowedAlways: "Allowed — always for this project",
  allowedOnce: "Allowed once",
  recordedAudit: "Recorded in audit log",
};

export function Approval({
  data,
  onDecide,
  decided,
  labels: labelOverrides,
}: {
  data: {
    title: string;
    desc: string;
    risk?: string;
    icon?: string;
  };
  onDecide?: (d: string) => void;
  decided?: string | null;
  labels?: Partial<typeof APPROVAL_LABELS>;
}) {
  const labels = { ...APPROVAL_LABELS, ...labelOverrides };
  const high = data.risk === "high" || data.risk === "critical";
  return (
    <div className={`approval fade${high ? " risk-high" : ""}`}>
      <div className="at">
        <div className="aic">
          <Icon name={data.icon ?? "alert-triangle"} size={18} />
        </div>
        <div>
          <div className="ah">
            {data.title}
            <span className="risk">{high ? labels.highRisk : labels.needsApproval}</span>
          </div>
          <div className="adesc">{data.desc}</div>
        </div>
      </div>
      {!decided && onDecide ? (
        <div className="acts">
          <button type="button" className="btn primary sm" onClick={() => onDecide("allow-once")}>
            {labels.allowOnce}
          </button>
          <button type="button" className="btn secondary sm" onClick={() => onDecide("allow-always-project")}>
            {labels.allowAlways}
          </button>
          <div className="cspacer" />
          <button type="button" className="btn danger sm" onClick={() => onDecide("deny")}>
            {labels.deny}
          </button>
        </div>
      ) : decided ? (
        <div className="acts">
          <span
            className="badge-soft"
            style={{
              color: decided === "deny" ? "var(--danger)" : "var(--success)",
              background: decided === "deny" ? "var(--danger-subtle)" : "var(--success-subtle)",
            }}
          >
            {decided === "deny"
              ? labels.denied
              : decided === "allow-always-project"
                ? labels.allowedAlways
                : labels.allowedOnce}
          </span>
          <span style={{ font: "var(--text-caption)", color: "var(--fg-3)", marginInlineStart: "auto" }}>
            {labels.recordedAudit}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const SUMMARY_LABELS = {
  taskComplete: "Task complete",
};

export function Summary({
  data,
  labels: labelOverrides,
}: {
  data: { points: string[]; files: { path: string; add?: number; del?: number }[] };
  labels?: Partial<typeof SUMMARY_LABELS>;
}) {
  const labels = { ...SUMMARY_LABELS, ...labelOverrides };

  return (
    <div className="summary fade">
      <div className="sh">
        <Icon name="check" size={17} />
        {labels.taskComplete}
      </div>
      <ul>
        {data.points.map((p, i) => (
          <li key={i}>
            <Icon name="check" size={14} />
            <MarkdownText text={p} />
          </li>
        ))}
      </ul>
      {data.files.length > 0 && (
        <div className="files">
          {data.files.map((f, i) => (
            <div key={i} className="frow">
              <Icon name="file-diff" size={13} />
              <span className="fp">{f.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const THINKING_LABELS = {
  working: "Aura is working…",
};

export function Thinking({
  label,
  labels: labelOverrides,
}: {
  label?: string;
  labels?: Partial<typeof THINKING_LABELS>;
}) {
  const labels = { ...THINKING_LABELS, ...labelOverrides };

  return (
    <div className="msg fade">
      <div className="av agent">
        <Icon name="bot" size={16} />
      </div>
      <div className="mbody" style={{ paddingTop: 6 }}>
        <div className="thinking">
          <span />
          <span />
          <span />
          <em>{label ?? labels.working}</em>
        </div>
      </div>
    </div>
  );
}
