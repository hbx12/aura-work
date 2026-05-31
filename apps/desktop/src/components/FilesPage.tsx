import Editor from "@monaco-editor/react";
import { Icon } from "@aura-os/ui";
import type { FileEntry, PendingEdit } from "@aura-os/shared";

interface FilesPageProps {
  files: FileEntry[];
  selectedPath: string | null;
  content: string;
  pendingEdits: PendingEdit[];
  loading: boolean;
  error: string | null;
  projectName?: string;
  branch?: string;
  onOpen: (path: string) => void;
  onApproveEdit: (id: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export function FilesPage({
  files,
  selectedPath,
  content,
  pendingEdits,
  loading,
  error,
  projectName,
  branch,
  onOpen,
  onApproveEdit,
  t,
}: FilesPageProps) {
  const fileName = selectedPath?.split(/[/\\]/).pop() ?? null;

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("files.title")}</h1>
            <p>{t("files.subtitle")}</p>
          </div>
          {projectName && (
            <div className="ph-actions">
              <span className="statpill">
                <Icon name="git-branch" size={13} />
                {projectName}
                {branch ? ` · ${branch}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="explorer">
        <div className="ex-tree">
          <div className="ex-tree-head">
            <span className="t">{t("files.projectFiles")}</span>
          </div>
          <div className="tree">
            {loading && <p className="muted" style={{ padding: "8px 12px" }}>{t("common.loading")}</p>}
            {error && <p className="modal-error" style={{ margin: "8px 12px" }}>{error}</p>}
            {files.map((f) => {
              const name = f.path.split(/[/\\]/).pop() ?? f.path;
              return (
                <div
                  key={f.path}
                  className={`tnode${selectedPath === f.path ? " sel" : ""}`}
                  style={{ paddingInlineStart: 29 }}
                  onClick={() => onOpen(f.path)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(f.path)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="ti">
                    <Icon name="file" size={15} />
                  </span>
                  <span className="tn">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="ex-pane">
          {selectedPath ? (
            <>
              <div className="ed-tabs">
                <div className="ed-tab active">
                  <Icon name="file-code" size={14} />
                  {fileName}
                </div>
              </div>
              <div className="ed-bar">
                <span className="bc">
                  <b>{selectedPath}</b>
                </span>
                <span className="spacer" />
              </div>
              <div className="code" style={{ padding: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language="plaintext"
                  value={content}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                />
              </div>
            </>
          ) : (
            <div className="empty">
              <div className="em-ic">
                <Icon name="file" size={26} />
              </div>
              <p>{t("files.selectFile")}</p>
            </div>
          )}
        </div>
      </div>
      {pendingEdits.length > 0 && (
        <div className="commit-box">
          <div className="cb-row">
            <span className="lbl">{t("files.pendingEdits")}</span>
          </div>
          {pendingEdits.map((e) => (
            <div key={e.id} className="panel-row pending-edit-row">
              <div className="prov-meta">
                <div className="prov-name">{e.filePath}</div>
                <pre className="diff-preview">{e.diff.slice(0, 800)}</pre>
              </div>
              <button type="button" className="btn primary sm" onClick={() => onApproveEdit(e.id)}>
                {t("files.approveWrite")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
