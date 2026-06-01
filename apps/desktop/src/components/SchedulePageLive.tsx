import { useEffect, useMemo, useState } from "react";
import { Icon } from "@aura-os/ui";
import {
  PERMISSION_PROFILE_PRESETS,
  type PermissionProfileGrant,
  type ScheduledCadence,
  type ScheduledTaskListItem,
  type ScheduledTaskRecord,
  type ScheduledTaskRun,
} from "@aura-os/shared";

interface ProjectOption {
  id: string;
  name: string;
}

interface SchedulePageLiveProps {
  projects: ProjectOption[];
  activeProjectId: string | null;
  activeProjectName?: string;
  tasks: ScheduledTaskListItem[];
  selected: ScheduledTaskRecord | null;
  runs: ScheduledTaskRun[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => Promise<void>;
  onSelect: (id: string) => Promise<unknown>;
  onCreate: (input: {
    name: string;
    description?: string;
    prompt: string;
    projectId: string;
    cadence: ScheduledCadence;
    permissionProfile: PermissionProfileGrant[];
  }) => Promise<unknown>;
  onUpdate: (input: {
    id: string;
    name?: string;
    description?: string;
    prompt?: string;
    cadence?: ScheduledCadence;
    permissionProfile?: PermissionProfileGrant[];
    paused?: boolean;
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onRunNow: (id: string) => Promise<unknown>;
  onPause: (id: string) => Promise<unknown>;
  onResume: (id: string) => Promise<unknown>;
  t?: (key: string, params?: Record<string, string>) => string;
}

const CADENCE_OPTIONS: { id: ScheduledCadence["kind"]; labelKey: string }[] = [
  { id: "manual", labelKey: "schedule.manual" },
  { id: "hourly", labelKey: "schedule.hourly" },
  { id: "daily", labelKey: "schedule.daily" },
  { id: "weekdays", labelKey: "schedule.weekdays" },
  { id: "weekly", labelKey: "schedule.weekly" },
  { id: "custom", labelKey: "schedule.custom" },
];

function formatCadence(cadence: ScheduledCadence, t: (k: string) => string): string {
  const m = String(cadence.minute ?? 0).padStart(2, "0");
  const h = String(cadence.hour ?? 9).padStart(2, "0");
  switch (cadence.kind) {
    case "hourly":
      return `${t("schedule.hourly")} · :${m}`;
    case "daily":
      return `${t("schedule.daily")} · ${h}:${m}`;
    case "weekdays":
      return `${t("schedule.weekdays")} · ${h}:${m}`;
    case "weekly": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const d = days[cadence.dayOfWeek ?? 1] ?? "Mon";
      return `${t("schedule.weekly")} · ${d} ${h}:${m}`;
    }
    case "custom":
      return `Cron · ${cadence.cron ?? "0 9 * * *"}`;
    default:
      return t("schedule.manual");
  }
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SchedulePageLive({
  projects,
  activeProjectId,
  activeProjectName,
  tasks,
  selected,
  runs,
  loading,
  error,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onRunNow,
  onPause,
  onResume,
  t = (k) => k,
}: SchedulePageLiveProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState(activeProjectId ?? projects[0]?.id ?? "");
  const [cadenceKind, setCadenceKind] = useState<ScheduledCadence["kind"]>("daily");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [cron, setCron] = useState("0 9 * * 1");
  const [presetId, setPresetId] = useState("read-only");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeProjectId) setProjectId(activeProjectId);
  }, [activeProjectId]);

  const cadence = useMemo<ScheduledCadence>(
    () => ({
      kind: cadenceKind,
      hour,
      minute,
      dayOfWeek,
      cron: cadenceKind === "custom" ? cron : null,
    }),
    [cadenceKind, hour, minute, dayOfWeek, cron],
  );

  const permissionProfile = useMemo(
    () => PERMISSION_PROFILE_PRESETS.find((p) => p.id === presetId)?.grants ?? [],
    [presetId],
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrompt("");
    setCadenceKind("daily");
    setPresetId("read-only");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !prompt.trim() || !projectId) return;
    setMessage(null);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        prompt: prompt.trim(),
        projectId,
        cadence,
        permissionProfile,
      });
      resetForm();
      setMessage(t("schedule.created"));
    } catch (e) {
      setMessage(String(e));
    }
  };

  const handleTogglePause = async (task: ScheduledTaskListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessage(null);
    try {
      if (task.paused) {
        await onResume(task.id);
        setMessage(t("schedule.resumed", { name: task.name }));
      } else {
        await onPause(task.id);
        setMessage(t("schedule.paused", { name: task.name }));
      }
    } catch (err) {
      setMessage(String(err));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("nav.schedule")}</h1>
            <p>{t("schedule.subtitle")}</p>
          </div>
          <div className="ph-actions">
            <button type="button" className="btn secondary sm" onClick={() => setShowForm((s) => !s)}>
              <Icon name="plus" size={14} />
              {showForm ? t("common.cancel") : t("schedule.new")}
            </button>
          </div>
        </div>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {(error || message) && (
            <div className={`banner${error ? " err" : ""}`}>{error ?? message}</div>
          )}

          {showForm && (
            <div className="section">
              <div className="panel cloud-form">
                <div className="form-grid">
                  <label>
                    {t("schedule.name")}
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label>
                    {t("schedule.project")}
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  {t("schedule.prompt")}
                  <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                </label>
                <div className="form-grid">
                  <label>
                    {t("schedule.cadence")}
                    <select
                      value={cadenceKind}
                      onChange={(e) => setCadenceKind(e.target.value as ScheduledCadence["kind"])}
                    >
                      {CADENCE_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {t(c.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("schedule.permissions")}
                    <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                      {PERMISSION_PROFILE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {cadenceKind !== "manual" && cadenceKind !== "custom" && (
                  <div className="form-grid">
                    {cadenceKind === "weekly" && (
                      <label>
                        Day
                        <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                            <option key={d} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {cadenceKind !== "hourly" && (
                      <label>
                        Hour
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={hour}
                          onChange={(e) => setHour(Number(e.target.value))}
                        />
                      </label>
                    )}
                    <label>
                      Minute
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={minute}
                        onChange={(e) => setMinute(Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}
                {cadenceKind === "custom" && (
                  <label>
                    Cron
                    <input value={cron} onChange={(e) => setCron(e.target.value)} />
                  </label>
                )}
                <div className="form-actions">
                  <button type="button" className="btn primary sm" disabled={loading} onClick={() => void handleCreate()}>
                    {t("schedule.create")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="section">
            <span className="sec-label">
              {t("schedule.list")}
              {activeProjectName ? ` · ${activeProjectName}` : ""}
            </span>
            <div className="panel">
              {tasks.length === 0 ? (
                <div className="empty" style={{ padding: 28 }}>
                  <div className="em-ic">
                    <Icon name="clock" size={26} />
                  </div>
                  <p>{t("schedule.empty")}</p>
                </div>
              ) : (
                tasks.map((s) => (
                  <div
                    key={s.id}
                    className={`panel-row${selected?.id === s.id ? " active" : ""}`}
                    onClick={() => void onSelect(s.id)}
                    onKeyDown={(e) => e.key === "Enter" && void onSelect(s.id)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className="prov-logo"
                      style={{
                        background: !s.paused ? "var(--accent)" : "var(--bg-3)",
                        color: !s.paused ? "#fff" : "var(--fg-3)",
                      }}
                    >
                      <Icon name="clock" size={17} />
                    </div>
                    <div className="prov-meta">
                      <div className="prov-name">{s.name}</div>
                      <div className="prov-sub">
                        {s.cadenceKind} · {t("schedule.next")} {formatWhen(s.nextRunAt)}
                      </div>
                    </div>
                    <div
                      className={`toggle${!s.paused ? " on" : ""}`}
                      onClick={(e) => void handleTogglePause(s, e)}
                      onKeyDown={(e) => e.key === "Enter" && void handleTogglePause(s, e as unknown as React.MouseEvent)}
                      role="button"
                      tabIndex={0}
                    >
                      <i />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selected && (
            <>
              <div className="section">
                <span className="sec-label">{t("schedule.details")}</span>
                <div className="panel">
                  <div className="panel-row stack">
                    <div className="prov-name">{selected.name}</div>
                    <div className="prov-sub">{selected.description ?? t("schedule.noDescription")}</div>
                    <div className="prov-sub">{formatCadence(selected.cadence, t)}</div>
                    <div className="prov-sub">
                      {t("schedule.lastRun")}: {formatWhen(selected.lastRunAt)} · {t("schedule.next")}:{" "}
                      {formatWhen(selected.nextRunAt)}
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn primary sm" disabled={loading} onClick={() => void onRunNow(selected.id)}>
                        {t("schedule.runNow")}
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={loading}
                        onClick={() => void onUpdate({ id: selected.id, paused: !selected.paused })}
                      >
                        {selected.paused ? t("schedule.resume") : t("schedule.pause")}
                      </button>
                      <button
                        type="button"
                        className="btn sm danger"
                        disabled={loading}
                        onClick={() => {
                          if (confirm(t("schedule.deleteConfirm", { name: selected.name }))) void onDelete(selected.id);
                        }}
                      >
                        {t("schedule.delete")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section">
                <span className="sec-label">{t("schedule.history")}</span>
                <div className="panel">
                  {runs.length === 0 ? (
                    <div className="panel-row muted">{t("schedule.noRuns")}</div>
                  ) : (
                    runs.map((r) => (
                      <div key={r.id} className="panel-row">
                        <div className="prov-meta">
                          <div className="prov-name">{r.status}</div>
                          <div className="prov-sub">
                            {formatWhen(r.startedAt)}
                            {r.error ? ` · ${r.error}` : ""}
                          </div>
                        </div>
                        <span className={`res-pill ${r.status === "completed" ? "ok" : "warn"}`}>{r.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
