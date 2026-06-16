import { useState, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Icon, MarkdownText } from "@aura-os/ui";
import type { FileEntry, PendingEdit } from "@aura-os/shared";

loader.config({ monaco });

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
  onSave?: (path: string, content: string) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

interface TreeNode {
  path: string;
  name: string;
  isDir: boolean;
  size?: number | null;
  children: TreeNode[];
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
  onSave,
  t,
}: FilesPageProps) {
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    setEditedContent(content);
  }, [content]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Expand directories by default on files load
  useEffect(() => {
    if (files.length > 0) {
      const dirs = files.filter((f) => f.isDir).map((f) => f.path);
      setExpandedPaths(new Set(dirs));
    }
  }, [files]);

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Build recursive tree from flat array
  const buildTree = (entries: FileEntry[]): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const map: Record<string, TreeNode> = {};

    // Sort: Folders first, then files, both alphabetically
    const sorted = [...entries].sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.path.localeCompare(b.path);
    });

    for (const entry of sorted) {
      const node: TreeNode = {
        path: entry.path,
        name: entry.name,
        isDir: entry.isDir,
        size: entry.size,
        children: [],
      };
      map[entry.path] = node;

      const parts = entry.path.split("/");
      if (parts.length === 1) {
        rootNodes.push(node);
      } else {
        const parentPath = parts.slice(0, -1).join("/");
        const parent = map[parentPath];
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    }
    return rootNodes;
  };

  const tree = buildTree(files);
  const fileName = selectedPath?.split(/[/\\]/).pop() ?? null;
  const isMarkdown = /\.(md|markdown)$/i.test(selectedPath ?? "");
  const [markdownMode, setMarkdownMode] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    setMarkdownMode(isMarkdown ? "preview" : "edit");
  }, [isMarkdown, selectedPath]);

  const renderIndentGuides = (depth: number) => {
    const guides = [];
    for (let i = 0; i < depth; i++) {
      guides.push(
        <span
          key={i}
          className="indent-guide"
          style={{
            position: "absolute",
            left: 12 + i * 14 + 6,
            top: 0,
            bottom: 0,
            width: "1px",
            borderLeft: "1px solid var(--border-3)",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />
      );
    }
    return guides;
  };

  const getFileIconColor = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "#3178c6"; // TypeScript Blue
      case "js":
      case "jsx":
        return "#f1e05a"; // JavaScript Yellow
      case "css":
        return "#38a1db"; // CSS Cyan
      case "html":
        return "#e34c26"; // HTML Red-Orange
      case "json":
        return "#cbcb41"; // JSON Yellow-Green
      case "md":
        return "#61dafb"; // Markdown Blue-Teal
      case "rs":
        return "#dea584"; // Rust Orange
      case "toml":
        return "#b9bbbd"; // TOML Grey
      default:
        return "var(--fg-3)";
    }
  };

  const getLanguageFromPath = (path: string | null): string => {
    if (!path) return "plaintext";
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      case "html":
        return "html";
      case "css":
        return "css";
      case "rs":
        return "rust";
      case "py":
        return "python";
      case "sh":
      case "bash":
        return "shell";
      case "md":
        return "markdown";
      case "yaml":
      case "yml":
        return "yaml";
      case "toml":
        return "toml";
      default:
        return "plaintext";
    }
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;

    if (node.isDir) {
      return (
        <div key={node.path}>
          <div
            className={`tnode folder${isExpanded ? " open" : ""}`}
            style={{ paddingInlineStart: 12 + depth * 14, position: "relative" }}
            onClick={() => toggleFolder(node.path)}
            onKeyDown={(e) => e.key === "Enter" && toggleFolder(node.path)}
            role="button"
            tabIndex={0}
          >
            {renderIndentGuides(depth)}
            <span className="chev">
              <Icon name="chevron-right" size={13} />
            </span>
            <span className="ti" style={{ color: "var(--accent)" }}>
              <Icon name="folder" size={15} />
            </span>
            <span className="tn" style={{ fontWeight: 500 }}>
              {node.name}
            </span>
          </div>
          {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    } else {
      return (
        <div
          key={node.path}
          className={`tnode file${isSelected ? " sel" : ""}`}
          style={{ paddingInlineStart: 12 + depth * 14 + 17, position: "relative" }} // alignment offset matching chevron space
          onClick={() => onOpen(node.path)}
          onKeyDown={(e) => e.key === "Enter" && onOpen(node.path)}
          role="button"
          tabIndex={0}
        >
          {renderIndentGuides(depth)}
          <span className="ti" style={{ color: getFileIconColor(node.name) }}>
            <Icon name="file" size={15} />
          </span>
          <span className="tn">{node.name}</span>
        </div>
      );
    }
  };

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
        <div className="ex-tree" style={{ width: 260 }}>
          <div className="ex-tree-head">
            <span className="t">{t("files.projectFiles")}</span>
          </div>
          <div className="tree" style={{ padding: "4px 8px" }}>
            {loading && files.length === 0 && (
              <p className="muted" style={{ padding: "8px 12px" }}>
                {t("common.loading")}
              </p>
            )}
            {error && (
              <p className="modal-error" style={{ margin: "8px 12px" }}>
                {error}
              </p>
            )}
            {tree.map((node) => renderNode(node, 0))}
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
                {isMarkdown && (
                  <div className="seg compact">
                    <button
                      type="button"
                      className={markdownMode === "preview" ? "active" : ""}
                      onClick={() => setMarkdownMode("preview")}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className={markdownMode === "edit" ? "active" : ""}
                      onClick={() => setMarkdownMode("edit")}
                    >
                      Edit
                    </button>
                  </div>
                )}
                {editedContent !== content && (
                  <button
                    type="button"
                    className="btn primary sm"
                    style={{ padding: "4px 12px", height: "30px", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => selectedPath && onSave && void onSave(selectedPath, editedContent)}
                  >
                    <Icon name="save" size={13} />
                    {t("common.save", { defaultValue: "Save" })}
                  </button>
                )}
              </div>
              <div
                className="code"
                dir="ltr"
                style={{ padding: 0, flex: 1, display: "flex", flexDirection: "column", position: "relative" }}
              >
                {loading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0, 0, 0, 0.4)",
                      display: "grid",
                      placeItems: "center",
                      zIndex: 100,
                      backdropFilter: "blur(3px)",
                    }}
                  >
                    <div style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 10, background: "var(--bg-1)", padding: "10px 18px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-1)", boxShadow: "var(--shadow-2)" }}>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid var(--accent)",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span style={{ font: "var(--text-body-strong)", color: "var(--fg-1)" }}>
                        {t("common.loading")}
                      </span>
                    </div>
                  </div>
                )}
                {isMarkdown && markdownMode === "preview" ? (
                  <div className="markdown-preview">
                    {editedContent.trim() ? <MarkdownText text={editedContent} /> : <p>No Markdown content.</p>}
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={getLanguageFromPath(selectedPath)}
                    value={editedContent}
                    onChange={(val) => setEditedContent(val ?? "")}
                    onMount={(editor, monaco) => {
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        const val = editor.getValue();
                        if (selectedPath && onSave) {
                          void onSave(selectedPath, val);
                        }
                      });
                    }}
                    options={{
                      readOnly: false,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                )}
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
              <button
                type="button"
                className="btn primary sm"
                onClick={() => onApproveEdit(e.id)}
              >
                {t("files.approveWrite")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
