import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  ComputerUseBlocklistEntry,
  ComputerUseScreenshotRecord,
  ComputerUseStatus,
  DesktopWindow,
  ProjectComputerSettings,
  ScreenshotRetention,
} from "@aura-os/shared";

export function useComputerUse(projectId?: string | null) {
  const [status, setStatus] = useState<ComputerUseStatus | null>(null);
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [blocklist, setBlocklist] = useState<ComputerUseBlocklistEntry[]>([]);
  const [settings, setSettings] = useState<ProjectComputerSettings | null>(null);
  const [screenshots, setScreenshots] = useState<ComputerUseScreenshotRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await invoke<ComputerUseStatus>("get_computer_use_status");
      setStatus(s);
      const bl = await invoke<ComputerUseBlocklistEntry[]>("list_computer_use_blocklist");
      setBlocklist(bl);
      if (projectId) {
        const st = await invoke<ProjectComputerSettings>("get_project_computer_settings", {
          projectId,
        });
        setSettings(st);
        const shots = await invoke<ComputerUseScreenshotRecord[]>("list_computer_use_screenshots", {
          projectId,
        });
        setScreenshots(shots);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [projectId]);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<ComputerUseStatus>("start_computer_use");
      setStatus(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<ComputerUseStatus>("stop_computer_use");
      setStatus(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWindows = useCallback(async () => {
    setLoading(true);
    try {
      const list = await invoke<DesktopWindow[]>("list_desktop_windows");
      setWindows(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, []);

  const setRetention = useCallback(
    async (retention: ScreenshotRetention) => {
      if (!projectId) return;
      const st = await invoke<ProjectComputerSettings>("set_project_screenshot_retention", {
        projectId,
        retention,
      });
      setSettings(st);
      return st;
    },
    [projectId],
  );

  const saveBlocklist = useCallback(
    async (entries: { pattern: string; category: string }[]) => {
      const bl = await invoke<ComputerUseBlocklistEntry[]>("update_computer_use_blocklist", {
        input: { entries },
      });
      setBlocklist(bl);
      return bl;
    },
    [],
  );

  const deleteScreenshot = useCallback(
    async (id: string) => {
      await invoke("delete_computer_use_screenshot", { id });
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return {
    status,
    windows,
    blocklist,
    settings,
    screenshots,
    loading,
    error,
    refresh,
    start,
    stop,
    loadWindows,
    setRetention,
    saveBlocklist,
    deleteScreenshot,
  };
}
