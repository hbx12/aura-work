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
  const [branches, setBranches] = useState<string[]>([]);

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

        // Fetch list of branches
        const bList = await invoke<string[]>("git_list_branches", { projectId });
        setBranches(bList);
      } else {
        setDiff("");
        setSelectedFile(null);
        setBranches([]);
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
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, refresh]);

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

  const stageFile = useCallback(
    async (path: string) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const st = await invoke<GitStatusResult>("git_stage_file", { projectId, path });
        setStatus(st);
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh],
  );

  const unstageFile = useCallback(
    async (path: string) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const st = await invoke<GitStatusResult>("git_unstage_file", { projectId, path });
        setStatus(st);
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh],
  );

  const commitDirect = useCallback(
    async (message: string) => {
      if (!projectId || !message.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const st = await invoke<GitStatusResult>("git_commit", { projectId, message });
        setStatus(st);
        setCommitMessage("");
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh],
  );

  const push = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("git_push", { projectId });
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, refresh]);

  const pull = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("git_pull", { projectId });
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, refresh]);

  const checkoutBranch = useCallback(
    async (branchName: string) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const st = await invoke<GitStatusResult>("git_checkout_branch", { projectId, branchName });
        setStatus(st);
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh],
  );

  const createBranch = useCallback(
    async (branchName: string) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const st = await invoke<GitStatusResult>("git_create_branch", { projectId, branchName });
        setStatus(st);
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh],
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
    stageFile,
    unstageFile,
    commitDirect,
    push,
    pull,
    branches,
    checkoutBranch,
    createBranch,
  };
}
