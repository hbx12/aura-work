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
  t,
}: GitPageProps) {
  const activeFile = selectedFile ?? status?.files[0]?.path ?? null;
  const changeCount = status?.files.length ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("git.title")}</h1>
            <p>{t("git.subtitle")}</p>
          </div>
          {status?.isRepo && (
            <div className="ph-actions">
              <span className="statpill">
                <Icon name="git-branch" size={13} />
                {status.branch ?? "HEAD"}
                <span className="dotsep">·</span>
                {status.clean ? t("git.clean") : t("git.dirty")}
              </span>
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
            {status?.isRepo &&
              (status.files.length === 0 ? (
                <div className="panel-row muted">{t("git.noChanges")}</div>
              ) : (
                status.files.map((f) => {
                  const g = statusGlyph(f.status);
                  const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/") + 1) : "";
                  const base = f.path.split("/").pop() ?? f.path;
                  return (
                    <div
                      key={f.path}
                      className={`gitfile${activeFile === f.path ? " sel" : ""}`}
                      onClick={() => onSelectFile?.(f.path)}
                      onKeyDown={(e) => e.key === "Enter" && onSelectFile?.(f.path)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className={`gs ${g.cls}`}>{g.label}</span>
                      <span className="gp">
                        {dir && <span className="dir">{dir}</span>}
                        {base}
                      </span>
                    </div>
                  );
                })
              ))}
          </div>
          {status?.isRepo && (
            <div className="commit-box">
              <div className="cb-row">
                <span className="lbl">{t("git.proposeCommit")}</span>
              </div>
              <textarea
                className="commit-msg"
                rows={4}
                placeholder={t("git.commitMessage")}
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
              />
              <div className="commit-actions">
                <button type="button" className="btn primary sm" disabled={loading} onClick={onProposeCommit}>
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
