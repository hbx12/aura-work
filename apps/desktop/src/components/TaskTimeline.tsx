import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface AuditEntry {
  id: string;
  projectId: string | null;
  taskId: string | null;
  actor: string;
  category: string;
  action: string;
  target: string | null;
  summary: string;
  risk: string | null;
  decision: string | null;
  result: string;
  createdAt: string;
  metadata: string | null;
}

interface TaskTimelineProps {
  projectId: string;
  taskId: string;
  isArabic?: boolean;
}

interface GanttPhase {
  id: string;
  titleEn: string;
  titleAr: string;
  color: string;
  icon: React.ReactNode;
  categories: string[];
  entries: AuditEntry[];
  startTime: number; // ms timestamp
  endTime: number; // ms timestamp
  status: "success" | "pending" | "failed";
}

export function TaskTimeline({ projectId, taskId, isArabic }: TaskTimelineProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    analysis: true,
    file: true,
    execution: true,
    approval: true,
  });

  useEffect(() => {
    loadTimeline();
    const interval = setInterval(loadTimeline, 3000);
    return () => clearInterval(interval);
  }, [projectId, taskId]);

  const loadTimeline = async () => {
    try {
      const list = await invoke<AuditEntry[]>("list_audit_entries", {
        projectId,
        limit: 150,
      });
      // Filter entries for this task
      const taskEntries = list.filter((e) => e.taskId === taskId);
      // Sort oldest first
      taskEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setEntries(taskEntries);
    } catch (e) {
      console.error("Failed to load audit logs for timeline", e);
    }
  };

  const taskTimes = useMemo(() => {
    if (entries.length === 0) return { start: Date.now(), end: Date.now(), total: 1 };
    const start = new Date(entries[0].createdAt).getTime();
    const end = new Date(entries[entries.length - 1].createdAt).getTime();
    return {
      start,
      end,
      total: Math.max(end - start, 1000), // min 1 second
    };
  }, [entries]);

  const phases = useMemo<GanttPhase[]>(() => {
    const defaultPhases: Omit<GanttPhase, "entries" | "startTime" | "endTime" | "status">[] = [
      {
        id: "analysis",
        titleEn: "Analysis & Research",
        titleAr: "التحليل والبحث",
        color: "#60a5fa", // Blue
        categories: ["system", "read", "agent"],
        icon: (
          <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        ),
      },
      {
        id: "file",
        titleEn: "File Modifications",
        titleAr: "تعديل الملفات",
        color: "#34d399", // Emerald
        categories: ["file"],
        icon: (
          <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      {
        id: "execution",
        titleEn: "Code Execution",
        titleAr: "تشغيل الأوامر",
        color: "#a78bfa", // Purple
        categories: ["shell"],
        icon: (
          <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        ),
      },
      {
        id: "approval",
        titleEn: "User Reviews",
        titleAr: "مراجعات المستخدم",
        color: "#fbbf24", // Amber
        categories: ["approval", "permission", "decision"],
        icon: (
          <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ),
      },
    ];

    return defaultPhases.map((phase) => {
      // Find entries that match the phase categories
      const phaseEntries = entries.filter((e) => {
        const cat = e.category.toLowerCase();
        const act = e.action.toLowerCase();
        // Check if category matches, or if action represents approval
        if (phase.id === "approval") {
          return cat === "approval" || cat === "permission" || act.includes("propose") || act.includes("approve") || e.decision !== null;
        }
        return phase.categories.includes(cat);
      });

      let startTime = taskTimes.start;
      let endTime = taskTimes.end;
      let status: "success" | "pending" | "failed" = "success";

      if (phaseEntries.length > 0) {
        startTime = new Date(phaseEntries[0].createdAt).getTime();
        endTime = new Date(phaseEntries[phaseEntries.length - 1].createdAt).getTime();

        const hasFailed = phaseEntries.some((e) => e.result === "failed" || e.result === "error");
        const hasPending = phaseEntries.some((e) => e.result === "requested" || e.action.includes("propose"));
        if (hasFailed) status = "failed";
        else if (hasPending) status = "pending";
      } else {
        // Empty phase
        startTime = 0;
        endTime = 0;
      }

      return {
        ...phase,
        entries: phaseEntries,
        startTime,
        endTime,
        status,
      };
    });
  }, [entries, taskTimes]);

  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getTimelineBadge = (e: AuditEntry) => {
    if (e.result === "failed" || e.result === "error") {
      return { label: isArabic ? "فشل" : "Failed", bg: "rgba(239, 68, 68, 0.15)", color: "#f87171" };
    }
    if (e.action.includes("propose") || e.result === "requested") {
      return { label: isArabic ? "معلق" : "Pending", bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" };
    }
    return { label: isArabic ? "نجح" : "Success", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399" };
  };

  return (
    <div
      className="task-timeline-panel"
      style={{
        padding: "16px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "550px",
        fontFamily: "var(--font-family)",
        color: "var(--text-1)",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Panel Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
            {isArabic ? "مخطط سير العمل الزمني (Gantt)" : "Gantt-Style Work Pipeline"}
          </h4>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "12px" }}>
          <span>
            {isArabic ? "الخطوات:" : "Steps:"} <strong>{entries.length}</strong>
          </span>
          <span>
            {isArabic ? "المدة:" : "Duration:"}{" "}
            <strong>{(taskTimes.total / 1000).toFixed(1)}s</strong>
          </span>
        </div>
      </div>

      {/* Gantt Overview Chart */}
      {entries.length > 0 && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.15)",
            borderRadius: "10px",
            padding: "12px",
            border: "1px solid var(--border-3)",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {phases.map((phase) => {
            if (phase.entries.length === 0) return null;

            // Calculate offset and width percentage
            const offsetMs = phase.startTime - taskTimes.start;
            const durationMs = Math.max(phase.endTime - phase.startTime, 500); // minimum 500ms for visibility
            const leftPct = (offsetMs / taskTimes.total) * 100;
            const widthPct = (durationMs / taskTimes.total) * 100;

            const isRightToLeft = isArabic;

            return (
              <div
                key={phase.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1fr",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, color: "var(--text-2)" }}>
                  <span style={{ color: phase.color, display: "flex", alignItems: "center" }}>{phase.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isArabic ? phase.titleAr : phase.titleEn}
                  </span>
                </div>
                <div
                  style={{
                    height: "14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "7px",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      [isRightToLeft ? "right" : "left"]: `${Math.max(0, Math.min(leftPct, 95))}%`,
                      width: `${Math.max(5, Math.min(widthPct, 100))}%`,
                      background: `linear-gradient(90deg, ${phase.color}dd, ${phase.color})`,
                      borderRadius: "6px",
                      boxShadow: `0 0 6px ${phase.color}55`,
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                    title={`${isArabic ? phase.titleAr : phase.titleEn}: ${(durationMs / 1000).toFixed(1)}s`}
                    onClick={() => togglePhase(phase.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accordion / Detailed Timeline Logs */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          paddingRight: isArabic ? 0 : "4px",
          paddingLeft: isArabic ? "4px" : 0,
        }}
        className="scroll-narrow"
      >
        {entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontSize: "13px" }}>
            <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>⌛</span>
            {isArabic ? "بانتظار بدء أنشطة الوكيل..." : "Waiting for agent activities to start..."}
          </div>
        ) : (
          phases.map((phase) => {
            if (phase.entries.length === 0) return null;
            const isExpanded = expandedPhases[phase.id];

            return (
              <div
                key={phase.id}
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid var(--border-2)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => togglePhase(phase.id)}
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255, 255, 255, 0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: phase.color, display: "flex", alignItems: "center" }}>{phase.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>
                      {isArabic ? phase.titleAr : phase.titleEn}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {phase.entries.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          phase.status === "failed"
                            ? "#ef4444"
                            : phase.status === "pending"
                            ? "#fbbf24"
                            : "#10b881",
                      }}
                    />
                    <svg
                      style={{
                        width: 14,
                        height: 14,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        color: "var(--text-muted)",
                      }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      background: "rgba(0, 0, 0, 0.1)",
                      borderTop: "1px solid var(--border-3)",
                    }}
                  >
                    {phase.entries.map((entry) => {
                      const badge = getTimelineBadge(entry);
                      return (
                        <div
                          key={entry.id}
                          style={{
                            padding: "10px",
                            background: "var(--bg-3)",
                            border: "1px solid var(--border-3)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span
                              style={{
                                fontWeight: 700,
                                color: phase.color,
                                textTransform: "uppercase",
                                fontSize: "9px",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {entry.action}
                            </span>
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 6px",
                                borderRadius: "8px",
                                background: badge.bg,
                                color: badge.color,
                                fontWeight: 600,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ color: "var(--text-1)", marginBottom: "6px", lineHeight: "1.4" }}>
                            {entry.summary}
                          </div>
                          {entry.target && (
                            <div style={{ position: "relative" }}>
                              <code
                                style={{
                                  display: "block",
                                  background: "rgba(0, 0, 0, 0.2)",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  color: "#a78bfa",
                                  overflowX: "auto",
                                  fontFamily: "monospace",
                                  border: "1px solid rgba(255,255,255,0.03)",
                                }}
                              >
                                {entry.target}
                              </code>
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: "9px",
                              color: "var(--text-muted)",
                              textAlign: isArabic ? "left" : "right",
                              marginTop: "6px",
                            }}
                          >
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
