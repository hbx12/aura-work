import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GitStatusResult, PendingCommit } from "@aura-os/shared";

export function useGit(projectId: string | null) {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [diff, setDiff] = useState("");
  const [pendingCommits, setPendingCommits] = useState<PendingCommit[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const st = await invoke<GitStatusResult>("git_status", { projectId });
      setStatus(st);
      if (st.isRepo) {
        const path = selectedFile ?? st.files[0]?.path ?? null;
        const d = await invoke<{ diff: string }>("git_diff", { projectId, filePath: path });
        setDiff(d.diff);
        if (!selectedFile && st.files[0]?.path) setSelectedFile(st.files[0].path);
      } else {
        setDiff("");
        setSelectedFile(null);
      }
      const pending = await invoke<PendingCommit[]>("list_pending_commits", { projectId });
      setPendingCommits(pending);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedFile]);

  const selectFile = useCallback(
    async (path: string) => {
      if (!projectId) return;
      setSelectedFile(path);
      setLoading(true);
      setError(null);
      try {
        const d = await invoke<{ diff: string }>("git_diff", { projectId, filePath: path });
        setDiff(d.diff);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const initRepo = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("git_init", { projectId });
      setSelectedFile(null);
      const st = await invoke<GitStatusResult>("git_status", { projectId });
      setStatus(st);
      setDiff("");
      const pending = await invoke<PendingCommit[]>("list_pending_commits", { projectId });
      setPendingCommits(pending);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const proposeCommit = useCallback(async () => {
    if (!projectId || !commitMessage.trim()) return;
    setLoading(true);
    try {
      await invoke("propose_git_commit", {
        input: { projectId, taskId: null, message: commitMessage.trim() },
      });
      setCommitMessage("");
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, commitMessage, refresh]);

  const approveCommit = useCallback(
    async (commitId: string) => {
      setLoading(true);
      try {
        await invoke("approve_git_commit", { commitId });
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  return {
    status,
    diff,
    pendingCommits,
    commitMessage,
    setCommitMessage,
    selectedFile,
    loading,
    error,
    refresh,
    selectFile,
    initRepo,
    proposeCommit,
    approveCommit,
  };
}
