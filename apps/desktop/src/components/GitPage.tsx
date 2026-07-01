import type { GitStatusResult, PendingCommit } from "@aura-os/shared";
import { Icon } from "@aura-os/ui";

interface GitPageProps {
  status: GitStatusResult | null;
  diff: string;
  pendingCommits: PendingCommit[];
  commitMessage: string;
  loading: boolean;
  error: string | null;
  folderPath?: string | null;
  onCommitMessageChange: (v: string) => void;
  onProposeCommit: () => void;
  onApproveCommit: (id: string) => void;
  onSelectFile?: (path: string) => void;
  onInitRepo?: () => void;
  selectedFile?: string | null;
  onStageFile?: (path: string) => Promise<void>;
  onUnstageFile?: (path: string) => Promise<void>;
  onCommitDirect?: (message: string) => Promise<void>;
  onPush?: () => Promise<void>;
  onPull?: () => Promise<void>;
  branches?: string[];
  onCheckoutBranch?: (branchName: string) => Promise<void>;
  onCreateBranch?: (branchName: string) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

function statusGlyph(status: string) {
  if (status === "A" || status === "??") return { cls: "a", label: "A" };
  if (status === "D") return { cls: "d", label: "D" };
  return { cls: "m", label: "M" };
}

export function GitPage({
  status,
  diff,
  pendingCommits,
  commitMessage,
  loading,
  error,
  folderPath,
  onCommitMessageChange,
  onProposeCommit,
  onApproveCommit,
  onSelectFile,
  onInitRepo,
  selectedFile,
  onStageFile,
  onUnstageFile,
  onCommitDirect,
  onPush,
  onPull,
  branches = [],
  onCheckoutBranch,
  onCreateBranch,
  t,
}: GitPageProps) {
  const activeFile = selectedFile ?? status?.files[0]?.path ?? null;
  const changeCount = status?.files.length ?? 0;

  const stagedFiles = status?.files.filter((f) => f.isStaged) ?? [];
  const unstagedFiles = status?.files.filter((f) => !f.isStaged) ?? [];

  const handleCreateBranch = () => {
    if (!onCreateBranch) return;
    const name = prompt(t("git.enterBranchName") || "Enter new branch name:");
    if (name && name.trim()) {
      onCreateBranch(name.trim()).catch((err) => alert(String(err)));
    }
  };

  const renderFileRow = (f: NonNullable<GitStatusResult["files"]>[0], isStaged: boolean) => {
    const g = statusGlyph(f.status);
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/") + 1) : "";
    const base = f.path.split("/").pop() ?? f.path;
    return (
      <div
        key={`${f.path}-${isStaged ? "staged" : "unstaged"}`}
        className={`gitfile${activeFile === f.path ? " sel" : ""}`}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 8 }}
        onClick={() => onSelectFile?.(f.path)}
        onKeyDown={(e) => e.key === "Enter" && onSelectFile?.(f.path)}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
          <span className={`gs ${g.cls}`}>{g.label}</span>
          <span className="gp" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {dir && <span className="dir">{dir}</span>}
            {base}
          </span>
        </div>
        <button
          type="button"
          className="btn sm"
          style={{
            padding: "2px 6px",
            minWidth: 20,
            height: 20,
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isStaged ? "Unstage file" : "Stage file"}
          onClick={(e) => {
            e.stopPropagation();
            if (isStaged) {
              void onUnstageFile?.(f.path);
            } else {
              void onStageFile?.(f.path);
            }
          }}
        >
          {isStaged ? "−" : "+"}
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("git.title")}</h1>
            <p>{t("git.subtitle")}</p>
          </div>
          {status?.isRepo && (
            <div className="ph-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {branches.length > 0 && onCheckoutBranch && (
                <select
                  value={status.branch ?? ""}
                  onChange={(e) => onCheckoutBranch(e.target.value)}
                  style={{
                    background: "var(--bg-2)",
                    color: "var(--fg-1)",
                    border: "1px solid var(--border-1)",
                    borderRadius: "var(--r-sm)",
                    padding: "4px 8px",
                    fontSize: "12px",
                    outline: "none",
                    height: 28,
                    cursor: "pointer",
                  }}
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              )}
              {onCreateBranch && (
                <button
                  type="button"
                  className="btn sm"
                  style={{ height: 28 }}
                  title="Create New Branch"
                  onClick={handleCreateBranch}
                >
                  <Icon name="plus" size={13} />
                </button>
              )}
              {onPull && (
                <button
                  type="button"
                  className="btn sm"
                  style={{ height: 28, display: "flex", alignItems: "center", gap: 4 }}
                  title="Pull Changes"
                  onClick={() => onPull().catch((err) => alert(String(err)))}
                >
                  <Icon name="download" size={13} />
                  Pull
                </button>
              )}
              {onPush && (
                <button
                  type="button"
                  className="btn sm"
                  style={{ height: 28, display: "flex", alignItems: "center", gap: 4 }}
                  title="Push Changes"
                  onClick={() => onPush().catch((err) => alert(String(err)))}
                >
                  <Icon name="arrow-up" size={13} />
                  Push
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="modal-error" style={{ margin: "12px 16px 0 16px", borderRadius: "var(--r-sm)" }}>
          {error}
        </div>
      )}
      <div className="explorer">
        <div className="ex-tree" style={{ width: 320 }}>
          <div className="ex-tree-head">
            <span className="t">
              {t("git.changes")}
              {status?.isRepo ? ` · ${changeCount}` : ""}
            </span>
          </div>
          <div className="tree" style={{ padding: 0 }}>
            {loading && !status && (
              <p className="muted" style={{ padding: "12px 16px" }}>
                {t("git.loading")}
              </p>
            )}
            {status && !status.isRepo && (
              <div className="empty" style={{ padding: 24 }}>
                <div className="em-ic">
                  <Icon name="git-branch" size={26} />
                </div>
                <p>{t("git.notRepo")}</p>
                {folderPath && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    {folderPath}
                  </p>
                )}
                {onInitRepo && (
                  <button
                    type="button"
                    className="btn primary sm"
                    style={{ marginTop: 14 }}
                    disabled={loading}
                    onClick={() => onInitRepo()}
                  >
                    {t("git.initRepo")}
                  </button>
                )}
              </div>
            )}
            {status?.isRepo && (
              <div style={{ width: "100%" }}>
                {stagedFiles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div
                      className="sec-label"
                      style={{ padding: "8px 12px 4px 12px", fontSize: "10px", textTransform: "uppercase" }}
                    >
                      Staged Changes ({stagedFiles.length})
                    </div>
                    {stagedFiles.map((f) => renderFileRow(f, true))}
                  </div>
                )}
                <div>
                  {stagedFiles.length > 0 && unstagedFiles.length > 0 && (
                    <div
                      className="sec-label"
                      style={{ padding: "8px 12px 4px 12px", fontSize: "10px", textTransform: "uppercase" }}
                    >
                      Changes ({unstagedFiles.length})
                    </div>
                  )}
                  {unstagedFiles.map((f) => renderFileRow(f, false))}
                </div>
                {status.files.length === 0 && (
                  <div className="panel-row muted" style={{ padding: "12px 16px" }}>
                    {t("git.noChanges")}
                  </div>
                )}
              </div>
            )}
          </div>
          {status?.isRepo && (
            <div className="commit-box">
              <div className="cb-row">
                <span className="lbl">{t("git.commitMessage")}</span>
              </div>
              <textarea
                className="commit-msg"
                rows={4}
                placeholder={t("git.commitMessage")}
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
              />
              <div className="commit-actions" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {onCommitDirect && (
                  <button
                    type="button"
                    className="btn primary sm"
                    style={{ flex: 1 }}
                    disabled={loading || !commitMessage.trim()}
                    onClick={() => onCommitDirect(commitMessage)}
                  >
                    {t("git.commit") || "Commit"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn sm"
                  style={{ flex: 1 }}
                  disabled={loading || !commitMessage.trim()}
                  onClick={onProposeCommit}
                >
                  {t("git.proposeCommit")}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="ex-pane">
          <div className="ed-bar">
            <span className="bc">
              <b>{activeFile ?? t("git.diff")}</b>
            </span>
            {status?.isRepo && activeFile && (
              <span className="muted" style={{ font: "var(--text-caption)" }}>
                Unified · vs HEAD
              </span>
            )}
          </div>
          {error && status?.isRepo && (
            <p className="modal-error" style={{ margin: "12px 16px" }}>
              {error}
            </p>
          )}
          <div className="diff">
            {!status?.isRepo ? (
              <div className="empty" style={{ padding: 32 }}>
                <p className="muted">{t("git.noDiff")}</p>
              </div>
            ) : (
              (diff || t("git.noDiff")).split("\n").map((line, i) => {
                const add = line.startsWith("+") && !line.startsWith("+++");
                const del = line.startsWith("-") && !line.startsWith("---");
                const hunk = line.startsWith("@@");
                if (hunk) {
                  return (
                    <div key={i} className="diff-hunk">
                      {line}
                    </div>
                  );
                }
                return (
                  <div key={i} className={`dl${add ? " add" : del ? " del" : ""}`}>
                    <span className="dn">{i + 1}</span>
                    <span className="dsign">{add ? "+" : del ? "−" : " "}</span>
                    <span className="dtext">{line}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {pendingCommits.length > 0 && (
        <div className="page-scroll" style={{ maxHeight: 220, flexShrink: 0, borderTop: "1px solid var(--border-1)" }}>
          <div className="page-canvas">
            <div className="section">
              <span className="sec-label">{t("git.pendingCommits")}</span>
              <div className="panel">
                {pendingCommits.map((c) => (
                  <div key={c.id} className="panel-row">
                    <div className="prov-meta">
                      <div className="prov-name">{c.message}</div>
                      <pre className="diff-preview">{c.diff.slice(0, 600)}</pre>
                    </div>
                    <button type="button" className="btn primary sm" onClick={() => onApproveCommit(c.id)}>
                      {t("git.approveCommit")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
