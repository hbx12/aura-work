import { useEffect, useState } from "react";
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

export function TaskTimeline({ projectId, taskId, isArabic }: TaskTimelineProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "files" | "shell" | "approvals" | "errors">("all");

  useEffect(() => {
    loadTimeline();
    const interval = setInterval(loadTimeline, 3000);
    return () => clearInterval(interval);
  }, [projectId, taskId]);

  const loadTimeline = async () => {
    try {
      const list = await invoke<AuditEntry[]>("list_audit_entries", {
        projectId,
        limit: 100,
      });
      // Filter entries for this task
      const taskEntries = list.filter((e) => e.taskId === taskId);
      setEntries(taskEntries);
    } catch (e) {
      console.error("Failed to load audit logs for timeline", e);
    }
  };

  const getFilteredEntries = () => {
    return entries.filter((e) => {
      if (filter === "all") return true;
      if (filter === "files") return e.category === "file";
      if (filter === "shell") return e.category === "shell";
      if (filter === "approvals") return e.action.includes("approved") || e.action.includes("propose") || e.decision !== null;
      if (filter === "errors") return e.result === "failed" || e.result === "error";
      return true;
    });
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

  const filtered = getFilteredEntries();

  return (
    <div className="task-timeline-panel" style={{
      padding: "16px",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "450px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "var(--text-1)" }}>
          {isArabic ? "سجل أنشطة الوكيل" : "Agent Activity Trace"}
        </h4>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          style={{ padding: "2px 6px", background: "var(--bg-3)", border: "1px solid var(--border-2)", color: "var(--text-1)", borderRadius: "4px", fontSize: "11px" }}
        >
          <option value="all">{isArabic ? "الكل" : "All"}</option>
          <option value="files">{isArabic ? "الملفات" : "Files"}</option>
          <option value="shell">{isArabic ? "الأوامر" : "Shell"}</option>
          <option value="approvals">{isArabic ? "الموافقات" : "Approvals"}</option>
          <option value="errors">{isArabic ? "الأخطاء" : "Errors"}</option>
        </select>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }} className="scroll-narrow">
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "12px" }}>
            {isArabic ? "لا توجد أنشطة مسجلة بعد لهذه المهمة." : "No activities recorded for this task yet."}
          </div>
        ) : (
          filtered.map((entry) => {
            const badge = getTimelineBadge(entry);
            return (
              <div key={entry.id} style={{
                padding: "10px",
                background: "var(--bg-3)",
                border: "1px solid var(--border-2)",
                borderRadius: "8px",
                fontSize: "12px",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", color: "var(--text-2)", textTransform: "uppercase", fontSize: "10px" }}>
                    {entry.category} / {entry.action}
                  </span>
                  <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
                <div style={{ color: "var(--text-1)", marginBottom: "4px" }}>{entry.summary}</div>
                {entry.target && (
                  <code style={{ display: "block", background: "var(--bg-4)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", color: "var(--text-muted)", overflowX: "auto" }}>
                    {entry.target}
                  </code>
                )}
                <div style={{ fontSize: "9px", color: "var(--text-muted)", textAlign: "right", marginTop: "4px" }}>
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
