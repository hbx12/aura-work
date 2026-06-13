import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, PendingEdit } from "@aura-os/shared";

export function useFiles(projectId: string | null) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [content, setContent] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await invoke<FileEntry[]>("list_project_files", {
        projectId,
        subPath: null,
        depth: 4,
      });
      setFiles(list.slice(0, 500));
      const edits = await invoke<PendingEdit[]>("list_pending_edits", {
        projectId,
        taskId: null,
      });
      setPendingEdits(edits);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const openFile = useCallback(
    async (path: string) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const text = await invoke<string>("read_project_file", { projectId, filePath: path });
        setSelectedPath(path);
        setContent(text);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const approveEdit = useCallback(
    async (editId: string, onTaskResumed?: (taskId: string) => void) => {
      await invoke("approve_pending_edit", { editId });
      try {
        const task = await invoke<{ id: string }>("resume_after_edit", { editId });
        onTaskResumed?.(task.id);
      } catch {
        /* edit not linked to a task */
      }
      await refreshFiles();
      if (selectedPath) await openFile(selectedPath);
    },
    [refreshFiles, openFile, selectedPath],
  );

  const saveFile = useCallback(
    async (path: string, newContent: string) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        await invoke("write_project_file", {
          input: {
            projectId,
            taskId: null,
            filePath: path,
            content: newContent,
            skipPermission: true,
          },
        });
        setContent(newContent);
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  return {
    files,
    content,
    selectedPath,
    pendingEdits,
    loading,
    error,
    refreshFiles,
    openFile,
    approveEdit,
    setContent,
    saveFile,
  };
}
