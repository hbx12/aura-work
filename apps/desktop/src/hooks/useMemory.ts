import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MemoryEntry, PendingMemory } from "@aura-os/shared";

export function useMemory(projectId: string | null) {
  const [pending, setPending] = useState<PendingMemory[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setPending([]);
      setMemories([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, m] = await Promise.all([
        invoke<PendingMemory[]>("list_pending_memories", { projectId }),
        invoke<MemoryEntry[]>("list_memories", { projectId }),
      ]);
      setPending(p);
      setMemories(m);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const approve = useCallback(
    async (memoryId: string) => {
      await invoke("approve_memory", { memoryId });
      await refresh();
    },
    [refresh],
  );

  const reject = useCallback(
    async (memoryId: string) => {
      await invoke("reject_memory", { memoryId });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (memoryId: string) => {
      await invoke("delete_memory", { memoryId });
      await refresh();
    },
    [refresh],
  );

  return { pending, memories, loading, error, refresh, approve, reject, remove };
}
