import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";
import "./canvas.css";

interface CanvasPanelProps {
  projectId: string;
  taskId: string | null;
  isAr?: boolean;
  activeFile: string | null;
  onChangeActiveFile: (file: string | null) => void;
  onSendPrompt: (prompt: string) => void;
  onRefreshWorkspace?: () => void;
  modifiedFiles: string[];
  width: number;
  onWidthChange: (w: number) => void;
  pendingEdits?: any[];
  onApproveEdit?: (editId: string) => Promise<void>;
}

interface ConsoleOutputLine {
  type: "stdout" | "stderr" | "info";
  text: string;
}

export default function CanvasPanel({
  projectId,
  taskId: _taskId,
  isAr,
  activeFile,
  onChangeActiveFile,
  onSendPrompt,
  onRefreshWorkspace,
  modifiedFiles,
  width,
  onWidthChange,
  pendingEdits,
  onApproveEdit,
}: CanvasPanelProps) {
  // Content states
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Edit states (WYSIWYG manual edit mode)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>("");

  // Search states for CSV view
  const [sheetSearch, setSheetSearch] = useState<string>("");

  // Chart Engine states
  const [showChart, setShowChart] = useState<boolean>(false);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [xAxisCol, setXAxisCol] = useState<number>(0);
  const [yAxisCol, setYAxisCol] = useState<number>(1);

  // Diff states
  const [showDiff, setShowDiff] = useState<boolean>(false);

  // Sandbox states
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleOutputLine[]>([]);
  const [runningSandbox, setRunningSandbox] = useState<boolean>(false);

  // Block prompt state
  const [blockPrompt, setBlockPrompt] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [blockPromptText, setBlockPromptText] = useState<string>("");

  // Drag and drop states
  const [dragActive, setDragActive] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingResizer = useRef<boolean>(false);

  // Find if active file has a pending edit
  const filePendingEdit = useMemo(() => {
    return pendingEdits?.find((e) => e.file_path === activeFile && e.status === "pending");
  }, [pendingEdits, activeFile]);

  // Read active file whenever it changes
  useEffect(() => {
    setShowChart(false);
    setShowDiff(false);
    if (!activeFile) {
      setFileContent("");
      setEditContent("");
      setIsEditing(false);
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const content = await invoke<string>("read_project_file", {
          projectId,
          filePath: activeFile,
        });
        setFileContent(content);
        setEditContent(content);
        setIsEditing(false);
      } catch (err) {
        console.error("Error reading project file:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    void loadFile();
  }, [projectId, activeFile]);

  // Resizing handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingResizer.current = true;
    document.body.classList.add("resizing-active"); // Custom style override helper if needed
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingResizer.current || !containerRef.current) return;
    const container = containerRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    let newWidth = 0;

    if (isAr) {
      // In RTL, Canvas is on the left, Chat is on the right
      // Dragging left increases width, dragging right decreases width
      newWidth = e.clientX - containerRect.left;
    } else {
      // In LTR, Canvas is on the right, Chat is on the left
      // Dragging left increases width, dragging right decreases width
      newWidth = containerRect.right - e.clientX;
    }

    // Constraints: min 280px, max 80% of window
    const minWidth = 280;
    const maxWidth = window.innerWidth * 0.8;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      onWidthChange(newWidth);
    }
  };

  const handleMouseUp = () => {
    isDraggingResizer.current = false;
    document.body.classList.remove("resizing-active");
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Safe manual file saving
  const handleSaveEdit = async () => {
    if (!activeFile) return;
    try {
      setLoading(true);
      await invoke("write_project_file", {
        input: {
          projectId,
          taskId: null, // manual user write skips task flow
          filePath: activeFile,
          content: editContent,
          skipPermission: true, // Direct write from user in visual editor
        },
      });
      setFileContent(editContent);
      setIsEditing(false);
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err) {
      alert(isAr ? `فشل الحفظ: ${err}` : `Failed to save file: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Run script code sandbox
  const handleRunScript = async () => {
    if (!activeFile) return;
    setConsoleOpen(true);
    setRunningSandbox(true);
    setConsoleLogs([
      { type: "info", text: isAr ? `بدء تشغيل السكربت ${activeFile}...` : `Starting execution of ${activeFile}...` }
    ]);

    let command = "";
    if (activeFile.endsWith(".py")) {
      command = `python3 "${activeFile}"`;
    } else if (activeFile.endsWith(".js")) {
      command = `node "${activeFile}"`;
    } else if (activeFile.endsWith(".sh")) {
      command = `bash "${activeFile}"`;
    } else {
      setConsoleLogs((prev) => [
        ...prev,
        { type: "stderr", text: isAr ? "صيغة الملف غير مدعومة للتشغيل المباشر." : "File extension not supported for sandbox running." }
      ]);
      setRunningSandbox(false);
      return;
    }

    try {
      const res = await invoke<{ stdout: string; stderr: string; success: boolean }>(
        "run_terminal_command",
        {
          projectId,
          cwd: null,
          command,
        }
      );

      setConsoleLogs((prev) => {
        const logs = [...prev];
        if (res.stdout.trim()) {
          logs.push({ type: "stdout", text: res.stdout });
        }
        if (res.stderr.trim()) {
          logs.push({ type: "stderr", text: res.stderr });
        }
        logs.push({
          type: "info",
          text: res.success 
            ? (isAr ? "اكتمل تشغيل السكربت بنجاح. ✅" : "Script execution finished successfully. ✅")
            : (isAr ? "فشل تشغيل السكربت. ❌" : "Script execution failed. ❌")
        });
        return logs;
      });
    } catch (err) {
      setConsoleLogs((prev) => [
        ...prev,
        { type: "stderr", text: `Error: ${err}` }
      ]);
    } finally {
      setRunningSandbox(false);
    }
  };

  // Selection detection for block prompting
  const handleSelectionCheck = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setBlockPrompt(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setBlockPrompt(null);
      return;
    }

    // Show popup bubble at mouse coordinates relative to container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top - 90; // offset bubble above selection
      setBlockPrompt({ x, y, text: selectedText });
    }
  };

  const handleSendBlockPrompt = () => {
    if (!blockPrompt || !blockPromptText.trim() || !activeFile) return;
    const prompt = isAr
      ? `في الملف [${activeFile}]، بخصوص هذا الجزء المحدد:\n"${blockPrompt.text}"\nأرجو تنفيذ الآتي: ${blockPromptText}`
      : `In file [${activeFile}], regarding this selected text:\n"${blockPrompt.text}"\nPlease do the following: ${blockPromptText}`;
    
    onSendPrompt(prompt);
    setBlockPrompt(null);
    setBlockPromptText("");
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setLoading(true);
      try {
        const text = await file.text();
        await invoke("write_project_file", {
          input: {
            projectId,
            taskId: null,
            filePath: file.name,
            content: text,
            skipPermission: true,
          },
        });
        onChangeActiveFile(file.name);
        if (onRefreshWorkspace) onRefreshWorkspace();
      } catch (err) {
        alert(isAr ? `فشل تحميل الملف: ${err}` : `Failed to load file: ${err}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Parse CSV helper
  const parsedCsv = useMemo(() => {
    if (!activeFile || !(activeFile.endsWith(".csv") || activeFile.endsWith(".tsv"))) return null;
    if (!fileContent.trim()) return { headers: [], rows: [] };

    const separator = activeFile.endsWith(".tsv") ? "\t" : ",";
    const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    // Basic CSV cell tokenizer (handles quotes)
    const tokenizeRow = (line: string) => {
      const tokens: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === separator && !inQuotes) {
          tokens.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      tokens.push(current.trim());
      return tokens;
    };

    const headers = tokenizeRow(lines[0]);
    const rows = lines.slice(1).map((line) => tokenizeRow(line));

    return { headers, rows };
  }, [activeFile, fileContent]);

  useEffect(() => {
    if (parsedCsv && parsedCsv.headers.length > 0) {
      setXAxisCol(0);
      let foundY = 1;
      for (let i = 0; i < parsedCsv.headers.length; i++) {
        const hasNumbers = parsedCsv.rows.some(
          (row) => row[i] && !isNaN(Number(row[i].replace(/[$,%]/g, "")))
        );
        if (hasNumbers && i > 0) {
          foundY = i;
          break;
        }
      }
      setYAxisCol(foundY < parsedCsv.headers.length ? foundY : Math.min(1, parsedCsv.headers.length - 1));
      setShowChart(false);
    }
  }, [parsedCsv]);

  const renderChart = () => {
    if (!parsedCsv || parsedCsv.rows.length === 0) return null;
    const xIndex = xAxisCol;
    const yIndex = yAxisCol;

    const data = parsedCsv.rows.map((row) => {
      const label = row[xIndex] || "";
      const valStr = row[yIndex] || "0";
      const val = parseFloat(valStr.replace(/[$,%]/g, "")) || 0;
      return { label, val };
    });

    const maxVal = Math.max(...data.map((d) => d.val), 1);
    const minVal = Math.min(...data.map((d) => d.val), 0);

    const svgWidth = 500;
    const svgHeight = 300;
    const padding = 45;
    const chartWidth = svgWidth - padding * 2;
    const chartHeight = svgHeight - padding * 2;

    const handleDownloadSvg = () => {
      const svgEl = document.getElementById("canvas-svg-chart");
      if (!svgEl) return;
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `${activeFile?.replace(/\.[^/.]+$/, "")}_chart.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    if (chartType === "pie") {
      const total = data.reduce((sum, d) => sum + d.val, 0) || 1;
      let cumulativeAngle = 0;
      const radius = 80;
      const cx = svgWidth / 2;
      const cy = svgHeight / 2 - 10;

      const colors = [
        "var(--accent)", "#ff8c00", "#30d158", "#0a84ff", "#bf5af2",
        "#ff453a", "#ff9f0a", "#64d2ff", "#ffd60a", "#5e5ce6"
      ];

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <button onClick={handleDownloadSvg} className="btn sm primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>📥</span> {isAr ? "تحميل SVG" : "Download SVG"}
            </button>
          </div>
          <svg id="canvas-svg-chart" width={svgWidth} height={svgHeight} style={{ background: "var(--bg-2)", border: "1px solid var(--border-3)", borderRadius: 12 }}>
            <g>
              {data.map((d, idx) => {
                const angle = (d.val / total) * 360;
                const radStart = (cumulativeAngle - 90) * (Math.PI / 180);
                const radEnd = (cumulativeAngle + angle - 90) * (Math.PI / 180);
                cumulativeAngle += angle;

                const x1 = cx + radius * Math.cos(radStart);
                const y1 = cy + radius * Math.sin(radStart);
                const x2 = cx + radius * Math.cos(radEnd);
                const y2 = cy + radius * Math.sin(radEnd);

                const largeArcFlag = angle > 180 ? 1 : 0;
                const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                const fill = colors[idx % colors.length];

                return (
                  <path
                    key={idx}
                    d={pathData}
                    fill={fill}
                    stroke="var(--bg-1)"
                    strokeWidth="1.5"
                    style={{ transition: "opacity 0.2s", cursor: "pointer" }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <title>{`${d.label}: ${d.val} (${((d.val / total) * 100).toFixed(1)}%)`}</title>
                  </path>
                );
              })}
            </g>
          </svg>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxWidth: "420px", fontSize: 11, justifyContent: "center" }}>
            {data.slice(0, 8).map((d, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[idx % colors.length], display: "inline-block" }} />
                <span style={{ color: "var(--fg-2)" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <button onClick={handleDownloadSvg} className="btn sm primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>📥</span> {isAr ? "تحميل SVG" : "Download SVG"}
          </button>
        </div>
        <svg id="canvas-svg-chart" width={svgWidth} height={svgHeight} style={{ background: "var(--bg-2)", border: "1px solid var(--border-3)", borderRadius: 12 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padding + chartHeight * (1 - p);
            const val = minVal + (maxVal - minVal) * p;
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <text x={padding - 8} y={y + 4} fill="var(--fg-3)" fontSize="9" textAnchor="end">
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {chartType === "bar" ? (
            <g>
              {data.map((d, idx) => {
                const barWidth = Math.max(10, chartWidth / data.length - 12);
                const x = padding + (chartWidth / data.length) * idx + 6;
                const ratio = (d.val - minVal) / ((maxVal - minVal) || 1);
                const barHeight = chartHeight * ratio;
                const y = padding + chartHeight - barHeight;

                return (
                  <rect
                    key={idx}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="var(--accent)"
                    rx="4"
                    style={{ transition: "opacity 0.2s", cursor: "pointer" }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <title>{`${d.label}: ${d.val}`}</title>
                  </rect>
                );
              })}
            </g>
          ) : (
            <g>
              {(() => {
                const points = data.map((d, idx) => {
                  const x = padding + (chartWidth / (data.length - 1 || 1)) * idx;
                  const ratio = (d.val - minVal) / ((maxVal - minVal) || 1);
                  const y = padding + chartHeight - chartHeight * ratio;
                  return { x, y };
                });

                const pathD = points.reduce(
                  (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                  ""
                );

                return (
                  <>
                    <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                    {points.map((p, idx) => (
                      <circle
                        key={`c-${idx}`}
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill="var(--accent)"
                        stroke="var(--bg-1)"
                        strokeWidth="1.5"
                      >
                        <title>{`${data[idx].label}: ${data[idx].val}`}</title>
                      </circle>
                    ))}
                  </>
                );
              })()}
            </g>
          )}

          {data.map((d, idx) => {
            const x = padding + (chartWidth / (data.length || 1)) * idx + (chartWidth / (data.length || 1)) / 2;
            const y = svgHeight - padding + 15;
            return (
              <text
                key={idx}
                x={x}
                y={y}
                fill="var(--fg-3)"
                fontSize="8"
                textAnchor="middle"
                transform={`rotate(-15, ${x}, ${y})`}
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {d.label.length > 8 ? `${d.label.slice(0, 7)}...` : d.label}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  // Render Notion Markdown visual content
  const renderMarkdownContent = (content: string) => {
    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${key}`}>{listItems}</ul>);
        listItems = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(<li key={`li-${idx}`}>{trimmed.slice(2)}</li>);
      } else {
        flushList(idx);
        if (trimmed.startsWith("# ")) {
          elements.push(<h1 key={idx}>{trimmed.slice(2)}</h1>);
        } else if (trimmed.startsWith("## ")) {
          elements.push(<h2 key={idx}>{trimmed.slice(3)}</h2>);
        } else if (trimmed.startsWith("### ")) {
          elements.push(<h3 key={idx}>{trimmed.slice(4)}</h3>);
        } else if (trimmed.startsWith("> ")) {
          elements.push(<blockquote key={idx}>{trimmed.slice(2)}</blockquote>);
        } else if (trimmed) {
          elements.push(<p key={idx}>{trimmed}</p>);
        }
      }
    });

    flushList(lines.length);
    return <div className="doc-viewer">{elements}</div>;
  };

  // Determine active tab type
  const isImageFile = activeFile && (activeFile.endsWith(".png") || activeFile.endsWith(".jpg") || activeFile.endsWith(".jpeg") || activeFile.endsWith(".gif") || activeFile.endsWith(".webp"));
  const isSvgFile = activeFile && activeFile.endsWith(".svg");
  const isHtmlFile = activeFile && activeFile.endsWith(".html");
  const isCsvFile = activeFile && (activeFile.endsWith(".csv") || activeFile.endsWith(".tsv"));
  const isExecutable = activeFile && (activeFile.endsWith(".py") || activeFile.endsWith(".js") || activeFile.endsWith(".sh"));
  const isMarkdown = activeFile && (activeFile.endsWith(".md") || activeFile.endsWith(".txt"));

  return (
    <div
      ref={containerRef}
      className={`canvas-panel ${isAr ? "rtl" : "ltr"}`}
      style={{ width }}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Draggable Divider Line */}
      <div
        className={`canvas-resizer ${isDraggingResizer.current ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
      />

      {/* Tabs Header bar */}
      <div className="canvas-tabs-bar">
        {modifiedFiles.length === 0 ? (
          <div className="canvas-tab active">
            <Icon name="document" size={13} />
            {isAr ? "مساحة العمل" : "Workspace"}
          </div>
        ) : (
          modifiedFiles.map((file) => (
            <div
              key={file}
              className={`canvas-tab ${activeFile === file ? "active" : ""}`}
              onClick={() => onChangeActiveFile(file)}
            >
              <Icon name={file.endsWith(".csv") || file.endsWith(".xlsx") ? "table" : "document"} size={13} />
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                {file.split("/").pop()}
              </span>
              <button
                type="button"
                className="canvas-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeFile === file) {
                    onChangeActiveFile(modifiedFiles.find((f) => f !== file) || null);
                  }
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Toolbar */}
      {activeFile && (
        <div className="canvas-toolbar">
          <div className="canvas-toolbar-group" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>
              {activeFile.split("/").pop()}
            </span>

            {isCsvFile && (
              <div style={{ display: "flex", gap: 4, marginLeft: 8, marginRight: 8, background: "var(--bg-3)", padding: 2, borderRadius: 6 }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    background: !showChart ? "var(--bg-1)" : "transparent",
                    color: !showChart ? "var(--fg-1)" : "var(--fg-3)",
                    border: "none",
                    borderRadius: 4,
                    boxShadow: !showChart ? "var(--shadow-1)" : "none"
                  }}
                  onClick={() => setShowChart(false)}
                >
                  {isAr ? "الجدول" : "Grid"}
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    background: showChart ? "var(--bg-1)" : "transparent",
                    color: showChart ? "var(--fg-1)" : "var(--fg-3)",
                    border: "none",
                    borderRadius: 4,
                    boxShadow: showChart ? "var(--shadow-1)" : "none"
                  }}
                  onClick={() => setShowChart(true)}
                >
                  {isAr ? "مخطط 📊" : "Chart 📊"}
                </button>
              </div>
            )}

            {filePendingEdit && (
              <div style={{ display: "flex", gap: 4, marginLeft: 8, marginRight: 8, background: "var(--bg-3)", padding: 2, borderRadius: 6 }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    background: !showDiff ? "var(--bg-1)" : "transparent",
                    color: !showDiff ? "var(--fg-1)" : "var(--fg-3)",
                    border: "none",
                    borderRadius: 4,
                    boxShadow: !showDiff ? "var(--shadow-1)" : "none"
                  }}
                  onClick={() => setShowDiff(false)}
                >
                  {isAr ? "الملف" : "File"}
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    background: showDiff ? "var(--bg-1)" : "transparent",
                    color: showDiff ? "var(--fg-1)" : "var(--fg-3)",
                    border: "none",
                    borderRadius: 4,
                    boxShadow: showDiff ? "var(--shadow-1)" : "none"
                  }}
                  onClick={() => setShowDiff(true)}
                >
                  {isAr ? "الفرق 🔍" : "Diff 🔍"}
                </button>
              </div>
            )}
          </div>

          <div className="canvas-toolbar-group">
            {isExecutable && (
              <button
                type="button"
                className="btn primary sm"
                onClick={handleRunScript}
                disabled={runningSandbox}
              >
                <Icon name="play" size={12} />
                <span style={{ marginLeft: 4 }}>{isAr ? "تشغيل ⚡" : "Run ⚡"}</span>
              </button>
            )}

            {isEditing ? (
              <>
                <button type="button" className="btn secondary sm" onClick={() => setIsEditing(false)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button type="button" className="btn primary sm" onClick={handleSaveEdit} disabled={loading}>
                  <Icon name="check" size={12} />
                  <span style={{ marginLeft: 4 }}>{isAr ? "حفظ" : "Save"}</span>
                </button>
              </>
            ) : (
              !isCsvFile && !isImageFile && (
                <button type="button" className="btn secondary sm" onClick={() => setIsEditing(true)}>
                  <Icon name="pencil" size={12} />
                  <span style={{ marginLeft: 4 }}>{isAr ? "تعديل" : "Edit"}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Main Render Area */}
      <div className="canvas-body" onMouseUp={handleSelectionCheck}>
        {loading && (
          <div style={{ display: "grid", placeItems: "center", flex: 1, color: "var(--fg-3)" }}>
            {isAr ? "جاري تحميل الملف..." : "Loading file contents..."}
          </div>
        ) }

        {error && (
          <div style={{ padding: 24, color: "var(--danger)", flex: 1 }}>
            <h3>{isAr ? "خطأ في تحميل الملف" : "Error Loading File"}</h3>
            <p>{error}</p>
          </div>
        ) }

        {!loading && !error && (
          <div className="canvas-pane-view">
            {!activeFile ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, textAlign: "center", color: "var(--fg-3)" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(234, 88, 12, 0.08)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                  <Icon name="document" size={32} />
                </div>
                <h3>{isAr ? "لوحة العمل التفاعلية" : "Aura Canvas"}</h3>
                <p style={{ maxWidth: 300, fontSize: 13, lineHeight: 1.5 }}>
                  {isAr 
                    ? "اسحب وأفلت أي ملف هنا لعرضه، أو ابدأ مهمة برمجية مع Aura Work لإنشاء وتعديل الملفات مباشرة."
                    : "Drag & drop a file here to inspect it, or trigger workspace tasks to populate documents, spreadsheets, or designs."}
                </p>
              </div>
            ) : showDiff && filePendingEdit ? (
              <div className="diff-viewer" style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, padding: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--fg-3)" }}>
                    {isAr ? "تعديلات معلقة بحاجة لموافقتك:" : "Pending changes waiting for approval:"}
                  </span>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={async () => {
                      if (onApproveEdit) {
                        setLoading(true);
                        try {
                          await onApproveEdit(filePendingEdit.id);
                          setShowDiff(false);
                          const content = await invoke<string>("read_project_file", {
                            projectId,
                            filePath: activeFile!,
                          });
                          setFileContent(content);
                          setEditContent(content);
                        } catch (err) {
                          alert(String(err));
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                  >
                    {isAr ? "اعتماد التعديل ✅" : "Approve Changes ✅"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12, flex: 1, overflow: "hidden" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border-3)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ background: "rgba(255, 69, 58, 0.1)", color: "rgb(255, 69, 58)", padding: "6px 12px", font: "var(--text-label)", borderBottom: "1px solid var(--border-3)" }}>
                      {isAr ? "الحالي" : "Original"}
                    </div>
                    <pre style={{ flex: 1, margin: 0, padding: 12, overflow: "auto", fontSize: 12, background: "rgba(255, 69, 58, 0.02)", whiteSpace: "pre-wrap" }}>
                      {filePendingEdit.original_content || "(empty)"}
                    </pre>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border-3)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ background: "rgba(48, 209, 88, 0.1)", color: "rgb(48, 209, 88)", padding: "6px 12px", font: "var(--text-label)", borderBottom: "1px solid var(--border-3)" }}>
                      {isAr ? "المقترح" : "Proposed"}
                    </div>
                    <pre style={{ flex: 1, margin: 0, padding: 12, overflow: "auto", fontSize: 12, background: "rgba(48, 209, 88, 0.02)", whiteSpace: "pre-wrap" }}>
                      {filePendingEdit.proposed_content}
                    </pre>
                  </div>
                </div>
              </div>
            ) : isCsvFile && showChart && parsedCsv ? (
              <div className="chart-viewer" style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, padding: 12, overflowY: "auto" }}>
                {/* Chart Settings Controls */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, background: "var(--bg-3)", padding: 12, borderRadius: 8, border: "1px solid var(--border-3)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{isAr ? "المحور السيني (النص)" : "X-Axis (Text):"}</span>
                    <select
                      value={xAxisCol}
                      onChange={(e) => setXAxisCol(parseInt(e.target.value))}
                      style={{ background: "var(--bg-1)", border: "1px solid var(--border-3)", color: "var(--fg-1)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}
                    >
                      {parsedCsv.headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{isAr ? "المحور الصادي (الرقم)" : "Y-Axis (Number):"}</span>
                    <select
                      value={yAxisCol}
                      onChange={(e) => setYAxisCol(parseInt(e.target.value))}
                      style={{ background: "var(--bg-1)", border: "1px solid var(--border-3)", color: "var(--fg-1)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}
                    >
                      {parsedCsv.headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{isAr ? "نوع المخطط" : "Chart Type:"}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["bar", "line", "pie"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={`btn sm ${chartType === type ? "primary" : "secondary"}`}
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => setChartType(type)}
                        >
                          {type === "bar" ? (isAr ? "أعمدة" : "Bar") : type === "line" ? (isAr ? "خطي" : "Line") : (isAr ? "دائري" : "Pie")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {renderChart()}
              </div>
            ) : isEditing ? (
              <textarea
                style={{
                  flex: 1,
                  background: "var(--bg-1)",
                  border: "none",
                  color: "var(--fg-2)",
                  fontFamily: isExecutable ? "'JetBrains Mono', 'Fira Code', monospace" : "inherit",
                  fontSize: 13,
                  lineHeight: 1.6,
                  outline: "none",
                  resize: "none",
                  padding: 12,
                }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            ) : isImageFile ? (
              <div style={{ display: "grid", placeItems: "center", flex: 1 }}>
                <img src={fileContent} alt={activeFile} style={{ maxWidth: "100%", maxHeight: "80%", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.35)" }} />
              </div>
            ) : isSvgFile ? (
              <div 
                style={{ display: "grid", placeItems: "center", flex: 1, padding: 20 }}
                dangerouslySetInnerHTML={{ __html: fileContent }}
              />
            ) : isHtmlFile ? (
              <iframe
                title="html-preview"
                srcDoc={fileContent}
                style={{ width: "100%", height: "100%", border: "none", background: "#fff", borderRadius: 8 }}
              />
            ) : isCsvFile && parsedCsv ? (
              <div className="sheet-viewer">
                <div className="sheet-search-row">
                  <input
                    type="text"
                    placeholder={isAr ? "بحث في الخلايا..." : "Search cells..."}
                    value={sheetSearch}
                    onChange={(e) => setSheetSearch(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      background: "var(--bg-2)",
                      border: "1px solid var(--border-3)",
                      color: "var(--fg-1)",
                      borderRadius: 6,
                      fontSize: 12,
                      width: 200,
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                    {isAr ? `${parsedCsv.rows.length} صفوف` : `${parsedCsv.rows.length} rows`}
                  </span>
                </div>

                <div className="sheet-table-container">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        {parsedCsv.headers.map((h, i) => <th key={i}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCsv.rows
                        .filter((row) =>
                          sheetSearch === "" ||
                          row.some((cell) => cell.toLowerCase().includes(sheetSearch.toLowerCase()))
                        )
                        .map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => {
                              const isFormula = cell.startsWith("=");
                              return (
                                <td key={cIdx} title={isFormula ? cell : undefined}>
                                  {cell}
                                  {isFormula && <span className="formula-indicator" />}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isMarkdown ? (
              renderMarkdownContent(fileContent)
            ) : (
              <pre
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: "var(--fg-2)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {fileContent}
              </pre>
            )}
          </div>
        )}

        {/* Block Prompt Bubble Popup */}
        {blockPrompt && (
          <div
            className="canvas-block-prompt"
            style={{
              left: isAr ? "auto" : blockPrompt.x,
              right: isAr ? blockPrompt.x : "auto",
              top: blockPrompt.y,
            }}
            onMouseUp={(e) => e.stopPropagation()} // Prevent bubble closure on click
          >
            <textarea
              placeholder={isAr ? "اطلب من Aura تعديل الجزء المظلل..." : "Ask Aura to change the selected text..."}
              value={blockPromptText}
              onChange={(e) => setBlockPromptText(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button type="button" className="btn secondary sm" onClick={() => setBlockPrompt(null)}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button type="button" className="btn primary sm" onClick={handleSendBlockPrompt} disabled={!blockPromptText.trim()}>
                {isAr ? "إرسال" : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone Overlay */}
        <div className={`canvas-dropzone ${dragActive ? "active" : ""}`}>
          <Icon name="arrow-up-tray" size={32} style={{ color: "var(--accent)" }} />
          <h3>{isAr ? "أفلت الملف هنا" : "Drop to Upload"}</h3>
          <p style={{ fontSize: 12, color: "var(--fg-3)" }}>
            {isAr ? "سيتم نسخ الملف مباشرة لمجلد المشروع" : "Copies file directly into project folder"}
          </p>
        </div>
      </div>

      {/* Sandbox Terminal Output Console Drawer */}
      {consoleOpen && (
        <div className="sandbox-console">
          <div className="console-header">
            <span style={{ fontWeight: 600, color: "var(--fg-2)" }}>
              {isAr ? "لوحة التشغيل التجريبية (Sandbox Console)" : "Sandbox Console"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={() => setConsoleLogs([])}
              >
                {isAr ? "مسح" : "Clear"}
              </button>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px", fontSize: 11, color: "var(--danger)" }}
                onClick={() => setConsoleOpen(false)}
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
          <div className="console-output">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className={log.type}>
                {log.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
