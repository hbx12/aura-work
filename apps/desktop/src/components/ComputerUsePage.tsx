import { useMemo, useState } from "react";
import { Icon } from "@aura-os/ui";
import { COMPUTER_USE_HELPER_URL } from "@aura-os/shared";
import type {
  ComputerUseBlocklistEntry,
  ComputerUseScreenshotRecord,
  ComputerUseStatus,
  DesktopWindow,
  ProjectComputerSettings,
  ScreenshotRetention,
} from "@aura-os/shared";

interface ComputerUsePageProps {
  projectName?: string;
  projectId?: string | null;
  status: ComputerUseStatus | null;
  windows: DesktopWindow[];
  blocklist: ComputerUseBlocklistEntry[];
  settings: ProjectComputerSettings | null;
  screenshots: ComputerUseScreenshotRecord[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => Promise<void>;
  onStart: () => Promise<unknown>;
  onStop: () => Promise<unknown>;
  onLoadWindows: () => Promise<unknown>;
  onSetRetention: (retention: ScreenshotRetention) => Promise<unknown>;
  onDeleteScreenshot: (id: string) => Promise<void>;
  t?: (key: string, params?: Record<string, string>) => string;
}

const BLOCKED_ICONS: Record<string, string> = {
  banking: "lock",
  password: "key-round",
  health: "shield",
};

export function ComputerUsePage({
  projectName,
  status,
  windows,
  blocklist,
  settings,
  screenshots,
  loading,
  error,
  onRefresh,
  onStart,
  onStop,
  onLoadWindows,
  onSetRetention,
  onDeleteScreenshot,
  t = (k) => k,
}: ComputerUsePageProps) {
  const [message, setMessage] = useState<string | null>(null);
  const systemEntries = useMemo(() => blocklist.filter((e) => !e.userEditable), [blocklist]);
  const retainOn = settings?.screenshotRetention !== "none";

  const groupedBlocked = useMemo(() => {
    const groups = new Map<string, ComputerUseBlocklistEntry[]>();
    for (const e of systemEntries) {
      const key = e.category || "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries()).map(([category, entries]) => ({
      category,
      icon: BLOCKED_ICONS[category.toLowerCase()] ?? "shield",
      name: category.charAt(0).toUpperCase() + category.slice(1),
      sub: entries.map((e) => e.pattern).slice(0, 4).join(", "),
    }));
  }, [systemEntries]);

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>
              {t("nav.computer")}{" "}
              <span
                style={{
                  font: "var(--text-overline)",
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  color: "var(--warning)",
                  background: "var(--warning-subtle)",
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  verticalAlign: "middle",
                  marginInlineStart: 8,
                }}
              >
                {t("computer.experimental")}
              </span>
            </h1>
            <p>{t("computer.subtitle", { project: projectName ?? "—" })}</p>
          </div>
          <div className="ph-actions">
            {!status?.running ? (
              <button type="button" className="btn primary sm" disabled={loading} onClick={() => void onStart()}>
                {t("computer.startHelper")}
              </button>
            ) : (
              <span className="statpill">
                <span className="live" />
                {t("common.running")}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {(message || error) && (
            <div className={`banner${error ? " err" : ""}`}>{error ?? message}</div>
          )}

          {windows.length > 0 && (
            <div className="section">
              <span className="sec-label">{t("computer.allowedApps")}</span>
              <div className="appgrid">
                {windows.slice(0, 8).map((w) => (
                  <div key={w.id} className="appcard">
                    <div className="ai" style={{ background: "var(--accent)" }}>
                      {w.processName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="am">
                      <div className="an">{w.processName}</div>
                      <div className="as">{w.title || t("computer.noTitle")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {windows.length === 0 && (
            <div className="section">
              <span className="sec-label">{t("computer.allowedApps")}</span>
              <div className="panel">
                <div className="panel-row">
                  <div className="prov-meta">
                    <div className="prov-name">{status?.backendLabel ?? t("common.offline")}</div>
                    <div className="prov-sub">
                      {COMPUTER_USE_HELPER_URL} · {status?.remediation ?? t("computer.helperDesc")}
                    </div>
                  </div>
                  <div className="mini-acts">
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={loading || !status?.running}
                      onClick={() =>
                        void onLoadWindows().then((list) =>
                          setMessage(t("computer.windowsFound", { count: String((list as DesktopWindow[]).length) })),
                        )
                      }
                    >
                      {t("computer.listWindows")}
                    </button>
                    <button type="button" className="btn ghost sm" disabled={loading} onClick={() => void onRefresh()}>
                      {t("computer.refresh")}
                    </button>
                    {status?.running && (
                      <button type="button" className="btn ghost sm" disabled={loading} onClick={() => void onStop()}>
                        {t("common.stop")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="section">
            <span className="sec-label">{t("computer.blocked")}</span>
            <div className="panel">
              {groupedBlocked.length === 0 ? (
                <div className="blocked-row">
                  <div className="bi">
                    <Icon name="shield" size={16} />
                  </div>
                  <div className="bm">
                    <div className="bn">{t("computer.blockedDefault")}</div>
                    <div className="bs">{t("computer.blockedDesc")}</div>
                  </div>
                  <span className="tag off">{t("computer.blockedTag")}</span>
                </div>
              ) : (
                groupedBlocked.map((b) => (
                  <div key={b.category} className="blocked-row">
                    <div className="bi">
                      <Icon name={b.icon} size={16} />
                    </div>
                    <div className="bm">
                      <div className="bn">{b.name}</div>
                      <div className="bs">{b.sub}</div>
                    </div>
                    <span className="tag off">{t("computer.blockedTag")}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <div className="sec-head">
              <span className="sec-label">{t("computer.retention")}</span>
              <div className="field" style={{ padding: 0, border: "none" }}>
                <div className="fc">
                  <span className="muted" style={{ font: "var(--text-caption)" }}>
                    {retainOn ? t("computer.retainOn") : t("computer.retainOff")}
                  </span>
                  <div
                    className={`toggle${retainOn ? " on" : ""}`}
                    onClick={() =>
                      void onSetRetention(retainOn ? "none" : "task").then(() =>
                        setMessage(t("computer.retentionUpdated")),
                      )
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      void onSetRetention(retainOn ? "none" : "task").then(() =>
                        setMessage(t("computer.retentionUpdated")),
                      )
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <i />
                  </div>
                </div>
              </div>
            </div>
            {screenshots.length > 0 ? (
              <div className="shots">
                {screenshots.map((s) => (
                  <div key={s.id} className="shot">
                    <div className="ph-stripe" />
                    <div className="cap">
                      <Icon name="camera" size={12} style={{ verticalAlign: "-2px", marginInlineEnd: 5, color: "var(--fg-3)" }} />
                      {s.appTarget ?? "screen"} · {new Date(s.createdAt).toLocaleTimeString()}
                      <button
                        type="button"
                        className="btn ghost icon sm"
                        style={{ marginInlineStart: 8 }}
                        onClick={() => void onDeleteScreenshot(s.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="shots">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shot" style={{ opacity: 0.45 }}>
                    <div className="ph-stripe" />
                    <div className="cap">{t("computer.noScreenshots")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
