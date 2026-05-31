import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { BrowserStatus } from "@aura-os/shared";

export function useBrowser() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await invoke<BrowserStatus>("get_browser_status");
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
      const s = await invoke<BrowserStatus>("start_browser");
      setStatus(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<BrowserStatus>("stop_browser");
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
