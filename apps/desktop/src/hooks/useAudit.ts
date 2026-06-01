import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AuditEntry } from "@aura-os/shared";

export function useAudit(projectId: string | null) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await invoke<AuditEntry[]>("list_audit_entries", {
        projectId,
        limit: 200,
      });
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { entries, loading, refresh };
}
