const NOTIFY_SETTINGS_KEY = "aura-notification-settings";

interface NotificationSettings {
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

export function saveNotificationSettings(s: NotificationSettings) {
  localStorage.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify(s));
}

let permission: NotificationPermission | null = null;

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (permission === "granted") return true;
  if (permission === "denied") return false;
  const result = await Notification.requestPermission();
  permission = result;
  return result === "granted";
}

export async function sendDesktopNotification(title: string, body: string, onClick?: () => void) {
  const ok = await ensurePermission();
  if (!ok) return;
  try {
    const n = new Notification(title, { body, icon: "/aura-logo.png" });
    if (onClick) {
      n.onclick = () => { n.close(); onClick(); };
    }
    setTimeout(() => n.close(), 5000);
  } catch {
    /* fallback: notification API may not be available */
  }
}

export function getNotificationSettings(): NotificationSettings {
  return loadSettings();
}

export function shouldNotify(kind: keyof NotificationSettings): boolean {
  return loadSettings()[kind];
}
