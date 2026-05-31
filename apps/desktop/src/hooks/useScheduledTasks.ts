import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  PermissionProfileGrant,
  ScheduledCadence,
  ScheduledTaskListItem,
  ScheduledTaskRecord,
  ScheduledTaskRun,
  TaskRecord,
} from "@aura-os/shared";

export function useScheduledTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<ScheduledTaskListItem[]>([]);
  const [selected, setSelected] = useState<ScheduledTaskRecord | null>(null);
  const [runs, setRuns] = useState<ScheduledTaskRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<ScheduledTaskListItem[]>("list_scheduled_tasks", {
        projectId,
      });
      setTasks(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadTask = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const task = await invoke<ScheduledTaskRecord>("get_scheduled_task", { id });
      setSelected(task);
      const history = await invoke<ScheduledTaskRun[]>("list_scheduled_task_runs", {
        scheduledTaskId: id,
        limit: 20,
      });
      setRuns(history);
      return task;
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (input: {
      name: string;
      description?: string;
      prompt: string;
      projectId: string;
      routingPolicy?: string;
      cadence: ScheduledCadence;
      permissionProfile: PermissionProfileGrant[];
    }) => {
      setLoading(true);
      try {
        const task = await invoke<ScheduledTaskRecord>("create_scheduled_task", { input });
        await refresh();
        return task;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const update = useCallback(
    async (input: {
      id: string;
      name?: string;
      description?: string;
      prompt?: string;
      routingPolicy?: string;
      cadence?: ScheduledCadence;
      permissionProfile?: PermissionProfileGrant[];
      paused?: boolean;
    }) => {
      setLoading(true);
      try {
        const task = await invoke<ScheduledTaskRecord>("update_scheduled_task", { input });
        setSelected(task);
        await refresh();
        return task;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await invoke("delete_scheduled_task", { id });
        if (selected?.id === id) {
          setSelected(null);
          setRuns([]);
        }
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh, selected?.id],
  );

  const runNow = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const result = await invoke<TaskRecord>("run_scheduled_task_now", { id });
      await loadTask(id);
      return result;
    } finally {
      setLoading(false);
    }
  }, [loadTask]);

  const pause = useCallback(
    async (id: string) => {
      const task = await invoke<ScheduledTaskRecord>("pause_scheduled_task", { id });
      setSelected(task);
      await refresh();
      return task;
    },
    [refresh],
  );

  const resume = useCallback(
    async (id: string) => {
      const task = await invoke<ScheduledTaskRecord>("resume_scheduled_task", { id });
      setSelected(task);
      await refresh();
      return task;
    },
    [refresh],
  );

  return {
    tasks,
    selected,
    runs,
    loading,
    error,
    refresh,
    loadTask,
    create,
    update,
    remove,
    runNow,
    pause,
    resume,
    setSelected,
  };
}
