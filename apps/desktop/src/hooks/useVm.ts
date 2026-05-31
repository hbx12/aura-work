import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { VmStatus } from "@aura-os/shared";

export function useVm() {
  const [status, setStatus] = useState<VmStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await invoke<VmStatus>("get_vm_status");
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(String(e));
      setStatus(null);
    }
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<VmStatus>("start_vm");
      setStatus(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<VmStatus>("stop_vm");
      setStatus(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { status, loading, error, refresh, start, stop };
}
