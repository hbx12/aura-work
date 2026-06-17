import { useRef, useState } from "react";
import type { GitStatusResult, PendingCommit } from "@aura-os/shared";
import { Icon } from "@aura-os/ui";

interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
  refs: string;
  graph: string;
}

interface GitBranchInfo {
  name: string;
  current: boolean;
  remote?: string | null;
}

interface GitStashEntry {
  index: number;
  message: string;
}

interface GitPageProps {
  status: GitStatusResult | null;
  diff: string;
  logEntries: GitLogEntry[];
  branches: GitBranchInfo[];
  stashEntries: GitStashEntry[];
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
  diffView: "unified" | "side-by-side";
  onDiffViewChange?: (v: "unified" | "side-by-side") => void;
  onStashPush?: (message?: string) => void;
  onStashPop?: (index?: number) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function statusGlyph(status: string) {
  if (status === "A" || status === "??") return { cls: "a", label: "A" };
  if (status === "D") return { cls: "d", label: "D" };
  return { cls: "m", label: "M" };
}

function renderDiffLine(
  line: string,
  i: number,
  side: "left" | "right",
  sideBySide: boolean,
) {
  const add = line.startsWith("+") && !line.startsWith("+++");
  const del = line.startsWith("-") && !line.startsWith("---");
  const hunk = line.startsWith("@@");
  if (hunk) {
    return (
      <div key={`${side}-${i}`} className="diff-hunk">
        {line}
      </div>
    );
  }
  const skip = sideBySide && ((side === "left" && add) || (side === "right" && del));
  const content = sideBySide
    ? (del ? line.slice(1) : add ? line.slice(1) : line)
    : line;
  return (
    <div
      key={`${side}-${i}`}
      className={`dl${add ? " add" : del ? " del" : ""}`}
      style={skip ? { visibility: "hidden" } : undefined}
    >
      <span className="dn">{i + 1}</span>
      <span className="dsign">
        {sideBySide
          ? (del ? "−" : add ? "+" : " ")
          : (add ? "+" : del ? "−" : " ")}
      </span>
      <span className="dtext">{content}</span>
    </div>
  );
}

export function GitPage({
  status,
  diff,
  logEntries,
  branches,
  stashEntries,
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
  diffView,
  onDiffViewChange,
  onStashPush,
  onStashPop,
  t,
}: GitPageProps) {
  const activeFile = selectedFile ?? status?.files[0]?.path ?? null;
  const [stashMsg, setStashMsg] = useState("");
  const [activeSection, setActiveSection] = useState<"changes" | "log" | "branches" | "stash">("changes");
  const logRef = useRef<HTMLDivElement>(null);

  const diffLines = diff.split("\n");

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
          <div className="ex-tree-head" style={{ display: "flex", gap: 4, padding: "10px 12px" }}>
            {(["changes", "log", "branches", "stash"] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                className={`tab-sm${activeSection === sec ? " active" : ""}`}
                onClick={() => setActiveSection(sec)}
              >
                {sec === "changes" && t("git.changes")}
                {sec === "log" && "Log"}
                {sec === "branches" && "Branches"}
                {sec === "stash" && "Stash"}
              </button>
            ))}
          </div>

          <div className="tree" style={{ padding: 0 }}>
            {loading && !status && (
              <p className="muted" style={{ padding: "12px 16px" }}>
                {t("git.loading")}
              </p>
            )}

            {activeSection === "changes" && (
              <>
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
              </>
            )}

            {activeSection === "log" && (
              <div ref={logRef} className="git-log">
                {logEntries.length === 0 ? (
                  <p className="muted" style={{ padding: "12px 16px" }}>No commits yet.</p>
                ) : (
                  logEntries.map((e, i) => (
                    <div key={i} className="git-log-entry" title={`${e.hash} by ${e.author} on ${e.date}`}>
                      <span className="gle-graph">{e.graph}</span>
                      <span className="gle-hash">{e.hash.slice(0, 7)}</span>
                      <span className="gle-msg">{e.message}</span>
                      {e.refs && <span className="gle-refs">{e.refs}</span>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === "branches" && (
              <div className="git-branches">
                {branches.length === 0 ? (
                  <p className="muted" style={{ padding: "12px 16px" }}>No branches.</p>
                ) : (
                  branches.map((b, i) => (
                    <div key={i} className={`git-branch${b.current ? " current" : ""}`}>
                      <Icon name="git-branch" size={14} />
                      <span className="gb-name">{b.name.replace(/^remotes\//, "")}</span>
                      {b.current && <span className="tag ok" style={{ fontSize: 10 }}>current</span>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === "stash" && (
              <div className="git-stash">
                {stashEntries.length === 0 ? (
                  <p className="muted" style={{ padding: "12px 16px" }}>No stashes.</p>
                ) : (
                  stashEntries.map((s, i) => (
                    <div key={i} className="git-stash-row">
                      <span className="gs-index">stash@{s.index}</span>
                      <span className="gs-msg">{s.message}</span>
                      <button
                        type="button"
                        className="iconbtn"
                        title="Pop stash"
                        onClick={() => onStashPop?.(s.index)}
                      >
                        <Icon name="chevron-up" size={12} />
                      </button>
                    </div>
                  ))
                )}
                <div className="stash-push" style={{ padding: "8px 12px", display: "flex", gap: 6 }}>
                  <input
                    className="stash-input"
                    placeholder="Stash message (optional)"
                    value={stashMsg}
                    onChange={(e) => setStashMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onStashPush?.(stashMsg || undefined);
                        setStashMsg("");
                      }
                    }}
                    style={{
                      flex: 1, background: "var(--bg-1)", border: "1px solid var(--border-2)",
                      borderRadius: "var(--r-sm)", padding: "6px 10px", font: "var(--text-sm)", color: "var(--fg-1)",
                    }}
                  />
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={loading}
                    onClick={() => { onStashPush?.(stashMsg || undefined); setStashMsg(""); }}
                  >
                    <Icon name="chevron-down" size={12} />
                    Stash
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ex-pane">
          <div className="ed-bar">
            <span className="bc">
              <b>{activeFile ?? t("git.diff")}</b>
            </span>
            {status?.isRepo && activeFile && (
              <>
                <span className="muted" style={{ font: "var(--text-caption)" }}>
                  Unified · vs HEAD
                </span>
                {onDiffViewChange && (
                  <select
                    value={diffView}
                    onChange={(e) => onDiffViewChange(e.target.value as "unified" | "side-by-side")}
                    style={{
                      marginLeft: "auto", background: "var(--bg-1)", border: "1px solid var(--border-2)",
                      borderRadius: "var(--r-sm)", padding: "3px 8px", font: "var(--text-caption)", color: "var(--fg-1)",
                    }}
                  >
                    <option value="unified">Unified</option>
                    <option value="side-by-side">Side-by-side</option>
                  </select>
                )}
              </>
            )}
          </div>
          {error && status?.isRepo && (
            <p className="modal-error" style={{ margin: "12px 16px" }}>
              {error}
            </p>
          )}
          <div className={`diff${diffView === "side-by-side" ? " diff-sbs" : ""}`}>
            {!status?.isRepo ? (
              <div className="empty" style={{ padding: 32 }}>
                <p className="muted">{t("git.noDiff")}</p>
              </div>
            ) : diffView === "unified" ? (
              (diff || t("git.noDiff")).split("\n").map((line, i) => {
                const add = line.startsWith("+") && !line.startsWith("+++");
                const del = line.startsWith("-") && !line.startsWith("---");
                const hunk = line.startsWith("@@");
                if (hunk) {
                  return <div key={i} className="diff-hunk">{line}</div>;
                }
                return (
                  <div key={i} className={`dl${add ? " add" : del ? " del" : ""}`}>
                    <span className="dn">{i + 1}</span>
                    <span className="dsign">{add ? "+" : del ? "−" : " "}</span>
                    <span className="dtext">{line}</span>
                  </div>
                );
              })
            ) : (
              <div className="diff-sbs-container">
                <div className="diff-sbs-pane">
                  <div className="diff-sbs-head">{t("git.before") || "Before"}</div>
                  {diffLines.map((line, i) => renderDiffLine(line, i, "left", true))}
                </div>
                <div className="diff-sbs-divider" />
                <div className="diff-sbs-pane">
                  <div className="diff-sbs-head">{t("git.after") || "After"}</div>
                  {diffLines.map((line, i) => renderDiffLine(line, i, "right", true))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {pendingCommits.length > 0 && (
        <div className="page-scroll" style={{ maxHeight: 220, flexShrink: 0, borderTop: "1px solid var(--border-1)" }}>
          <div className="page-canvas" style={{ maxWidth: "100%" }}>
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
