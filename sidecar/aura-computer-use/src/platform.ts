import { execFile } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";
import type {
  ActionResult,
  ComputerUseBackendId,
  DesktopWindow,
  ScreenshotResult,
} from "./types.js";
import { backendId } from "./backend.js";

const execFileAsync = promisify(execFile);

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { maxBuffer: 20 * 1024 * 1024, windowsHide: true },
  );
  return stdout.trim();
}

async function runShell(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { maxBuffer: 20 * 1024 * 1024 });
  return stdout.trim();
}

/** 1×1 PNG placeholder for simulated captures */
const SIMULATED_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function listWindows(): Promise<DesktopWindow[]> {
  const id = backendId();
  if (id === "windows-native") {
    const raw = await runPowerShell(`
      Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
      ForEach-Object {
        [PSCustomObject]@{
          id = ($_.Id.ToString())
          processName = $_.ProcessName
          title = $_.MainWindowTitle
        }
      } | ConvertTo-Json -Compress
    `);
    if (!raw) return [];
    const parsed = JSON.parse(raw.startsWith("[") ? raw : `[${raw}]`) as Array<{
      id: string;
      processName: string;
      title: string;
    }>;
    return parsed.map((w) => ({
      id: w.id,
      processName: w.processName,
      title: w.title,
    }));
  }

  if (id === "macos-native") {
    try {
      const raw = await runShell("osascript", [
        "-e",
        'tell application "System Events" to get {name, title of first window} of every process whose background only is false',
      ]);
      if (!raw) return [];
      return [
        {
          id: "frontmost",
          processName: raw.split(",")[0]?.trim() || "unknown",
          title: raw,
        },
      ];
    } catch {
      return simulatedWindows();
    }
  }

  if (id === "linux-native") {
    try {
      const raw = await runShell("bash", [
        "-lc",
        "wmctrl -l 2>/dev/null | awk '{$1=$1; print}' | head -n 40",
      ]);
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line, idx) => {
          const parts = line.split(/\s+/);
          const winId = parts[0] ?? `win-${idx}`;
          const title = parts.slice(3).join(" ") || line;
          return {
            id: winId,
            processName: title.split(" - ")[0] ?? "app",
            title,
          };
        });
    } catch {
      return simulatedWindows();
    }
  }

  return simulatedWindows();
}

function simulatedWindows(): DesktopWindow[] {
  return [
    { id: "sim-notepad", processName: "Notepad", title: "Simulated Notepad — Aura Computer Use" },
    { id: "sim-calc", processName: "Calculator", title: "Simulated Calculator" },
  ];
}

export async function captureScreenshot(windowId?: string): Promise<ScreenshotResult> {
  const backend = backendId();
  const capturedAt = new Date().toISOString();

  if (backend === "windows-native") {
    const base64 = await runPowerShell(`
      Add-Type -AssemblyName System.Windows.Forms,System.Drawing
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bmp)
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $ms = New-Object IO.MemoryStream
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      [Convert]::ToBase64String($ms.ToArray())
    `);
    return {
      width: 1920,
      height: 1080,
      mimeType: "image/png",
      base64,
      backend,
      capturedAt,
      windowId,
    };
  }

  if (backend === "macos-native") {
    const tmp = `/tmp/aura-screenshot-${Date.now()}.png`;
    await runShell("screencapture", ["-x", tmp]);
    const base64 = await runShell("bash", ["-lc", `base64 "${tmp}" && rm -f "${tmp}"`]);
    return {
      width: 1920,
      height: 1080,
      mimeType: "image/png",
      base64,
      backend,
      capturedAt,
      windowId,
    };
  }

  if (backend === "linux-native") {
    try {
      const tmp = `/tmp/aura-screenshot-${Date.now()}.png`;
      const base64 = await runShell("bash", [
        "-lc",
        `scrot "${tmp}" 2>/dev/null && base64 -w0 "${tmp}" && rm -f "${tmp}"`,
      ]);
      return {
        width: 1920,
        height: 1080,
        mimeType: "image/png",
        base64,
        backend,
        capturedAt,
        windowId,
      };
    } catch {
      return {
        width: 1,
        height: 1,
        mimeType: "image/png",
        base64: SIMULATED_PNG_BASE64,
        backend: "simulated",
        capturedAt,
        windowId,
      };
    }
  }

  return {
    width: 1,
    height: 1,
    mimeType: "image/png",
    base64: SIMULATED_PNG_BASE64,
    backend: "simulated",
    capturedAt,
    windowId,
  };
}

export async function focusWindow(windowId: string): Promise<ActionResult> {
  const backend = backendId();
  if (backend === "windows-native") {
    await runPowerShell(`
      $p = Get-Process -Id ${Number.parseInt(windowId, 10)} -ErrorAction Stop
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
"@
      [Win32]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
      [Win32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
    `);
    return { ok: true, backend, message: `Focused window ${windowId}` };
  }

  if (backend === "linux-native") {
    try {
      await runShell("wmctrl", ["-ia", windowId]);
    } catch {
      await runShell("wmctrl", ["-a", windowId]);
    }
    return { ok: true, backend, message: `Focused window ${windowId}` };
  }

  return { ok: true, backend, message: `Simulated focus on ${windowId}` };
}

export async function clickAt(x: number, y: number, button: "left" | "right" = "left"): Promise<ActionResult> {
  const backend = backendId();
  const xi = Math.round(x);
  const yi = Math.round(y);

  if (backend === "windows-native") {
    const flag = button === "right" ? "0x08,0x10" : "0x02,0x04";
    const [down, up] = flag.split(",");
    await runPowerShell(`
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Mouse {
          [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
          [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
        }
"@
      [Mouse]::SetCursorPos(${xi}, ${yi}) | Out-Null
      [Mouse]::mouse_event(${down}, 0, 0, 0, 0)
      [Mouse]::mouse_event(${up}, 0, 0, 0, 0)
    `);
    return { ok: true, backend, message: `Clicked at (${xi}, ${yi})` };
  }

  if (backend === "linux-native") {
    const btn = button === "right" ? "3" : "1";
    await runShell("xdotool", ["mousemove", String(xi), String(yi), "click", btn]);
    return { ok: true, backend, message: `Clicked at (${xi}, ${yi})` };
  }

  return { ok: true, backend, message: `Simulated ${button} click at (${xi}, ${yi})` };
}

export async function typeText(text: string): Promise<ActionResult> {
  const backend = backendId();
  const escaped = text.replace(/'/g, "''");

  if (backend === "windows-native") {
    await runPowerShell(`
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${escaped}')
    `);
    return { ok: true, backend, message: `Typed ${text.length} character(s)` };
  }

  if (backend === "linux-native") {
    await runShell("xdotool", ["type", "--delay", "12", "--", text]);
    return { ok: true, backend, message: `Typed ${text.length} character(s)` };
  }

  if (backend === "macos-native") {
    await runShell("osascript", ["-e", `tell application "System Events" to keystroke "${text.replace(/"/g, '\\"')}"`]);
    return { ok: true, backend, message: `Typed ${text.length} character(s)` };
  }

  return { ok: true, backend: "simulated" as ComputerUseBackendId, message: `Simulated typing ${text.length} chars` };
}

export function platformLabel(): string {
  return platform();
}
