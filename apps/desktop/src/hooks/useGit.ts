import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GitStatusResult, PendingCommit } from "@aura-os/shared";

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

export function useGit(projectId: string | null) {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [diff, setDiff] = useState("");
  const [logEntries, setLogEntries] = useState<GitLogEntry[]>([]);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [stashEntries, setStashEntries] = useState<GitStashEntry[]>([]);
  const [pendingCommits, setPendingCommits] = useState<PendingCommit[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffView, setDiffView] = useState<"unified" | "side-by-side">("unified");

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

        try {
          const log = await invoke<GitLogEntry[]>("git_log", { projectId, maxCount: 30 });
          setLogEntries(log);
        } catch { /* log may fail on empty repo */ }

        try {
          const br = await invoke<GitBranchInfo[]>("git_branches", { projectId });
          setBranches(br);
        } catch { /* */ }

        try {
          const sh = await invoke<GitStashEntry[]>("git_stash_list", { projectId });
          setStashEntries(sh);
        } catch { /* */ }
      } else {
        setDiff("");
        setLogEntries([]);
        setBranches([]);
        setStashEntries([]);
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
      setLogEntries([]);
      setBranches([]);
      setStashEntries([]);
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

  const stashPush = useCallback(async (message?: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      await invoke("git_stash_push", { projectId, message: message ?? null });
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, refresh]);

  const stashPop = useCallback(async (index?: number) => {
    if (!projectId) return;
    setLoading(true);
    try {
      await invoke("git_stash_pop", { projectId, index: index ?? null });
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, refresh]);

  return {
    status,
    diff,
    logEntries,
    branches,
    stashEntries,
    pendingCommits,
    commitMessage,
    setCommitMessage,
    selectedFile,
    diffView,
    setDiffView,
    loading,
    error,
    refresh,
    selectFile,
    initRepo,
    proposeCommit,
    approveCommit,
    stashPush,
    stashPop,
  };
}
