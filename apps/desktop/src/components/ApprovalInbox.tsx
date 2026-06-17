import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";

export interface PendingPermission {
  id: string;
  projectId: string;
  taskId: string | null;
  category: string;
  action: string;
  target: string;
  reason: string;
  risk: string;
  requestedBy: string;
  allowAlwaysAvailable: boolean;
  status: string;
  createdAt: string;
}

export interface PendingEdit {
  id: string;
  projectId: string;
  taskId: string | null;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diff: string;
  status: string;
  createdAt: string;
}

interface ApprovalInboxProps {
  projectId: string;
  isArabic?: boolean;
  onActionCompleted?: () => void;
}

export function ApprovalInbox({ projectId, isArabic, onActionCompleted }: ApprovalInboxProps) {
  const [permissions, setPermissions] = useState<PendingPermission[]>([]);
  const [edits, setEdits] = useState<PendingEdit[]>([]);
  const [activeDiff, setActiveDiff] = useState<string | null>(null);

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadInbox = async () => {
    try {
      const permsList = await invoke<PendingPermission[]>("list_pending_permissions");
      // filter for this project
      const projectPerms = permsList.filter((p) => p.projectId === projectId && p.status === "pending");
      setPermissions(projectPerms);

      const editsList = await invoke<PendingEdit[]>("list_pending_edits", { projectId });
      setEdits(editsList);
    } catch (e) {
      console.error("Failed to load approval inbox items", e);
    }
  };

  const handleResolvePermission = async (id: string, decision: "allow-once" | "deny" | "allow-always") => {
    try {
      await invoke("resolve_permission", {
        input: { permissionId: id, decision }
      });
      // Try to resume task if applicable
      try {
        await invoke("resume_after_permission", { permissionId: id });
      } catch {
        /* no active task task loop linked directly */
      }
      loadInbox();
      onActionCompleted?.();
    } catch (e) {
      alert("Error resolving permission: " + e);
    }
  };

  const handleResolveEdit = async (editId: string, approve: boolean) => {
    try {
      if (approve) {
        await invoke("approve_pending_edit", { editId });
        try {
          await invoke("resume_after_edit", { editId });
        } catch {
          /* no active task loop */
        }
      } else {
        await invoke("dismiss_pending_edit", { editId });
        if (activeDiff === editId) setActiveDiff(null);
      }
      loadInbox();
      onActionCompleted?.();
    } catch (e) {
      alert((approve ? "Error approving edit: " : "Error dismissing edit: ") + e);
    }
  };

  const totalCount = permissions.length + edits.length;

  return (
    <div style={{
      padding: "16px",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "12px",
      color: "var(--text-1)",
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="shield-check" size={15} />
          {isArabic ? "صندوق الموافقات البشرية" : "Human Approval Inbox"}
          {totalCount > 0 && (
            <span style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", background: "#ef4444", color: "#fff", borderRadius: "10px" }}>
              {totalCount}
            </span>
          )}
        </h4>
        <button className="chip-btn" onClick={loadInbox}>{isArabic ? "تحديث" : "Refresh"}</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }} className="scroll-narrow">
        {totalCount === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--text-muted)", fontSize: "12px" }}>
            {isArabic ? "لا توجد موافقات معلقة حالياً." : "No pending approvals at the moment."}
          </div>
        ) : (
          <>
            {/* Render Permissions */}
            {permissions.map((p) => (
              <div key={p.id} style={{ padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "8px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", color: "#fbbf24", textTransform: "uppercase", fontSize: "10px" }}>
                    <Icon name="alert-triangle" size={12} style={{ verticalAlign: "-3px", marginInlineEnd: 5 }} />
                    {p.category} / {p.action}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{p.risk} risk</span>
                </div>
                <div style={{ color: "var(--text-1)", marginBottom: "4px" }}>{p.reason}</div>
                {p.target && (
                  <code style={{ display: "block", background: "var(--bg-4)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", color: "var(--text-muted)", overflowX: "auto", marginBottom: "8px" }}>
                    {p.target}
                  </code>
                )}
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button className="btn sm secondary" onClick={() => handleResolvePermission(p.id, "deny")}>
                    {isArabic ? "رفض" : "Deny"}
                  </button>
                  <button className="btn sm primary" onClick={() => handleResolvePermission(p.id, "allow-once")}>
                    {isArabic ? "سماح مرة واحدة" : "Allow Once"}
                  </button>
                </div>
              </div>
            ))}

            {/* Render Edits */}
            {edits.map((ed) => (
              <div key={ed.id} style={{ padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "8px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", color: "#60a5fa", textTransform: "uppercase", fontSize: "10px" }}>
                    <Icon name="file-diff" size={12} style={{ verticalAlign: "-3px", marginInlineEnd: 5 }} />
                    file / proposed write
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>medium risk</span>
                </div>
                <div style={{ color: "var(--text-1)", marginBottom: "6px" }}>
                  {isArabic ? "طلب تعديل الملف التالي:" : "Proposed changes for file:"} <strong>{ed.filePath}</strong>
                </div>

                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  <button className="chip-btn" onClick={() => setActiveDiff(activeDiff === ed.id ? null : ed.id)}>
                    {activeDiff === ed.id ? (isArabic ? "إخفاء الفروقات" : "Hide Diff") : (isArabic ? "عرض الفروقات" : "View Diff")}
                  </button>
                </div>

                {activeDiff === ed.id && (
                  <pre style={{
                    margin: "0 0 8px 0",
                    padding: "8px",
                    background: "#0d0e12",
                    borderRadius: "4px",
                    fontSize: "11px",
                    overflowX: "auto",
                    maxHeight: "180px",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    color: "var(--text-muted)"
                  }}>
                    {ed.diff || ed.proposedContent}
                  </pre>
                )}

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button className="btn sm secondary" onClick={() => handleResolveEdit(ed.id, false)}>
                    {isArabic ? "رفض" : "Reject"}
                  </button>
                  <button className="btn sm primary" onClick={() => handleResolveEdit(ed.id, true)}>
                    {isArabic ? "تطبيق التعديلات" : "Apply Changes"}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
