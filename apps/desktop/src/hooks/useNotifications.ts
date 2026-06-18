import { useState, useEffect, useCallback } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

const NOTIFY_SETTINGS_KEY = "aura-notification-settings";

export interface NotificationSettings {
  taskComplete: boolean;
  taskError: boolean;
  permissionRequired: boolean;
  sidecarOffline: boolean;
  taskPaused: boolean;
}

const DEFAULTS: NotificationSettings = {
  taskComplete: true,
  taskError: true,
  permissionRequired: true,
  sidecarOffline: true,
  taskPaused: false,
};

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFY_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function persistSettings(s: NotificationSettings) {
  localStorage.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify(s));
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, setSettings, update };
}

let granted: boolean | null = null;

async function ensurePermission(): Promise<boolean> {
  if (granted === true) return true;
  if (granted === false) return false;
  try {
    let ok = await isPermissionGranted();
    if (!ok) {
      const perm = await requestPermission();
      ok = perm === "granted";
    }
    granted = ok;
    return ok;
  } catch {
    granted = false;
    return false;
  }
}

export async function sendDesktopNotification(title: string, body: string) {
  const ok = await ensurePermission();
  if (!ok) return;
  try {
    sendNotification({ title, body });
  } catch {
    /* fallback */
  }
}

export function shouldNotify(kind: keyof NotificationSettings): boolean {
  return loadSettings()[kind];
}
