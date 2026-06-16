import { useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PermissionRequest, TaskListItem, TaskRecord } from "@aura-os/shared";

const MAX_TASK_STEPS = 20;

export interface CreateTaskOptions {
  prompt: string;
  preferredProvider?: string | null;
  preferredModel?: string | null;
  autoApprove?: boolean;
}

export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const streamPollRef = useRef<number | null>(null);

  const stopStreamPoll = useCallback(() => {
    if (streamPollRef.current != null) {
      clearInterval(streamPollRef.current);
      streamPollRef.current = null;
    }
    setStreamText("");
  }, []);

  const startStreamPoll = useCallback((taskId: string) => {
    stopStreamPoll();
    streamPollRef.current = window.setInterval(() => {
      void invoke<string>("get_task_stream_text", { taskId })
        .then((text) => {
          if (text) setStreamText(text);
        })
        .catch(() => {
          /* sidecar may be between chunks */
        });
    }, 100);
  }, [stopStreamPoll]);

  const advanceTask = useCallback(
    async (taskId: string) => {
      startStreamPoll(taskId);
      try {
        return await invoke<TaskRecord>("advance_task", { taskId });
      } finally {
        stopStreamPoll();
      }
    },
    [startStreamPoll, stopStreamPoll],
  );

  const refreshTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    try {
      const list = await invoke<TaskListItem[]>("list_tasks", { projectId });
      setTasks(list);
    } catch (e) {
      setError(String(e));
    }
  }, [projectId]);

  const loadTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);
    setActiveTask(null);
    try {
      const task = await invoke<TaskRecord>("get_task", { taskId });
      setActiveTask(task);
      const perms = await invoke<PermissionRequest[]>("list_pending_permissions", {
        projectId: null,
        taskId,
      });
      setPendingPermissions(perms);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const runLoop = useCallback(
    async (taskId: string, maxSteps = MAX_TASK_STEPS, autoApproveEdits = false) => {
      setRunning(true);
      setError(null);
      try {
        let task = await invoke<TaskRecord>("get_task", { taskId });
        for (let i = 0; i < maxSteps; i++) {
          if (autoApproveEdits && task.state === "waiting-for-approval") {
            if (task.pendingEditId) {
              await invoke("approve_pending_edit", { editId: task.pendingEditId });
              task = await invoke<TaskRecord>("resume_after_edit", {
                editId: task.pendingEditId,
              });
              setActiveTask(task);
              continue;
            }
            if (task.pendingPermissionId) {
              task = await invoke<TaskRecord>("resume_after_permission", {
                permissionId: task.pendingPermissionId,
                decision: "allow-once",
              });
              setActiveTask(task);
              continue;
            }
          }
          if (task.state !== "running") break;
          task = await advanceTask(taskId);
          setActiveTask(task);
          if (
            task.state === "waiting-for-approval" ||
            task.state === "completed" ||
            task.state === "blocked" ||
            task.state === "failed" ||
            task.state === "paused"
          ) {
            break;
          }
        }
        const perms = await invoke<PermissionRequest[]>("list_pending_permissions", {
          projectId: null,
          taskId,
        });
        setPendingPermissions(perms);
        await refreshTasks();
        return task;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [refreshTasks, advanceTask],
  );

  const createAndStart = useCallback(
    async (options: CreateTaskOptions | string) => {
      if (!projectId) throw new Error("No project selected");
      const opts: CreateTaskOptions =
        typeof options === "string" ? { prompt: options } : options;
      setRunning(true);
      setError(null);
      try {
        const created = await invoke<TaskRecord>("create_task", {
          input: { projectId, prompt: opts.prompt },
        });
        const planned = await invoke<TaskRecord>("start_task", {
          taskId: created.id,
          preferredProvider: opts.preferredProvider ?? null,
          preferredModel: opts.preferredModel ?? null,
        });
        setActiveTask(planned);
        await refreshTasks();
        if (opts.autoApprove && planned.state === "waiting-for-approval") {
          const approved = await invoke<TaskRecord>("approve_task_plan", { taskId: planned.id });
          setActiveTask(approved);
          return runLoop(approved.id, MAX_TASK_STEPS, true);
        }
        if (opts.autoApprove && planned.state === "running") {
          return runLoop(planned.id, MAX_TASK_STEPS, true);
        }
        return planned;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [projectId, refreshTasks, runLoop],
  );

  const approvePlan = useCallback(
    async (taskId: string) => {
      setRunning(true);
      setError(null);
      try {
        const task = await invoke<TaskRecord>("approve_task_plan", { taskId });
        setActiveTask(task);
        return task;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [],
  );

  const continueTask = useCallback(
    async (taskId: string, autoApproveEdits = false) => {
      const task = await invoke<TaskRecord>("get_task", { taskId });
      if (task.state === "running") {
        return runLoop(taskId, MAX_TASK_STEPS, autoApproveEdits);
      }
      return task;
    },
    [runLoop],
  );

  const resumeAfterEdit = useCallback(
    async (editId: string) => {
      setRunning(true);
      setError(null);
      try {
        const task = await invoke<TaskRecord>("resume_after_edit", { editId });
        setActiveTask(task);
        if (task.state === "running") {
          return runLoop(task.id);
        }
        return task;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [runLoop],
  );

  const resolvePermission = useCallback(
    async (permissionId: string, decision: string) => {
      setRunning(true);
      setError(null);
      try {
        const pending = pendingPermissions.find((permission) => permission.id === permissionId);
        if (pending && !pending.taskId) {
          await invoke("resolve_workspace_permission", {
            permissionId,
            decision,
          });
          const perms = await invoke<PermissionRequest[]>("list_pending_permissions", {
            projectId,
            taskId: null,
          });
          setPendingPermissions(perms);
          return null;
        }
        const task = await invoke<TaskRecord>("resume_after_permission", {
          permissionId,
          decision,
        });
        setActiveTask(task);
        if (task.state === "running") {
          await runLoop(task.id);
        }
        return task;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [pendingPermissions, projectId, runLoop],
  );

  const sendTaskMessage = useCallback(
    async (taskId: string, content: string) => {
      setRunning(true);
      setError(null);
      try {
        const task = await invoke<TaskRecord>("send_task_message", { taskId, content });
        setActiveTask(task);
        if (task.state === "running") {
          return runLoop(task.id);
        }
        return task;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [runLoop],
  );

  return {
    tasks,
    activeTask,
    pendingPermissions,
    loading,
    running,
    error,
    streamText,
    refreshTasks,
    loadTask,
    createAndStart,
    approvePlan,
    runLoop,
    continueTask,
    sendTaskMessage,
    resumeAfterEdit,
    resolvePermission,
    setActiveTask,
  };
}
