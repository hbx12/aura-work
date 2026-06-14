import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface TerminalPageProps {
  projectId: string | null;
  folderPath: string | null;
  t: (key: string, params?: Record<string, string>) => string;
}

interface CommandHistoryEntry {
  command: string;
  cwd: string;
  output: string;
  error?: boolean;
}

export function TerminalPage({ projectId, folderPath, t }: TerminalPageProps) {
  const [cwd, setCwd] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [commandList, setCommandList] = useState<string[]>([]);
  const [recallIndex, setRecallIndex] = useState<number>(-1);
  const [loading, setLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync cwd when folderPath changes
  useEffect(() => {
    if (folderPath) {
      setCwd(folderPath);
    }
  }, [folderPath]);

  // Scroll to bottom when history changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandList.length === 0) return;
      const nextIdx = recallIndex === -1 ? commandList.length - 1 : Math.max(0, recallIndex - 1);
      setRecallIndex(nextIdx);
      setInputValue(commandList[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (commandList.length === 0 || recallIndex === -1) return;
      const nextIdx = recallIndex + 1;
      if (nextIdx >= commandList.length) {
        setRecallIndex(-1);
        setInputValue("");
      } else {
        setRecallIndex(nextIdx);
        setInputValue(commandList[nextIdx]);
      }
    }
  };

  const runCommand = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !projectId) return;

    setInputValue("");
    setRecallIndex(-1);
    setCommandList((prev) => [...prev, trimmed]);

    const activeCwd = cwd || folderPath || ".";

    if (trimmed === "clear") {
      setHistory([]);
      return;
    }

    setLoading(true);

    // If it's a cd command, we need special handling to resolve the directory
    if (trimmed.startsWith("cd ") || trimmed === "cd") {
      let target = trimmed.substring(3).trim();
      if (!target || target === "~") {
        target = folderPath || ".";
      }

      try {
        const newPath = await invoke<string>("resolve_terminal_cwd", {
          projectId,
          cwd: activeCwd,
          target,
        });
        setCwd(newPath);
        setHistory((prev) => [
          ...prev,
          {
            command: trimmed,
            cwd: activeCwd,
            output: "",
          },
        ]);
      } catch (err) {
        setHistory((prev) => [
          ...prev,
          {
            command: trimmed,
            cwd: activeCwd,
            output: String(err),
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard command execution
    try {
      const result = await invoke<{ stdout: string; stderr: string; success: boolean }>(
        "run_terminal_command",
        {
          projectId,
          cwd: activeCwd,
          command: trimmed,
        }
      );

      setHistory((prev) => [
        ...prev,
        {
          command: trimmed,
          cwd: activeCwd,
          output: result.success ? result.stdout : `${result.stdout}\n${result.stderr}`.trim(),
          error: !result.success,
        },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          command: trimmed,
          cwd: activeCwd,
          output: String(err),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Get simple display path
  const getDisplayPath = (path: string) => {
    if (!path) return "~";
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("terminal.title", { defaultValue: "Terminal" })}</h1>
            <p>{t("terminal.subtitle", { defaultValue: "Execute shell commands directly in your project workspace" })}</p>
          </div>
        </div>
      </div>
      <div
        className="explorer"
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          ref={containerRef}
          onClick={focusInput}
          style={{
            flex: 1,
            background: "#0c0d12",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-sm)",
            padding: "16px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "12.5px",
            color: "#e3e3e8",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            cursor: "text",
            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Welcome Info */}
          <div style={{ color: "#858599", borderBottom: "1px solid #1a1b24", paddingBottom: "8px", marginBottom: "4px" }}>
            Aura Terminal Emulator v0.1 · Workspace: {folderPath || "None"}
            <br />
            Type commands and press Enter. Support standard utilities and cd navigation.
          </div>

          {/* History */}
          {history.map((entry, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent)" }}>
                <span style={{ color: "#4ade80", fontWeight: "bold" }}>[aura {getDisplayPath(entry.cwd)}] $</span>
                <span style={{ color: "#fff", fontWeight: "500" }}>{entry.command}</span>
              </div>
              {entry.output && (
                <pre
                  style={{
                    margin: 0,
                    paddingInlineStart: "10px",
                    whiteSpace: "pre-wrap",
                    color: entry.error ? "#f87171" : "#cfcfd6",
                    fontFamily: "inherit",
                    lineHeight: "1.6",
                  }}
                >
                  {entry.output}
                </pre>
              )}
            </div>
          ))}

          {/* Active Input Line */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
            <span style={{ color: "#4ade80", fontWeight: "bold", whiteSpace: "nowrap" }}>
              [aura {getDisplayPath(cwd || folderPath || "")}] $
            </span>
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontFamily: "inherit",
                fontSize: "inherit",
                caretColor: "var(--accent)",
              }}
            />
            {loading && (
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  border: "2px solid var(--accent)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
