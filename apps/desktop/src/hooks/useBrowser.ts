import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { BrowserStatus } from "@aura-os/shared";

export function useBrowser(projectId: string | null) {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeUrl, setActiveUrl] = useState("https://example.com");
  const [frameHtml, setFrameHtml] = useState<string | null>(null);

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

  const guiBrowse = useCallback(async (targetUrl: string) => {
    if (!targetUrl || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const html = await invoke<string>("gui_browse_url", { url: targetUrl, projectId });
      setFrameHtml(html);
      setActiveUrl(targetUrl);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const unsub = await listen<{ url: string }>("aura://browser-navigate", (event) => {
        const targetUrl = event.payload.url;
        if (targetUrl) {
          void guiBrowse(targetUrl);
        }
      });
      unlisten = unsub;
    };
    void setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [guiBrowse]);

  return {
    status,
    loading,
    error,
    refresh,
    start,
    stop,
    activeUrl,
    setActiveUrl,
    frameHtml,
    setFrameHtml,
    guiBrowse,
  };
}
